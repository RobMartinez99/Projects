"""Unit tests for _dedup_calllist — the Alfred callList pre-dedup helper.

Tests cover:
- No duplicates: list returned unchanged
- Duplicate ghlOpportunityId: higher annotation score wins
- Duplicate ghlOpportunityId: tie broken by list order (first wins)
- Records with no ghlOpportunityId are never collapsed
- Collapse event shape: kept, dropped, ghlOpportunityId, timestamp, type
- deduped count reported in sync summary
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from server import _dedup_calllist, _annotation_score


# ── fixtures ──────────────────────────────────────────────────────────────────

def make_lead(name, opp_id="", **kwargs):
    base = {
        "name":             name,
        "ghlOpportunityId": opp_id,
        "ghlContactId":     "",
        "ghlStage":         "Inbound Lead",
        "ghlSyncStatus":    "manual",
        "value":            0,
        "nextAction":       "",
        "alfredNote":       "",
        "nextActionDate":   None,
        "lastContactDate":  None,
    }
    base.update(kwargs)
    return base


# ── _annotation_score ─────────────────────────────────────────────────────────

class TestAnnotationScore:
    def test_empty_lead_scores_zero(self):
        assert _annotation_score(make_lead("X")) == 0

    def test_each_field_worth_one_point(self):
        lead = make_lead("X", nextAction="Call", alfredNote="VIP",
                         nextActionDate="2026-07-01", value=500)
        assert _annotation_score(lead) == 4

    def test_value_zero_does_not_score(self):
        lead = make_lead("X", value=0, nextAction="Call")
        assert _annotation_score(lead) == 1

    def test_partial_annotations(self):
        lead = make_lead("X", alfredNote="note", nextActionDate="2026-07-01")
        assert _annotation_score(lead) == 2


# ── _dedup_calllist ───────────────────────────────────────────────────────────

class TestDedupCalllist:

    def test_no_duplicates_returns_unchanged(self):
        leads = [
            make_lead("Ana",     "opp-1"),
            make_lead("Cousin",  "opp-2"),
            make_lead("Daughters"),   # no opp_id — manual
        ]
        deduped, events = _dedup_calllist(leads)
        assert len(deduped) == 3
        assert len(events) == 0

    def test_duplicate_opp_id_higher_score_wins(self):
        shell = make_lead("Ana Martinez", "opp-1")                      # score 0
        annotated = make_lead("Ana", "opp-1", nextAction="Follow up",   # score 2
                              alfredNote="warm lead")
        deduped, events = _dedup_calllist([shell, annotated])

        assert len(deduped) == 1
        assert deduped[0]["name"] == "Ana"
        assert len(events) == 1

    def test_duplicate_opp_id_manual_beats_synced_on_score_tie(self):
        # synced shell arrives first in list (as happens after the first sync),
        # but manual record should win because Rob explicitly identified it.
        synced = make_lead("Ana Martinez", "opp-1", ghlSyncStatus="synced")
        manual = make_lead("Ana",          "opp-1", ghlSyncStatus="manual")
        deduped, events = _dedup_calllist([synced, manual])

        assert len(deduped) == 1
        assert deduped[0]["name"] == "Ana"        # manual wins despite coming second
        assert events[0]["kept"]    == "Ana"
        assert events[0]["dropped"] == "Ana Martinez"

    def test_duplicate_opp_id_tie_broken_by_list_order_when_both_manual(self):
        first  = make_lead("Ana",    "opp-1", ghlSyncStatus="manual")
        second = make_lead("Ana 2",  "opp-1", ghlSyncStatus="manual")
        deduped, events = _dedup_calllist([first, second])

        assert len(deduped) == 1
        assert deduped[0]["name"] == "Ana"    # first in list wins when both manual

    def test_no_opp_id_records_never_collapsed(self):
        a = make_lead("A")   # opp_id = ""
        b = make_lead("B")   # opp_id = ""
        deduped, events = _dedup_calllist([a, b])
        assert len(deduped) == 2
        assert len(events) == 0

    def test_collapse_event_shape(self):
        shell = make_lead("Shell", "opp-99")
        rich  = make_lead("Rich",  "opp-99", nextAction="Call")
        _, events = _dedup_calllist([shell, rich])

        assert len(events) == 1
        ev = events[0]
        assert ev["type"]             == "ghl_sync_dedup"
        assert ev["kept"]             == "Rich"
        assert ev["dropped"]          == "Shell"
        assert ev["ghlOpportunityId"] == "opp-99"
        assert "timestamp"            in ev

    def test_three_way_collision_keeps_highest_scorer(self):
        low    = make_lead("Low",    "opp-X")                           # score 0
        medium = make_lead("Medium", "opp-X", nextAction="Call")        # score 1
        high   = make_lead("High",   "opp-X", nextAction="Call",        # score 3
                           alfredNote="VIP", nextActionDate="2026-07-01")
        deduped, events = _dedup_calllist([low, medium, high])

        assert len(deduped) == 1
        assert deduped[0]["name"] == "High"
        assert len(events) == 2   # two collapses: low→medium winner, then medium→high winner

    def test_mixed_with_and_without_opp_ids(self):
        synced  = make_lead("Synced",   "opp-A")
        shell   = make_lead("Shell",    "opp-A")   # duplicate — gets dropped
        manual1 = make_lead("Manual 1")            # no opp_id — kept
        manual2 = make_lead("Manual 2")            # no opp_id — kept
        deduped, events = _dedup_calllist([synced, shell, manual1, manual2])

        assert len(deduped) == 3
        names = [l["name"] for l in deduped]
        assert "Synced" in names
        assert "Manual 1" in names
        assert "Manual 2" in names
        assert "Shell" not in names
        assert len(events) == 1

    def test_original_list_not_mutated(self):
        leads = [make_lead("A", "opp-1"), make_lead("B", "opp-1")]
        original_len = len(leads)
        _dedup_calllist(leads)
        assert len(leads) == original_len   # input list unchanged


# ── regression: tie-break survivorship rules ─────────────────────────────────

class TestTieBreakSurvivorship:

    def test_manual_with_patched_id_survives_over_synced_shell_score_tie(self):
        """
        Regression for the original Ana/Ana Martinez bug.
        GHL-synced shell arrives first in the list (as it does after the first sync
        places synced records before unclaimed manual records). Manual record with
        the patched opp ID arrives second. Manual must win on score tie.
        """
        synced_shell = make_lead("Ana Martinez", "opp-1", ghlSyncStatus="synced")
        manual_named = make_lead("Ana",          "opp-1", ghlSyncStatus="manual")
        deduped, events = _dedup_calllist([synced_shell, manual_named])

        assert deduped[0]["name"]          == "Ana"
        assert deduped[0]["ghlSyncStatus"] == "manual"   # dedup winner; sync will flip it to synced
        assert events[0]["kept"]           == "Ana"
        assert events[0]["dropped"]        == "Ana Martinez"

    def test_list_order_only_breaks_ties_between_same_status(self):
        """
        List order is the final tie-breaker only when both records share the same
        ghlSyncStatus. A synced record that comes first must NOT beat a manual
        record that comes second.
        """
        # Both synced — list order decides
        s1 = make_lead("S1", "opp-A", ghlSyncStatus="synced")
        s2 = make_lead("S2", "opp-A", ghlSyncStatus="synced")
        deduped_ss, _ = _dedup_calllist([s1, s2])
        assert deduped_ss[0]["name"] == "S1"   # first wins

        # Both manual — list order decides
        m1 = make_lead("M1", "opp-B", ghlSyncStatus="manual")
        m2 = make_lead("M2", "opp-B", ghlSyncStatus="manual")
        deduped_mm, _ = _dedup_calllist([m1, m2])
        assert deduped_mm[0]["name"] == "M1"   # first wins

        # Synced first, manual second — manual wins (overrides list order)
        sx = make_lead("Synced", "opp-C", ghlSyncStatus="synced")
        mx = make_lead("Manual", "opp-C", ghlSyncStatus="manual")
        deduped_sm, _ = _dedup_calllist([sx, mx])
        assert deduped_sm[0]["name"] == "Manual"   # manual overrides list order

        # Manual first, synced second — manual wins (already first, no contest)
        ma = make_lead("Manual", "opp-D", ghlSyncStatus="manual")
        sa = make_lead("Synced", "opp-D", ghlSyncStatus="synced")
        deduped_ms, _ = _dedup_calllist([ma, sa])
        assert deduped_ms[0]["name"] == "Manual"
