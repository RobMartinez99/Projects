"""Integration tests for POST /api/ghl/sync and POST /api/mc/dedup.

Tests cover:
1. Manual ghlOpportunityId patch → duplicate collapsed on next sync
2. deduped counter in sync summary matches actual collapse count
3. audit.json receives ghl_sync_dedup entry with correct shape
4. Sync summary contains all expected keys: added, updated, manual_kept, deduped, conflicts, total

These tests patch GHL API calls so no network requests are made.
Alfred state is isolated per test using a temp directory.
"""

import sys, os, json, time, tempfile, shutil
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from unittest.mock import patch, MagicMock


# ── helpers ───────────────────────────────────────────────────────────────────

def make_lead(name, opp_id="", cid="", stage="Inbound Lead", **kwargs):
    base = {
        "name":             name,
        "ghlOpportunityId": opp_id,
        "ghlContactId":     cid,
        "ghlStage":         stage,
        "ghlSyncStatus":    "manual",
        "value":            0,
        "nextAction":       "",
        "alfredNote":       "",
        "nextActionDate":   None,
        "lastContactDate":  None,
    }
    base.update(kwargs)
    return base


def make_ghl_opportunity(name, opp_id, cid, stage="Inbound Lead"):
    """Minimal Alfred-shaped lead as returned by GHLClient.sync()."""
    return {
        "name":             name,
        "ghlOpportunityId": opp_id,
        "ghlContactId":     cid,
        "ghlStage":         stage,
        "ghlSyncStatus":    "synced",
        "value":            0,
        "lastContactDate":  None,
        "nextActionDate":   None,
        "nextAction":       "",
        "alfredNote":       "",
    }


@pytest.fixture
def app_with_state(tmp_path):
    """
    Stand up a Flask test client with isolated data/ and audit.json.
    Patches DATA_DIR in server so all reads/writes go to tmp_path.
    """
    import server as srv

    orig_data_dir = srv.DATA_DIR
    srv.DATA_DIR = tmp_path

    # Minimal state.json
    state = {"mc": {"callList": [], "lastGHLSync": None}}
    (tmp_path / "state.json").write_text(json.dumps(state))
    (tmp_path / "audit.json").write_text(json.dumps({"log": []}))
    (tmp_path / "memory.json").write_text(json.dumps({"facts": []}))
    (tmp_path / "ghl_stage_map.json").write_text(json.dumps({}))

    srv.app.config["TESTING"] = True
    client = srv.app.test_client()

    yield client, tmp_path

    srv.DATA_DIR = orig_data_dir


def set_call_list(tmp_path, leads):
    state = json.loads((tmp_path / "state.json").read_text())
    state["mc"]["callList"] = leads
    (tmp_path / "state.json").write_text(json.dumps(state))


def get_call_list(tmp_path):
    state = json.loads((tmp_path / "state.json").read_text())
    return state["mc"]["callList"]


def get_audit_log(tmp_path):
    return json.loads((tmp_path / "audit.json").read_text()).get("log", [])


def fake_ghl_sync(opportunities):
    """Return a mock GHLClient whose sync() returns the given opportunities."""
    mock = MagicMock()
    mock.sync.return_value = {
        "opportunities": opportunities,
        "stage_map":     {},
        "raw_count":     len(opportunities),
        "synced_at":     "2026-06-28T00:00:00Z",
    }
    return mock


# ── tests ─────────────────────────────────────────────────────────────────────

class TestSyncSummaryKeys:
    def test_sync_response_has_all_summary_keys(self, app_with_state):
        client, tmp_path = app_with_state

        ghl_opp = make_ghl_opportunity("Ana Martinez", "opp-1", "cid-1")
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            resp = client.post("/api/ghl/sync",
                               content_type="application/json", data="{}")

        assert resp.status_code == 200
        body = resp.get_json()
        for key in ("ok", "added", "updated", "manual_kept", "deduped", "conflicts", "total", "synced_at"):
            assert key in body, f"missing key: {key}"


class TestDedupedCounterInSync:
    def test_no_duplicates_deduped_is_zero(self, app_with_state):
        client, tmp_path = app_with_state
        set_call_list(tmp_path, [make_lead("Cousin", "opp-2")])

        ghl_opp = make_ghl_opportunity("Cousin", "opp-2", "cid-2")
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            resp = client.post("/api/ghl/sync",
                               content_type="application/json", data="{}")

        assert resp.get_json()["deduped"] == 0

    def test_one_duplicate_deduped_is_one(self, app_with_state):
        client, tmp_path = app_with_state
        # Two Alfred records share the same opp ID (the scenario we fixed)
        set_call_list(tmp_path, [
            make_lead("Ana",          "opp-1"),   # manually patched
            make_lead("Ana Martinez", "opp-1"),   # auto-synced shell
        ])

        ghl_opp = make_ghl_opportunity("Ana Martinez", "opp-1", "cid-1")
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            resp = client.post("/api/ghl/sync",
                               content_type="application/json", data="{}")

        body = resp.get_json()
        assert body["deduped"] == 1
        assert body["total"]   == 1   # only one record in final list


class TestManualPatchThenSync:
    def test_manual_opp_id_patch_collapses_on_next_sync(self, app_with_state):
        """
        Sequence that triggered the original bug:
        1. Alfred has manual lead 'Ana' (no IDs).
        2. Sync runs — GHL adds 'Ana Martinez' (opp-1) as new.
        3. Rob patches 'Ana' with ghlOpportunityId = opp-1.
        4. Next sync: only one record remains, named 'Ana', status synced.
        """
        client, tmp_path = app_with_state

        # Step 1 — manual lead, no IDs
        set_call_list(tmp_path, [make_lead("Ana")])

        # Step 2 — first sync adds Ana Martinez as net new
        ghl_opp = make_ghl_opportunity("Ana Martinez", "opp-1", "cid-1")
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            client.post("/api/ghl/sync", content_type="application/json", data="{}")

        leads_after_first_sync = get_call_list(tmp_path)
        assert len(leads_after_first_sync) == 2   # Ana (manual) + Ana Martinez (synced)

        # Step 3 — Rob patches Ana with the GHL opp ID
        resp = client.patch(
            "/api/mc/lead",
            json={"name": "Ana", "ghlOpportunityId": "opp-1"},
        )
        assert resp.get_json()["ok"] is True

        # Step 4 — second sync: dedup collapses, one record remains
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            sync_resp = client.post("/api/ghl/sync",
                                    content_type="application/json", data="{}")

        body = sync_resp.get_json()
        final_leads = get_call_list(tmp_path)

        assert body["deduped"] == 1
        assert len(final_leads) == 1
        assert final_leads[0]["name"]          == "Ana"
        assert final_leads[0]["ghlSyncStatus"] == "synced"
        assert final_leads[0]["ghlOpportunityId"] == "opp-1"
        assert final_leads[0]["ghlContactId"]     == "cid-1"

    def test_merged_record_preserves_alfred_annotations(self, app_with_state):
        """After dedup+sync, nextAction and alfredNote from the winning lead survive."""
        client, tmp_path = app_with_state

        set_call_list(tmp_path, [
            make_lead("Ana", "opp-1", nextAction="Call Tuesday", alfredNote="Warm"),
            make_lead("Ana Martinez", "opp-1"),
        ])

        ghl_opp = make_ghl_opportunity("Ana Martinez", "opp-1", "cid-1")
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            client.post("/api/ghl/sync", content_type="application/json", data="{}")

        leads = get_call_list(tmp_path)
        assert len(leads) == 1
        assert leads[0]["nextAction"] == "Call Tuesday"
        assert leads[0]["alfredNote"] == "Warm"

    def test_ghl_stage_wins_after_dedup(self, app_with_state):
        """GHL is source of truth for stage even when the manual record had a different stage."""
        client, tmp_path = app_with_state

        set_call_list(tmp_path, [
            make_lead("Ana", "opp-1", stage="Consent Verified"),   # manual stage
            make_lead("Ana Martinez", "opp-1", stage="Inbound Lead"),
        ])

        ghl_opp = make_ghl_opportunity("Ana Martinez", "opp-1", "cid-1",
                                       stage="Needs Analysis")
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            client.post("/api/ghl/sync", content_type="application/json", data="{}")

        leads = get_call_list(tmp_path)
        assert leads[0]["ghlStage"] == "Needs Analysis"


class TestDroppedDuplicateNotReintroduced:

    def test_dropped_shell_never_reappears_after_subsequent_syncs(self, app_with_state):
        """
        Regression: once the synced shell ('Ana Martinez') is collapsed and dropped,
        repeated syncs against the same GHL opportunity must never reintroduce it.
        The surviving record ('Ana') must remain the only entry on every subsequent sync.
        """
        client, tmp_path = app_with_state

        # Start with both Alfred records sharing the opp ID
        set_call_list(tmp_path, [
            make_lead("Ana Martinez", "opp-1", cid="cid-1", ghlSyncStatus="synced"),
            make_lead("Ana",          "opp-1", ghlSyncStatus="manual"),
        ])

        ghl_opp = make_ghl_opportunity("Ana Martinez", "opp-1", "cid-1")

        # First sync — collapses to one record
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            r1 = client.post("/api/ghl/sync", content_type="application/json", data="{}")
        assert r1.get_json()["deduped"] == 1
        assert len(get_call_list(tmp_path)) == 1

        # Second sync — no new duplicates, count stays at 1
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            r2 = client.post("/api/ghl/sync", content_type="application/json", data="{}")
        body2 = r2.get_json()
        leads2 = get_call_list(tmp_path)

        assert body2["deduped"] == 0           # nothing to collapse
        assert len(leads2) == 1                # still exactly one record
        assert leads2[0]["name"] == "Ana"      # correct survivor
        assert leads2[0]["ghlSyncStatus"] == "synced"

        # Third sync — same result
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            r3 = client.post("/api/ghl/sync", content_type="application/json", data="{}")
        assert r3.get_json()["deduped"] == 0
        assert len(get_call_list(tmp_path)) == 1


class TestAuditOnDedup:
    def test_audit_entry_written_on_collapse(self, app_with_state):
        client, tmp_path = app_with_state

        set_call_list(tmp_path, [
            make_lead("Ana",          "opp-1"),
            make_lead("Ana Martinez", "opp-1"),
        ])

        ghl_opp = make_ghl_opportunity("Ana Martinez", "opp-1", "cid-1")
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            client.post("/api/ghl/sync", content_type="application/json", data="{}")

        log = get_audit_log(tmp_path)
        dedup_entries = [e for e in log if e.get("type") == "ghl_sync_dedup"]

        assert len(dedup_entries) == 1
        ev = dedup_entries[0]
        assert ev["kept"]             == "Ana"
        assert ev["dropped"]          == "Ana Martinez"
        assert ev["ghlOpportunityId"] == "opp-1"
        assert "timestamp"            in ev
        assert "at"                   in ev   # added by log_audit wrapper

    def test_no_audit_entry_when_no_duplicates(self, app_with_state):
        client, tmp_path = app_with_state

        set_call_list(tmp_path, [make_lead("Cousin", "opp-2")])
        ghl_opp = make_ghl_opportunity("Cousin", "opp-2", "cid-2")
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            client.post("/api/ghl/sync", content_type="application/json", data="{}")

        log = get_audit_log(tmp_path)
        dedup_entries = [e for e in log if e.get("type") == "ghl_sync_dedup"]
        assert len(dedup_entries) == 0

    def test_standalone_dedup_endpoint_writes_audit(self, app_with_state):
        client, tmp_path = app_with_state

        set_call_list(tmp_path, [
            make_lead("A", "opp-X"),
            make_lead("B", "opp-X"),
        ])

        resp = client.post("/api/mc/dedup", content_type="application/json", data="{}")
        body = resp.get_json()

        assert body["ok"]        is True
        assert body["collapsed"] == 1

        log = get_audit_log(tmp_path)
        dedup_entries  = [e for e in log if e.get("type") == "ghl_sync_dedup"]
        summary_entries = [e for e in log if e.get("type") == "mc_dedup_run"]
        assert len(dedup_entries)   == 1
        assert len(summary_entries) == 1
        assert summary_entries[0]["collapsed"] == 1
