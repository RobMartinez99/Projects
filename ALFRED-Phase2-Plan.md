# Alfred — Phase 2 Plan
**Sequencing locked:** June 27, 2026

---

## Sequence

| Order | Workstream | Gate |
|---|---|---|
| P2-B | Sub-Agent I/O Contracts | Agents defined before MC workflow depends on them |
| P2-C | MC Workflow Execution | Requires Maya + Atlas contracts to be live |
| P2-D | GHL Integration (read-only) | Requires MC lead stage model from P2-C |
| P2-E | Approvals Queue Refinement | More valuable once agents generate real actions |
| P2-A | Routing Intelligence | Last — workspace depth must exist before routing adds value |

---

## P2-B — Sub-Agent I/O Contracts

### Design Principles

- Every agent returns a structured response object — never raw text
- No agent writes to state or sends anything without going through the approval queue
- Atlas never writes anything — advisory only
- Maya and Brooks write drafts only — Rob approves before any output leaves Alfred
- Agents read from `appState` fields passed in by the orchestrator — they never hit the filesystem directly
- Every invocation is logged to `data/audit.json`

---

### Maya — COO

**Role:** Outreach, post-close sequences, referral asks, client-facing communication drafts.

**Invoked by:** Alfred orchestrator when a close is logged, a follow-up is due, or Rob requests a draft.

**Reads (passed in at invocation):**
```
mc.closings[]          — to build post-close context
mc.callList[]          — current lead name, status
mc.revenueMTD          — for context framing
mc.revenueGoal         — for urgency framing
memory.facts[]         — compliance rules, CTA rules, brand voice
```

**Cannot read:** lam, lifeOS, wealth, GHL directly, audit log.

**Writes (all gated):**
```
→ approvals queue only
   action_type: "draft_send"
   payload: { to, subject, body, channel }
   workspace: "mc"
```

**Can never write:** state.json directly, GHL, any external system.

**Always requires approval:**
- Any outreach message (email, text, DM)
- Any referral ask message
- Any post-close touchpoint

**Never requires approval:**
- Returning a draft for Rob to review in chat (no approval queue — just chat output)
- Summarizing a follow-up queue

**State objects touched:**
- Reads: `mc.closings`, `mc.callList`, `mc.followUpQueue`, `memory.facts`
- Writes: `approvals.json` (via approval API only)

**Output contract:**
```json
{
  "agent": "maya",
  "action_type": "draft_send",
  "approval_required": true,
  "draft": {
    "to": "Contact Name",
    "channel": "email | text | dm",
    "subject": "string | null",
    "body": "string (under 100 words)",
    "cta": "Book Your Consultation"
  },
  "context": "string — why this draft was generated",
  "compliance_flags": ["FL calling hours", "CTA rule", ...]
}
```

**Hard guardrails:**
- Body always under 100 words
- CTA always "Book Your Consultation" — never "Book Your Free Consultation"
- No Florida outbound calls outside 8AM–8PM
- Maya does not make a second referral ask if one was already sent this close cycle

---

### Atlas — Sales Copilot

**Role:** Live-call support. Carrier routing, objection responses, script lines, product framing. Advisory only — never executes anything.

**Invoked by:** Rob manually during a live call, or Alfred when a pitch context is detected in chat.

**Reads (passed in at invocation):**
```
mc.callList[]          — current lead name, priority, status
memory.facts[]         — carrier stack, GI ceiling, compliance rules
Atlas Playbook context — injected as system context (Section 9A routing, Section 2 carriers)
```

**Cannot read:** closings, revenue, lam, lifeOS, wealth, approvals.

**Writes:** Nothing. Atlas is read-only and advisory.

**Always requires approval:** N/A — Atlas returns recommendations, never actions.

**Output contract:**
```json
{
  "agent": "atlas",
  "action_type": "recommendation",
  "approval_required": false,
  "recommendation": {
    "carrier": "Americo | MoO | Corebridge | ETHOS | Am-Am | none",
    "product": "string | null",
    "script_line": "string — exact words Rob can say",
    "objection_response": "string | null",
    "next_step": "string"
  },
  "routing_reason": "string — why this carrier was selected",
  "gi_ceiling_flag": false
}
```

**Hard guardrails:**
- Carrier priority strictly: Americo → MoO → Corebridge → ETHOS → American-Amicable
- GI ceiling: flag to Rob if client need exceeds $20K GI — no carrier covers it
- Am-Am is simplified issue only — never present as GI
- ETHOS GAWL ($2K–$20K) is the only true GI product above Americo's $15K ceiling
- Atlas does not book appointments, send emails, or log anything

---

### Brooks — CFO

**Role:** Financial awareness. Debt priority analysis, snowball recommendations, revenue vs goal gap, budget flag.

**Invoked by:** Alfred when Rob asks a financial question, or at briefing time for wealth summary.

**Reads (passed in at invocation):**
```
wealth.totalDebt        — overall debt load
wealth.snowballOrder[]  — kill order and balances
wealth.debt[]           — full debt list with balances
wealth.income{}         — w2Biweekly
wealth.urgentDeadlines[]— open deadlines
mc.revenueMTD          — business income
lam.mthRevenue         — LAM income
memory.facts[]          — IRS status, rehab plan, known constraints
```

**Cannot read:** callList, closings, LAM products, lifeOS body data, approvals.

**Writes (all gated):**
```
→ approvals queue only
   action_type: "payment_recommendation"
   payload: { account, amount, rationale }
   workspace: "wealth"
```

**Can never write:** state.json directly, any external financial system, credit bureau.

**Always requires approval:**
- Any payment recommendation that Alfred would act on
- Any debt priority change recommendation

**Never requires approval:**
- Returning analysis in chat
- Running a what-if scenario on snowball order

**Output contract:**
```json
{
  "agent": "brooks",
  "action_type": "analysis | payment_recommendation",
  "approval_required": false,
  "analysis": {
    "revenue_vs_goal": "string",
    "kill_target": "account name",
    "days_to_kill_target": "number | null",
    "monthly_surplus": "number | null",
    "next_action": "string"
  },
  "recommendation": null
}
```

**Hard guardrails:**
- Brooks does not move money, contact lenders, or interact with any external system
- Snowball order from `wealth.snowballOrder` is authoritative — Brooks recommends changes only, never overwrites
- IRS ConServe payment ($50/mo) is noted as fixed obligation — Brooks does not recommend skipping it
- Student loan rehab plan ($5/mo) is noted as fixed — same constraint

---

## Sub-Agent Contract Summary Table

| Agent | Role | Reads | Writes | Approval required |
|---|---|---|---|---|
| **Maya** | COO — outreach drafts | mc.closings, callList, followUpQueue, memory | approvals queue only | Always — any outbound draft |
| **Atlas** | Sales copilot — advisory | mc.callList, memory, Atlas playbook | Nothing | Never — returns recommendations only |
| **Brooks** | CFO — financial analysis | wealth.*, mc.revenueMTD, lam.mthRevenue, memory | approvals queue only | If recommendation involves action |

---

## P2-C — MC Pipeline Intelligence (GHL as Source of Truth)

**Completed:** 2026-06-27

### Architecture Decision

GHL is the source of truth for opportunity stages. Alfred does not maintain a competing stage model. Alfred mirrors `ghlStage` (verbatim GHL string), derives all display and agent suggestion logic from `data/ghl_stage_map.json`, and adds Alfred-only annotation fields.

### GHL Pipeline Stages (Martinez Capital Pipeline)

```
Inbound Lead → Consent Verified → Contact Attempted → Connected →
Needs Analysis → App Submitted → In Review → Approved → Issued / Funded
                                                          Not Interested (terminal)
```

### Lead Shape (mc.callList entries)

```json
{
  "name": "string",
  "ghlStage": "verbatim GHL stage name",
  "ghlSyncStatus": "manual | synced",
  "value": 0,
  "lastContactDate": "YYYY-MM-DD | null",
  "nextActionDate": "YYYY-MM-DD | null",
  "nextAction": "string | null",
  "alfredNote": "string"
}
```

**GHL owns:** stage identity, stage transitions, contact history.
**Alfred owns:** `lastContactDate`, `nextActionDate`, `nextAction`, `alfredNote`, priority ranking, agent suggestions.

### Stage Map (`data/ghl_stage_map.json`)

Configurable JSON file. Keys = verbatim GHL stage names. Values define Alfred behavior:
- `alfredPriority` — HIGH / MEDIUM / LOW (used in ranking)
- `staleAfterDays` — threshold for stale flag
- `suggestMaya` / `suggestAtlas` — which agents appear on lead card
- `nextActionHint` — default action text for stage
- `activeQueue` / `nurtureQueue` — which panel the lead appears in
- `sortWeight` — base score for ranking

### Ranking Algorithm

Score = `staleScore(1000) + overdueScore(500/250) + prioScore(300/200/100) + sortWeight + valueScore(capped 500)`

Leads with `staleFlag=true` always float above non-stale leads in the same section.

### MC Dashboard Panels

- **PIPELINE (active)** — ranked list, sections: TODAY TOP CALLS (top 3) → STALE (if any) → PIPELINE (rest)
- **NURTURE QUEUE** — shown only if nurture leads exist
- **CLOSED / DEAD** — shown only if issued/dead leads exist
- **STATUS panel** — Pipeline count, Stale count (red if > 0), Top Call name

### Agent Buttons on Lead Cards

- `[ATLAS]` — appears when `suggestAtlas: true`. Prefills chat with Atlas carrier-routing context.
- `[MAYA]` — appears when `suggestMaya: true`. Prefills chat with Maya outreach-draft context.

### Routes Added

- `GET /api/ghl-stage-map` — serves `ghl_stage_map.json` to client
- `PATCH /api/mc/lead` — updates Alfred annotation fields only (`ghlStage`, `lastContactDate`, `nextActionDate`, `nextAction`, `alfredNote`, `value`). Sets `ghlSyncStatus: "manual"` when stage is manually updated. Logs to audit.

### What Waits for P2-D

- `ghlSyncStatus` flips from `"manual"` to `"synced"` when GHL API sync runs
- `lastContactDate` gets overwritten from GHL last activity timestamp
- `MANUAL` chip on lead cards disappears when sync is live
- No code changes required — same map, same fields, same ranking

---

## P2-D — GHL Read-Only Sync

**Completed:** 2026-06-27

### What Gets Synced

| GHL Field | Alfred Field | Notes |
|---|---|---|
| `name` / `contact.firstName+lastName` | `name` | GHL name wins on merge |
| `pipelineStageId` → resolved via stage list | `ghlStage` | Verbatim GHL stage string |
| `status` (won/lost/abandoned) | `ghlStage` | Overrides stage to Issued / Funded or Not Interested |
| `lastActivityAt` / `updatedAt` | `lastContactDate` | GHL wins only if its date is newer |
| `monetaryValue` | `value` | GHL wins only if non-zero |
| `id` | `ghlOpportunityId` | Primary merge key — stored permanently |
| `contactId` | `ghlContactId` | Secondary merge key — stored permanently |

Alfred keeps: `nextActionDate`, `nextAction`, `alfredNote` on every merge.

### Sync Behavior

- **Rob-triggered only** — "SYNC FROM GHL" button in MC workspace
- **No auto-sync, no webhooks** in Phase 2
- **Read-only** — Alfred never writes to GHL
- **New GHL opportunity not in Alfred** → added as new lead (`ghlSyncStatus: "synced"`)
- **Alfred lead not in GHL** → preserved unchanged as `ghlSyncStatus: "manual"`

### Deterministic ID Merge Rule (ID matching comes before all other merge logic)

**Deterministic ID matching runs first — before name matching, before conflict detection, before any GHL field is written.** When a `ghlOpportunityId` is present on both the GHL record and an Alfred lead, that match is authoritative. No other logic applies to that record. This is why manually patching a `ghlOpportunityId` onto an Alfred lead via `PATCH /api/mc/lead` is the canonical way to resolve name mismatches: once the ID is set, the next sync collapses the duplicate and GHL takes over the stage/timing fields while Alfred keeps all annotations.

Alfred uses a **3-tier merge lookup** for each incoming GHL opportunity:

1. **Primary — `ghlOpportunityId` (exact match):** Deterministic. One GHL opportunity maps to exactly one Alfred record. No conflict possible. Alfred record gets `ghlSyncStatus: "synced"` and GHL data merged in.
2. **Secondary — `ghlContactId`:** Used when no opp ID match exists. If multiple Alfred records share the same contact ID, the GHL record is flagged as a conflict and skipped — existing Alfred records are preserved as manual.
3. **Tertiary — name (case-insensitive):** Fallback only for Alfred records that have no `ghlOpportunityId` and no `ghlContactId` stored. Same conflict rule: if multiple manual records match the name, GHL record is skipped and conflict is logged.

**Conflict handling:** Conflicted GHL records are not merged. Existing Alfred records that caused the conflict remain as `"manual"`. Every conflict is logged to `audit.json` with reason and all IDs.

**Resolving a name mismatch:** If a manually-created Alfred lead (e.g., "Ana") does not match the GHL contact name (e.g., "Ana Martinez"), set `ghlOpportunityId` directly on the Alfred record via `PATCH /api/mc/lead`. The next sync will match via primary key regardless of name.

### Pre-Dedup Rule (Alfred-side)

Before building merge indexes, Alfred collapses any two Alfred records that share the same `ghlOpportunityId`. This can occur when a manual lead is explicitly assigned an opp ID that was already held by a previously-synced record.

**Keep rule:** the Alfred record with the most local annotations wins (`nextAction` + `alfredNote` + `nextActionDate` + non-zero `value`, each worth 1 point). If tied, the first record in the list is kept.

Every collapse is logged to `audit.json` as `type: "ghl_sync_dedup"` with `kept`, `dropped`, and `ghlOpportunityId`.

### Source-of-Truth Boundaries

| Field | Owner |
|---|---|
| `ghlStage` | GHL — always overwritten on sync |
| `ghlOpportunityId` | GHL — stored permanently, never overwritten to empty |
| `ghlContactId` | GHL — stored permanently, never overwritten to empty |
| `lastContactDate` | GHL wins if newer; Alfred value kept if GHL has none |
| `value` | GHL wins if non-zero; Alfred value kept if GHL sends 0 |
| `nextActionDate` / `nextAction` / `alfredNote` | Alfred — never overwritten by sync |

### API Notes

- `/opportunities/pipelines` uses `locationId` (camelCase)
- `/opportunities/search` uses `location_id` and `pipeline_id` (snake_case)
- `requests` library required — Cloudflare blocks `Python-urllib` User-Agent

### Routes

- `POST /api/ghl/sync` — Rob-triggered sync. Returns `{ok, added, updated, manual_kept, conflicts[], total, synced_at, configured}`
- `GET /api/ghl/status` — Returns `{configured, lastSync, missing[]}` (no sensitive data)

---

## Phase 2 Implementation Order (Detailed)

### P2-B: Sub-Agent Contracts

1. `agents/__init__.py` — package, shared types
2. `agents/base.py` — `AgentResponse` dataclass, `AgentContract` base class, approval queue helper
3. `agents/maya.py` — Maya contract, draft builder, compliance validator
4. `agents/atlas.py` — Atlas contract, carrier router, objection lookup
5. `agents/brooks.py` — Brooks contract, snowball analyzer, gap calculator
6. `server.py` — add `/api/agents/invoke` route (workspace + agent_name + context + prompt)
7. `public/app.js` — `invokeAgent(workspace, agentName, context)` client function

### P2-C: MC Workflow Execution

1. `data/state.json` — add `stage`, `lastContactDate`, `nextActionDate`, `stageHistory` to callList entries
2. `server.py` — add `/api/mc/stage` PATCH route (update lead stage, log to audit)
3. `public/index.html` — stage column in call list, escalation flag on stale leads
4. `public/app.js` — stage badge rendering, escalation detection in `renderMCData()`
5. Wire Maya: close log → invoke Maya → draft post-close sequence → approval queue

### P2-D: GHL Integration (read)

1. `config.py` — GHL API key, pipeline ID, user ID (env vars, not state.json)
2. `integrations/ghl.py` — GHL client, `get_contacts()`, field mapper to Alfred stage model
3. `server.py` — add `/api/ghl/sync` POST route (Rob-triggered, returns diff)
4. `public/index.html` — "SYNC FROM GHL" button in MC workspace
5. `public/app.js` — sync handler, result display in chat

### P2-E: Approvals Refinement

1. `data/approvals.json` — add `priority`, `action_type`, `expires_at` fields
2. `server.py` — add expiry check on approval fetch, batch approve endpoint
3. `public/index.html` — priority sort, action_type filter, batch select
4. `public/app.js` — batch approve handler, expiry indicator

### P2-A: Routing Intelligence

1. `server.py` — intent classifier in `build_system_prompt()` (keyword + context pattern)
2. `public/app.js` — pre-send intent detection, auto-set `currentWorkspace`, notify in chat

---

## First Code Files for P2-B

### File 1: `agents/__init__.py`
Marks `agents/` as a Python package. Exports the three agent classes.

### File 2: `agents/base.py`
Defines:
- `AgentInput` dataclass — workspace, agent_name, context dict, prompt string
- `AgentResponse` dataclass — agent, action_type, approval_required, payload, compliance_flags
- `AgentContract` abstract base class — `invoke(input: AgentInput) -> AgentResponse`
- `queue_for_approval(response: AgentResponse)` — writes to approvals.json via internal API

### File 3: `agents/maya.py`
Implements `MayaContract(AgentContract)`:
- Validates input context has required fields (closing, contact name)
- Builds draft prompt with compliance rules injected
- Calls Claude API with Maya persona and constraints
- Validates output: word count, CTA, no second referral ask flag
- Returns `AgentResponse` with `action_type: "draft_send"`, `approval_required: True`

### File 4: `agents/atlas.py`
Implements `AtlasContract(AgentContract)`:
- Validates input has lead context
- Builds carrier routing prompt with Atlas Section 9A logic
- Calls Claude API with Atlas persona and carrier stack injected
- Returns `AgentResponse` with `action_type: "recommendation"`, `approval_required: False`
- Flags GI ceiling breach if `need > 20000`

### File 5: `agents/brooks.py`
Implements `BrooksContract(AgentContract)`:
- Validates input has wealth context
- Builds financial analysis prompt with snowball order and income data
- Calls Claude API with Brooks persona
- Returns `AgentResponse` with `action_type: "analysis"`, `approval_required: False`
- If recommendation involves action: `approval_required: True`, `action_type: "payment_recommendation"`

### File 6: `server.py` addition — `/api/agents/invoke`
```python
POST /api/agents/invoke
Body: { workspace, agent_name, context, prompt }
Returns: AgentResponse (JSON)
Side effects: logs to audit.json, queues approval if required
```
