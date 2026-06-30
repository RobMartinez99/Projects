# MARTINEZ CAPITAL — LIVE OPERATIONS RESOLUTION PACK
## Version 1.0 | June 2026 | High-Priority Blockers Only

---

## BLOCKER 1 — STATE COMPLIANCE REFERENCE FRAMEWORK

**What it is:**
No documented compliance reference exists in the current system. Florida is the active home-state standard. Additional state licenses will be added as the operation expands. The compliance framework must be built to support multi-state operation from the start — not rebuilt each time a new state is added.

**Why it matters right now:**
Every outreach agent is live and contacting leads in Florida today. State rules differ from federal defaults — calling hours, call attempt limits, replacement disclosures, SMS consent, and telemarketing registration. Operating without a documented reference means compliance is dependent on memory, not policy. Building a single-state document that will need to be rebuilt for each new state creates rework and compliance gaps at every expansion point.

**Exact action needed:**
Build a multi-state compliance framework structured as follows:

**Layer 1 — Federal baseline (applies in all states):**
- TCPA calling and texting rules (consent, opt-out, time-of-day)
- Federal DNC registry compliance
- CAN-SPAM for email outreach
- Federal replacement and suitability standards

**Layer 2 — State-specific rules (one entry per licensed state):**
Build FL first. Each state entry covers:
- Outbound calling hours (FL: 8AM–8PM local time — confirm statutory basis)
- Maximum call attempts per 24-hour period (FL operating assumption: 3 — confirm against FL statute)
- SMS outreach rules (consent requirements, opt-out handling)
- Replacement disclosure requirements (FL-specific form or language)
- State DNC registry (FL DNC vs. federal DNC)
- Telemarketing license or registration requirements, if applicable

**Layer 3 — Expansion protocol:**
When a new state license is added, a new state entry is appended to Layer 2. No other part of the framework changes. All outreach agents and Atlas check the active license list and apply the correct state rules for each contact's location.

**Owner:** Rob — source material must come from a licensed compliance source (carrier compliance desk, E&O carrier, or the relevant state Department of Financial Services)

**Source of truth:** Compliance framework saved to docs:martinez-capital: as `MC-State-Compliance-Framework-v1.md` and referenced in MC-Live-Operations-Map-v1.md. FL is the active entry. Additional states append as licensed.

**Completion condition:** Framework document exists with FL entry confirmed against a licensed source. Federal baseline is documented. Expansion protocol is defined. All outreach agents and Atlas reference the framework. Rob confirms FL rules match documented rules.

**Dependency:** Until this is complete, all outreach activity runs on assumed compliance. No blocker on current FL calling — 8AM–8PM and 3-call limits are already being enforced — but the assumptions must be confirmed and the framework must be in place before any new state is added or outreach volume is scaled.

---

## BLOCKER 2 — STALE LEAD THRESHOLD

**What it is:**
No definition exists for how long a lead can sit in a given pipeline stage before it is considered stale. Pipeline Dashboard cannot flag stalled leads, Maya cannot intervene on schedule, and Follow-Up Sequences have no clean exit logic.

**Why it matters right now:**
Leads are aging silently. Without a threshold, the pipeline appears active even when leads have gone cold. This inflates the active pipeline count, obscures true conversion rates, and delays recycling or closing leads that will not convert.

**Exact action needed:**
Rob defines the maximum days allowed in each active GHL pipeline stage before a lead is flagged stale. Suggested starting point — adjust based on Rob's actual conversion data:

| Pipeline Stage | Suggested Stale Threshold |
|---|---|
| New / Uncontacted | 1 day |
| First Touch Sent | 3 days (no reply) |
| Attempting Contact | 5 days (no connect) |
| Conversation Started | 3 days (no next step set) |
| Quote Sent | 5 days (no response) |
| Follow-Up Active | 7 days (no reply) |
| Pending Application | 5 days (no submission) |

**Owner:** Rob decides thresholds — Maya enforces them once defined

**Source of truth:** Thresholds documented in GHL pipeline stage settings and in MC-Live-Operations-Map-v1.md (Pipeline Dashboard — KPI field updated)

**Completion condition:** Every active GHL stage has a defined stale threshold. Pipeline Dashboard surfaces leads that exceed it. Maya reviews the stale list daily and flags for Rob's action.

**Dependency:** Feeds directly into Follow-Up Sequence stop logic — sequences should exit or tag a lead as stale at the same threshold. Confirm sequence exit triggers match the stage thresholds after this is defined.

---

## BLOCKER 3 — DATABASE CLEANUP FOR RENEWAL & NURTURE MACHINE

**What it is:**
The GHL database has not been cleaned. Contacts are not accurately tagged by status — active client, active prospect, lapsed, dead, or do-not-contact. The Renewal & Nurture Machine cannot run at full cadence until the list is accurate.

**Why it matters right now:**
Running nurture sequences on an unclean database produces three problems: wasted credits on contacts who should not receive outreach, compliance risk if DNC contacts are in the sequence, and inaccurate retention metrics. The machine is built — the list is what is broken.

**Exact action needed:**
Complete a full GHL database audit and tag every contact with one of the following statuses:
- **Active Client** — policy is in force, premium current
- **Active Prospect** — in pipeline, not yet closed
- **Lapsed / Cancelled** — policy no longer in force
- **Closed Lost** — prospect who did not convert, no further outreach planned
- **Do Not Contact** — opted out, requested no contact, or compliance flag

After tagging:
- Confirm which statuses enter the Renewal & Nurture Machine (Active Clients only, unless a re-engagement sequence is defined for a specific other status)
- Remove or suppress all non-qualifying contacts from the nurture machine's contact list
- Set the machine's entry trigger to the Active Client tag — not a blanket list

**Owner:** Rob executes the audit — Maya monitors completion and confirms machine activation

**Source of truth:** GHL (cleaned contact records with accurate status tags)

**Completion condition:** Every GHL contact has a status tag. Active Clients are identified and confirmed. Renewal & Nurture Machine is activated against the Active Client list only. Rob confirms the list is accurate before the machine's first run.

**Dependency:** Stale lead threshold (Blocker 2) should be resolved first — some contacts currently in the pipeline may need to be tagged stale or closed lost as part of the cleanup. Completing both together reduces rework.

---

## BLOCKER 4 — ETHOS CARRIER DATA AND GI FALLBACK ABOVE $15K

**Status: ✅ CLOSED — June 2026**

**What was resolved:**
ETHOS agent guide ingested and documented in MC-ETHOS-Carrier-Reference-v1.md. ETHOS confirmed as Carrier #4 in the MC stack with two usable Florida products:

- **TruStage Advantage Whole Life** (MEMBERS Life Insurance Co.) — simplified issue, age 18–85, $5K–$100K (age <70) / $5K–$50K (age 71–75), instant decision, available in FL
- **TruStage Guaranteed Acceptance Whole Life** (CMFG Life Insurance Co.) — true GI, no health questions, age 45–80, $2K–$20K, available in FL, 2-year graded benefit (return of premium + 10%)

American-Amicable guide reviewed in full — Family Solution WL (ages 0–49) and Golden Solution WL (ages 50–85). Neither product is GI. Both are simplified issue only, with mandatory health questions and hard knockout conditions on Questions 1–3 of the Golden Solution.

**GI fallback question — final answer:**
- GI up to $15K: Americo Eagle Guaranteed (ages 50–80, $5K–$15K)
- GI $15K–$20K: ETHOS TruStage GAWL (ages 45–80, up to $20K)
- GI above $20K: **No carrier in the current MC stack covers this.** Confirmed gap. American-Amicable does not close it.

**Atlas updated:**
Sections 2 and 9 of ATLAS-v1-Playbook-COMPLETE.md updated June 2026 to reflect confirmed ETHOS data, confirmed Am-Am simplified-issue-only status, explicit GI ceiling at $20K, and Quick Reference table updated to route correctly and flag the above-$20K gap.

**What remains:**
The GI gap above $20K is a documented open gap in the MC carrier stack. When a client needs guaranteed issue above $20K, Atlas will flag it to Rob directly — no routing path exists. If Rob adds a true GI carrier at higher face amounts in the future, Atlas Sections 2 and 9 will need to be updated at that time.

**Source of truth:** ATLAS-v1-Playbook-COMPLETE.md (Sections 2 and 9 — updated). MC-ETHOS-Carrier-Reference-v1.md (ETHOS carrier reference).

---

## READY STATE

The live system runs cleanly when: FL compliance is documented and confirmed, every pipeline stage has a stale threshold, the GHL database is cleaned and tagged, Atlas has accurate ETHOS data with confirmed routing rules (completed), and the GI gap above $20K is evaluated against American-Amicable.

---

*Built for Martinez Capital — Live Operation Mode — June 2026*
*Resolves Blockers 1–4 from MC-Resolution-Queue-v1.md*
