# Alfred — Architecture Reference
**As of Phase 1 lock, June 27, 2026**

---

## Single Source of Truth

```
data/state.json
    │
    ├── /api/state (Flask GET)
    │       └── appState (browser JS)
    │               ├── render*() functions → all DOM elements
    │               ├── workspaceContext() → chat message prefix
    │               └── generateBriefing() → briefing prompt injection
    │
    └── server.py build_system_prompt()
            └── LIVE STATE block injected into every Alfred API call
```

**One file. Two readers. Zero divergence.**

Updates flow in one direction only:
- User action → POST/PATCH API → server writes `state.json` → client calls `loadState()` → `renderAll()`
- Alfred chat suggestions → Approval queue → Rob approves → API patch → same path

---

## File Map

| File | Purpose |
|---|---|
| `server.py` | Flask server, all API routes, `build_system_prompt()` |
| `data/state.json` | All live business state — single source of truth |
| `data/memory.json` | Alfred memory facts — injected into every conversation |
| `data/approvals.json` | Pending and resolved approval queue |
| `data/audit.json` | Full audit trail — all state changes, agent transitions, closes |
| `public/app.js` | All render logic, chat, briefing, agent transitions |
| `public/index.html` | Shell — all dynamic elements have IDs, no hardcoded values |
| `public/style.css` | Dark command-center theme — CSS variables throughout |
| `ALFRED.md` | Master operating rules |
| `ALFRED-Architecture.md` | This file |
| `ALFRED-Phase1-Completion.md` | Phase 1 locked state |
| `docs:martinez-capital:/ATLAS-v1-Playbook-COMPLETE.md` | Atlas live-call sales copilot |

---

## state.json Shape

```
state.json
├── dashboard {}          — lastBriefing, weeklyReview timestamps
├── mc {}
│   ├── operatingMode     — "MINIMUM OPERATION"
│   ├── phase             — "Phase 1 — Warm Market / Manual Sales"
│   ├── revenueGoal       — "$10K/month by Sept 1, 2026"
│   ├── revenueMTD        — number
│   ├── policiesClosed    — number
│   ├── closings []       — { contact, premium, date }
│   ├── callList []       — { name, status, priority }
│   ├── followUpQueue []  — { name, note, dueDate }
│   ├── blockers []       — string[]
│   ├── agents []         — { name, status, note, stateHistory[] }
│   └── notes             — string
├── lam {}
│   ├── operatingMode     — "STAGE-FIRST"
│   ├── mthRevenue        — number
│   ├── unitsSold         — number
│   ├── nextProduct       — string
│   ├── products []       — { name, price, unitsSold, status }
│   ├── productQueue []   — { title, status }
│   ├── blockers []       — string[]
│   ├── agents []         — { name, status, note }
│   └── notes             — string
├── lifeOS {}
│   ├── mode              — "MONK MODE"
│   ├── targetDate        — "2026-09-01"
│   ├── targetLabel       — "Quit W2"
│   ├── nonNegotiables [] — string[]
│   ├── body {}           — { currentWeight, goalWeight, status, lbsToGoal, ... }
│   ├── weightLog []      — { date, weight }
│   ├── dailyCheckins []  — { date, completed[] }
│   ├── weeklyScoreboard []
│   ├── keyDates []       — { date, label, urgent }
│   ├── dailyProtocol []  — string[]
│   ├── agents []
│   └── notes             — string
└── wealth {}
    ├── income {}         — { w2Biweekly: number }
    ├── totalDebt         — number
    ├── totalAssets       — number
    ├── netWorth          — number
    ├── creditScores {}   — { experian, transunion, equifax } each { score, model, asOf }
    ├── urgentDeadlines []— { date, label, critical, resolvedStatus, resolvedNote }
    ├── snowballOrder []  — { account, balance, status }
    ├── debt []           — { account, balance, note }
    ├── agents []
    └── notes             — string
```

---

## Key Utilities (app.js)

| Function | Purpose |
|---|---|
| `deadlineStatus(dateStr)` | Returns `{ liveDays, status }` — single source for all deadline logic |
| `deadlineChipText(d)` | Formats deadline as chip text (overdue / Xd / due today) |
| `deadlineRowHtml(d, resolved)` | Full blocker-row HTML with correct class |
| `renderBlockerList(elId, blockers[])` | Renders any blocker array into any container |
| `workspaceContext()` | Injects live state into every chat message prefix |
| `generateBriefing()` | Builds live-data briefing prompt from appState |
| `renderAgentRegistry(wsKey, id, ws)` | Clickable agent rows with full state machine |

---

## Integration Status

### Martinez Capital

| Integration | Status | Notes |
|---|---|---|
| GHL (leads, pipeline, contacts) | **MANUAL SYNC** | No live API. All data entered manually via call list and close log. |
| Carrier appointments (Americo, MoO, Corebridge, ETHOS, Am-Am) | **ACTIVE** | Rob is appointed. No Alfred integration — human-executed. |
| Lead vendors (BESO Connect, True Ring, Callers.io) | **ACTIVE** | Purchased manually. No webhook integration yet. |
| Caller ID registration | **PENDING** | calltransparency.com, freecallerregistry.com, hiya.com — not filed. |
| Toll-free 833 number | **BLOCKED** | Requires LLC reinstatement ($660). |
| Maya — COO sub-agent | **ON-DEMAND** | Chat only. No outbound capability. No webhook. |
| Atlas — Sales Copilot | **ON-DEMAND** | Live-call context only. No automation. |
| AI Call Manager | **PAUSED** | FL 3-call/24hr compliance implementation pending. |
| All other MC agents | **PAUSED / FROZEN** | See agent registry for individual conditions. |

### Living Alpha Male

| Integration | Status | Notes |
|---|---|---|
| Typeform (Ebook Empire trigger) | **WEBHOOK-ONLY** | Active — fires on $497 payment. |
| WordPress (lamreviews.com) | **FROZEN** | Waiting API password from Ruhul Amin. |
| Email list / nurture | **NOT STARTED** | No leads, no platform active. |
| Outreach Engine | **PAUSED** | Website not ready. |
| Social publishing | **NOT STARTED** | Stage-first mode — no auto-publishing. |

### Life OS

| Integration | Status | Notes |
|---|---|---|
| Weight logging | **LIVE** | Alfred UI → `/api/lifeos/weight` → `state.json` |
| Check-in logging | **LIVE** | Alfred UI → `/api/lifeos/checkin` → `state.json` |
| Weekly scoreboard | **LIVE** | Alfred UI → `/api/lifeos/scoreboard` → `state.json` |
| Wearables / external health data | **NOT STARTED** | Manual entry only. |

### Wealth

| Integration | Status | Notes |
|---|---|---|
| Debt payments | **LIVE** | Alfred UI → `/api/wealth/payment` → `state.json` |
| Credit score logging | **LIVE** | Alfred UI → `/api/wealth/score` → `state.json` |
| Dispute status | **LIVE** | Alfred UI → `/api/wealth/dispute` → `state.json` |
| Credit bureau APIs | **NOT STARTED** | Manual entry only. No live bureau connection. |
| Bank / card feeds | **NOT STARTED** | Manual. No Plaid or similar. |

---

## Agent State Machine

```
SAVED → ON-DEMAND → ACTIVE
  ↑          ↑         ↓
FROZEN → PAUSED ←──────┘
RETIRED (terminal)
WEBHOOK-ONLY (terminal — no manual control)
MONITORING (passive — no execution)
```

- **FROZEN → PAUSED**: requires resolution note + approval
- **any → ACTIVE**: requires reason note + approval
- **ACTIVE / ON-DEMAND → PAUSED**: no approval required
- **RETIRED / WEBHOOK-ONLY**: no transitions permitted
