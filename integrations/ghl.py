"""GHL (GoHighLevel) read-only client for Alfred.

Phase 2-D scope:
- Read opportunities from Martinez Capital Pipeline only
- No writes to GHL in this phase
- Sync is Rob-triggered only — no auto-sync, no webhooks

Required env vars (set in .env):
    GHL_API_KEY        — GHL private integration API key (v2 token)
    GHL_LOCATION_ID    — Sub-account / location ID for Martinez Capital
    GHL_PIPELINE_ID    — Pipeline ID for "Martinez Capital Pipeline"

Optional:
    GHL_API_BASE       — Override API base URL (default: https://services.leadconnectorhq.com)
"""

import os
import json
import requests
from datetime import datetime, timezone


class GHLSyncError(Exception):
    """Raised when GHL API returns an error or config is missing."""
    pass


# Field map: GHL opportunity field → Alfred lead field
# Only fields Alfred actually uses are mapped. Everything else is discarded.
GHL_FIELD_MAP = {
    # GHL key           Alfred key            transform
    "name":             "name",               # string — contact/opportunity name
    "pipelineStageId":  "_ghlStageId",        # resolved to stage name via stage list
    "status":           "_ghlStatus",         # "open"|"won"|"lost"|"abandoned"
    "monetaryValue":    "value",              # float → int (annual premium estimate)
    "id":               "ghlOpportunityId",   # GHL internal ID — stored for future write-back
    "contactId":        "ghlContactId",       # GHL contact ID
    "lastActivityAt":   "lastContactDate",    # ISO → YYYY-MM-DD
    "updatedAt":        "_ghlUpdatedAt",      # raw ISO, used for sync metadata
}

# GHL "status" → overrides ghlStage when terminal
STATUS_OVERRIDE = {
    "won":       "Issued / Funded",
    "lost":      "Not Interested",
    "abandoned":  "Not Interested",
}


class GHLClient:
    """Read-only GHL API client. All methods are GET only."""

    BASE_URL = "https://services.leadconnectorhq.com"

    def __init__(self, api_key: str, location_id: str, pipeline_id: str):
        if not api_key:
            raise GHLSyncError("GHL_API_KEY is not set. Add it to your .env file.")
        if not location_id:
            raise GHLSyncError("GHL_LOCATION_ID is not set. Add it to your .env file.")
        if not pipeline_id:
            raise GHLSyncError("GHL_PIPELINE_ID is not set. Add it to your .env file.")
        self._api_key    = api_key
        self._location   = location_id
        self._pipeline   = pipeline_id
        self._base       = os.environ.get("GHL_API_BASE", self.BASE_URL).rstrip("/")

    def _get(self, path: str, params: dict = None) -> dict:
        """Make a single authenticated GET request. No side effects."""
        url = f"{self._base}{path}"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Version":       "2021-07-28",
            "Content-Type":  "application/json",
            "Accept":        "application/json",
        }
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=10)
            resp.raise_for_status()
            return resp.json()
        except requests.HTTPError as e:
            body = (e.response.text or "")[:300]
            raise GHLSyncError(f"GHL API {e.response.status_code}: {body}")
        except requests.ConnectionError as e:
            raise GHLSyncError(f"GHL connection error: {e}")

    def get_pipeline_stages(self) -> dict:
        """Return {stageId: stageName} for the configured pipeline.

        GHL pipelines list endpoint uses locationId (camelCase), unlike search.
        """
        data = self._get("/opportunities/pipelines", {"locationId": self._location})
        pipelines = data.get("pipelines", [])
        for p in pipelines:
            if p.get("id") == self._pipeline:
                return {s["id"]: s["name"] for s in p.get("stages", [])}
        raise GHLSyncError(
            f"Pipeline '{self._pipeline}' not found in GHL response. "
            f"Verify GHL_PIPELINE_ID in .env."
        )

    def get_opportunities(self, limit: int = 100) -> list:
        """Return raw GHL opportunity objects for the configured pipeline."""
        params = {
            "pipeline_id":  self._pipeline,
            "location_id":  self._location,
            "limit":        min(limit, 100),
            "status":       "all",
        }
        data = self._get("/opportunities/search", params)
        return data.get("opportunities", [])

    def map_to_alfred(self, opp: dict, stage_map: dict) -> dict:
        """Convert one GHL opportunity dict to Alfred mc.callList lead shape.

        stage_map: {ghlStageId: ghlStageName} from get_pipeline_stages()
        """
        # Resolve stage name from stageId
        stage_id   = opp.get("pipelineStageId", "")
        stage_name = stage_map.get(stage_id, "")

        # Terminal status overrides stage name
        ghl_status = opp.get("status", "open")
        if ghl_status in STATUS_OVERRIDE:
            stage_name = STATUS_OVERRIDE[ghl_status]

        # Contact name: prefer opportunity name, fall back to contact.name
        contact = opp.get("contact", {}) or {}
        name = (
            opp.get("name") or
            f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip() or
            "Unknown"
        )

        # Last activity date → YYYY-MM-DD
        last_activity = opp.get("lastActivityAt") or opp.get("updatedAt")
        last_contact_date = None
        if last_activity:
            try:
                dt = datetime.fromisoformat(last_activity.replace("Z", "+00:00"))
                last_contact_date = dt.date().isoformat()
            except (ValueError, AttributeError):
                pass

        # Monetary value → int premium estimate
        raw_value = opp.get("monetaryValue") or 0
        try:
            value = int(float(raw_value))
        except (TypeError, ValueError):
            value = 0

        return {
            "name":               name,
            "ghlStage":           stage_name,
            "ghlSyncStatus":      "synced",
            "ghlOpportunityId":   opp.get("id", ""),
            "ghlContactId":       opp.get("contactId", ""),
            "value":              value,
            "lastContactDate":    last_contact_date,
            # Alfred annotation fields — not overwritten if already set manually
            # (merge logic in sync route handles this)
            "nextActionDate":     None,
            "nextAction":         "",
            "alfredNote":         "",
        }

    def sync(self) -> dict:
        """Full read-only sync. Returns structured result for the server route.

        Returns:
            {
                "opportunities": [alfred_lead_shape, ...],
                "stage_map":     {id: name},
                "raw_count":     int,
                "synced_at":     ISO string,
            }
        """
        stage_map = self.get_pipeline_stages()
        raw_opps  = self.get_opportunities()
        mapped    = [self.map_to_alfred(o, stage_map) for o in raw_opps]
        return {
            "opportunities": mapped,
            "stage_map":     stage_map,
            "raw_count":     len(raw_opps),
            "synced_at":     datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
