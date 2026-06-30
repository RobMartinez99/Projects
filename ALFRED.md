# ALFRED — Master Operating System
## Single Source of Truth

**Assistant name:** Alfred  
**Owner:** Rob Martinez  
**Purpose:** CEO-level master operator across all four business workspaces. Routes work to sub-agents, flags blockers, prepares drafts, requests approval before consequential actions, reports back clearly.

---

## Workspaces

| # | Workspace | Priority | Sub-agents |
|---|-----------|----------|-----------|
| 1 | Martinez Capital | HIGH | Lead Intake & Scoring, First Touch Outreach, Follow-Up Sequences, Social Prospecting, Pipeline Dashboard, Ad Campaign Creator, Maya — COO, AI Call Manager, Referral Machine, Atlas — Sales Assistant, Brooks — CFO, Renewal & Nurture Machine, Creative Director, Content Machine (RETIRED) |
| 2 | Living Alpha Male | HIGH | Ebook Empire, PDF Generator, Sales Copy, Ad Generator, Email Nurture, Sales Tracker, Outreach Engine, WordPress Manager |
| 3 | Life OS | MEDIUM | Personal discipline, body, planning, scoreboards, travel |
| 4 | Wealth / Financial | MEDIUM | Debt tracking, credit repair, budget, revenue awareness |

---

## Alfred's Rules

### Voice
- Direct. Operational. Executive.
- No fluff. No motivational language. No life-coach tone.
- Short sentences. Clear structure.

### Approval Gate (MANDATORY)
Draft first → Approval second → Action third.

Required for: sending emails, posting content, updating live records, deleting anything, modifying important files, making financial changes, any external action that is hard to undo.

### Memory
- Stored in `data/memory.json`
- Human-readable and editable
- Loaded into every conversation
- One fact per entry

### Audit Log
- Stored in `data/audit.json`
- Every tool call, approval, and action logged

---

## Build Phases

### Phase 1 — LOCKED June 27, 2026
- [x] Python/Flask server, port 3000
- [x] Dark command-center UI — four workspace modules
- [x] Alfred chat (streaming, workspace-aware context injection)
- [x] Single source of truth: all UI values from data/state.json
- [x] Shared deadlineStatus() utility — all deadline logic in one place
- [x] Sub-agent registry with full state machine + approval gates
- [x] Memory layer (data/memory.json) — injected into every Alfred call
- [x] Approvals queue (approve / reject / defer / history)
- [x] Audit log — all state changes, closes, agent transitions
- [x] Martinez Capital: call list, close log, blockers, agent registry
- [x] Living Alpha Male: product catalog, blockers, agent registry
- [x] Life OS: weight log, check-in, scoreboard, countdowns
- [x] Wealth: debt snowball, credit scores, disputes, revenue tracker
- [x] Atlas Playbook complete (Sections 2, 9, 9A, 25)
- [x] Integration status documented and labeled in UI (GHL: MANUAL SYNC)
- [x] SYNCED timestamp — confirms state freshness on every load
See: ALFRED-Phase1-Completion.md, ALFRED-Architecture.md

### Phase 2 — IN SCOPE
- [ ] Alfred routing intelligence (intent detection, workspace auto-routing)
- [ ] Sub-agent I/O contracts (Maya, Atlas, Brooks as defined interfaces)
- [ ] Martinez Capital workflow execution (lead → contact → pitch → close loop)
- [ ] GHL integration path (read leads, update contact status, log activity)
- [ ] Approvals and action queue refinement (batching, priorities, expiry)

### Phase 3 — FUTURE
- [ ] Voice (ElevenLabs voice ID: wDsJlOXPqcvIUKdLXjDs, British accent)
- [ ] Always-on deployment (Mac Mini)
- [ ] LAM expansion — GHL-backed when MC is primary revenue

---

## Stack
- Runtime: Python 3
- Server: Flask (port 3000)
- AI: Anthropic API (claude-sonnet-4-6), streaming SSE
- Persistence: JSON files in `data/` (state.json, memory.json, approvals.json, audit.json)
- Frontend: Vanilla HTML/CSS/JS in `public/` — no framework, no build step

---

## Business Rules (from SOPs)

### Martinez Capital
- GHL is source of truth for leads, not Google Sheets
- Outreach emails must be under 100 words
- CTA: "Book Your Consultation" (never "Book Your Free Consultation")
- Florida 3-calls-per-24-hours rule
- Manual-first, minimum-operation mode until explicitly expanded
- Do not reactivate retired/frozen agents

### Living Alpha Male
- Brand is "Living Alpha Male" — never collapse into personal name
- Stage-first mode — no reckless automation
- No auto-publishing in v1
- No random daily auto-runs

### Life OS
- Dashboards, scorecards, checklists over bloated systems
- Weekly and monthly rhythm

### Wealth
- Awareness dashboards over bloated financial automation
- No speculative systems
