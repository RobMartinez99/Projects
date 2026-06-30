"""Tests for GET /api/mc/sync_health and the dedup_trend field on sync responses.

Covers:
- Health payload shape: all required keys present and correctly typed
- Counts: total/synced/manual partition correctly
- collapse_events_24h: includes events from the last 24h, excludes older ones
- conflict_count: pulled from last ghl_sync audit entry
- last_sync_deduped: reflects the dedup count from the most recent sync
- dedup_trend: sync response reports increase / decrease / no change
"""

import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from unittest.mock import patch, MagicMock


# ── shared fixtures / helpers (mirrors test_sync_integration.py) ──────────────

def make_lead(name, opp_id="", cid="", stage="Inbound Lead", sync_status="manual", **kw):
    base = {
        "name":             name,
        "ghlOpportunityId": opp_id,
        "ghlContactId":     cid,
        "ghlStage":         stage,
        "ghlSyncStatus":    sync_status,
        "value":            0,
        "nextAction":       "",
        "alfredNote":       "",
        "nextActionDate":   None,
        "lastContactDate":  None,
    }
    base.update(kw)
    return base


def make_ghl_opportunity(name, opp_id, cid, stage="Inbound Lead"):
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


def fake_ghl_sync(opportunities):
    mock = MagicMock()
    mock.sync.return_value = {
        "opportunities": opportunities,
        "stage_map":     {},
        "raw_count":     len(opportunities),
        "synced_at":     "2026-06-28T00:00:00Z",
    }
    return mock


@pytest.fixture
def app_with_state(tmp_path):
    import server as srv
    orig = srv.DATA_DIR
    srv.DATA_DIR = tmp_path

    state = {"mc": {"callList": [], "lastGHLSync": None, "lastSyncDeduped": 0}}
    (tmp_path / "state.json").write_text(json.dumps(state))
    (tmp_path / "audit.json").write_text(json.dumps({"log": []}))
    (tmp_path / "memory.json").write_text(json.dumps({"facts": []}))
    (tmp_path / "ghl_stage_map.json").write_text(json.dumps({}))

    srv.app.config["TESTING"] = True
    client = srv.app.test_client()
    yield client, tmp_path
    srv.DATA_DIR = orig


def set_call_list(tmp_path, leads):
    state = json.loads((tmp_path / "state.json").read_text())
    state["mc"]["callList"] = leads
    (tmp_path / "state.json").write_text(json.dumps(state))


def inject_audit_entry(tmp_path, entry):
    """Insert a raw audit entry (bypassing log_audit so we control the 'at' timestamp)."""
    audit = json.loads((tmp_path / "audit.json").read_text())
    audit.setdefault("log", []).insert(0, entry)
    (tmp_path / "audit.json").write_text(json.dumps(audit))


# ── health payload shape ──────────────────────────────────────────────────────

HEALTH_KEYS = {
    "total_leads",
    "synced_count",
    "manual_count",
    "last_sync_deduped",
    "dedup_trend",
    "collapse_events_24h",
    "collapse_count_24h",
    "conflict_count",
    "last_sync_at",
}


class TestSyncHealthShape:

    def test_all_required_keys_present(self, app_with_state):
        client, _ = app_with_state
        resp = client.get("/api/mc/sync_health")
        assert resp.status_code == 200
        body = resp.get_json()
        for key in HEALTH_KEYS:
            assert key in body, f"missing key: {key}"

    def test_empty_state_returns_zero_counts(self, app_with_state):
        client, _ = app_with_state
        body = client.get("/api/mc/sync_health").get_json()
        assert body["total_leads"]         == 0
        assert body["synced_count"]        == 0
        assert body["manual_count"]        == 0
        assert body["last_sync_deduped"]   == 0
        assert body["collapse_count_24h"]  == 0
        assert body["conflict_count"]      == 0
        assert body["last_sync_at"]        is None
        assert body["collapse_events_24h"] == []

    def test_collapse_events_24h_is_list(self, app_with_state):
        client, _ = app_with_state
        body = client.get("/api/mc/sync_health").get_json()
        assert isinstance(body["collapse_events_24h"], list)

    def test_collapse_event_items_have_required_fields(self, app_with_state):
        client, tmp_path = app_with_state
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        inject_audit_entry(tmp_path, {
            "type":             "ghl_sync_dedup",
            "kept":             "Ana",
            "dropped":          "Ana Martinez",
            "ghlOpportunityId": "opp-1",
            "timestamp":        now_iso,
            "at":               now_iso,
        })
        body = client.get("/api/mc/sync_health").get_json()
        assert len(body["collapse_events_24h"]) == 1
        ev = body["collapse_events_24h"][0]
        for field in ("kept", "dropped", "ghlOpportunityId", "at"):
            assert field in ev, f"missing field: {field}"


# ── lead count partitioning ───────────────────────────────────────────────────

class TestHealthLeadCounts:

    def test_synced_and_manual_counts_are_correct(self, app_with_state):
        client, tmp_path = app_with_state
        set_call_list(tmp_path, [
            make_lead("A", "opp-1", sync_status="synced"),
            make_lead("B", "opp-2", sync_status="synced"),
            make_lead("C", sync_status="manual"),
        ])
        body = client.get("/api/mc/sync_health").get_json()
        assert body["total_leads"]  == 3
        assert body["synced_count"] == 2
        assert body["manual_count"] == 1

    def test_total_equals_synced_plus_manual(self, app_with_state):
        client, tmp_path = app_with_state
        set_call_list(tmp_path, [
            make_lead("A", sync_status="synced"),
            make_lead("B", sync_status="manual"),
            make_lead("C", sync_status="manual"),
        ])
        body = client.get("/api/mc/sync_health").get_json()
        assert body["total_leads"] == body["synced_count"] + body["manual_count"]


# ── 24-hour collapse window ───────────────────────────────────────────────────

class TestCollapseEvents24h:

    def test_recent_collapse_appears_in_24h_window(self, app_with_state):
        client, tmp_path = app_with_state
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        inject_audit_entry(tmp_path, {
            "type":             "ghl_sync_dedup",
            "kept":             "Ana",
            "dropped":          "Ana Martinez",
            "ghlOpportunityId": "opp-1",
            "timestamp":        now_iso,
            "at":               now_iso,
        })
        body = client.get("/api/mc/sync_health").get_json()
        assert body["collapse_count_24h"] == 1
        assert body["collapse_events_24h"][0]["kept"] == "Ana"

    def test_old_collapse_excluded_from_24h_window(self, app_with_state):
        client, tmp_path = app_with_state
        # 25 hours ago
        old_ts = time.strftime(
            "%Y-%m-%dT%H:%M:%SZ",
            time.gmtime(time.time() - 90000)
        )
        inject_audit_entry(tmp_path, {
            "type":             "ghl_sync_dedup",
            "kept":             "Old",
            "dropped":          "Old Shell",
            "ghlOpportunityId": "opp-old",
            "timestamp":        old_ts,
            "at":               old_ts,
        })
        body = client.get("/api/mc/sync_health").get_json()
        assert body["collapse_count_24h"] == 0
        assert body["collapse_events_24h"] == []

    def test_mixed_recent_and_old_collapses(self, app_with_state):
        client, tmp_path = app_with_state
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        old_ts  = time.strftime("%Y-%m-%dT%H:%M:%SZ",
                                time.gmtime(time.time() - 90000))
        inject_audit_entry(tmp_path, {
            "type": "ghl_sync_dedup", "kept": "Recent", "dropped": "Shell",
            "ghlOpportunityId": "opp-r", "timestamp": now_iso, "at": now_iso,
        })
        inject_audit_entry(tmp_path, {
            "type": "ghl_sync_dedup", "kept": "Old", "dropped": "Old Shell",
            "ghlOpportunityId": "opp-o", "timestamp": old_ts, "at": old_ts,
        })
        body = client.get("/api/mc/sync_health").get_json()
        assert body["collapse_count_24h"] == 1
        assert body["collapse_events_24h"][0]["kept"] == "Recent"


# ── integration: dedup collapse appears in health after sync ─────────────────

class TestHealthAfterSync:

    def test_collapse_from_sync_appears_in_health_24h(self, app_with_state):
        """
        Full integration: run a sync that produces a dedup collapse, then verify
        the health endpoint reflects it in collapse_events_24h.
        """
        client, tmp_path = app_with_state
        set_call_list(tmp_path, [
            make_lead("Ana Martinez", "opp-1", cid="cid-1", sync_status="synced"),
            make_lead("Ana",          "opp-1", sync_status="manual"),
        ])

        ghl_opp = make_ghl_opportunity("Ana Martinez", "opp-1", "cid-1")
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            client.post("/api/ghl/sync", content_type="application/json", data="{}")

        body = client.get("/api/mc/sync_health").get_json()

        assert body["collapse_count_24h"]  == 1
        assert body["last_sync_deduped"]   == 1
        ev = body["collapse_events_24h"][0]
        assert ev["kept"]             == "Ana"
        assert ev["dropped"]          == "Ana Martinez"
        assert ev["ghlOpportunityId"] == "opp-1"

    def test_health_last_sync_at_matches_sync_response(self, app_with_state):
        client, tmp_path = app_with_state
        set_call_list(tmp_path, [make_lead("Cousin", "opp-2", sync_status="synced")])
        ghl_opp = make_ghl_opportunity("Cousin", "opp-2", "cid-2")
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            sync_resp = client.post("/api/ghl/sync",
                                    content_type="application/json", data="{}")
        synced_at = sync_resp.get_json()["synced_at"]

        health = client.get("/api/mc/sync_health").get_json()
        assert health["last_sync_at"] == synced_at

    def test_no_collapse_means_empty_24h_window(self, app_with_state):
        client, tmp_path = app_with_state
        set_call_list(tmp_path, [make_lead("Cousin", "opp-2", sync_status="manual")])
        ghl_opp = make_ghl_opportunity("Cousin", "opp-2", "cid-2")
        with patch("server.GHLClient", return_value=fake_ghl_sync([ghl_opp])):
            client.post("/api/ghl/sync", content_type="application/json", data="{}")

        body = client.get("/api/mc/sync_health").get_json()
        assert body["collapse_count_24h"]  == 0
        assert body["collapse_events_24h"] == []


# ── dedup_trend in sync response ─────────────────────────────────────────────

class TestDedupTrend:

    def _run_sync(self, client, tmp_path, leads, ghl_opps):
        set_call_list(tmp_path, leads)
        with patch("server.GHLClient", return_value=fake_ghl_sync(ghl_opps)):
            return client.post("/api/ghl/sync",
                               content_type="application/json", data="{}").get_json()

    def test_trend_no_change_when_zero_collapses(self, app_with_state):
        client, tmp_path = app_with_state
        body = self._run_sync(client, tmp_path,
                              [make_lead("A", "opp-1")],
                              [make_ghl_opportunity("A", "opp-1", "cid-1")])
        assert "no change" in body["dedup_trend"]

    def test_trend_increased_when_new_collapses(self, app_with_state):
        client, tmp_path = app_with_state
        # First sync: 0 collapses (stored as baseline)
        self._run_sync(client, tmp_path,
                       [make_lead("A", "opp-1")],
                       [make_ghl_opportunity("A", "opp-1", "cid-1")])
        # Second sync: 1 collapse (prev was 0)
        body = self._run_sync(client, tmp_path,
                              [make_lead("Ana Martinez", "opp-1", cid="cid-1",
                                         sync_status="synced"),
                               make_lead("Ana", "opp-1", sync_status="manual")],
                              [make_ghl_opportunity("Ana Martinez", "opp-1", "cid-1")])
        assert "increased" in body["dedup_trend"]

    def test_trend_decreased_when_fewer_collapses(self, app_with_state):
        client, tmp_path = app_with_state
        # First sync: 1 collapse — seed lastSyncDeduped = 1 directly in state
        state = json.loads((tmp_path / "state.json").read_text())
        state["mc"]["lastSyncDeduped"] = 1
        (tmp_path / "state.json").write_text(json.dumps(state))
        # Next sync: 0 collapses
        body = self._run_sync(client, tmp_path,
                              [make_lead("A", "opp-1")],
                              [make_ghl_opportunity("A", "opp-1", "cid-1")])
        assert "decreased" in body["dedup_trend"]
