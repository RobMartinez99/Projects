# MARTINEZ CAPITAL — RESOLUTION QUEUE
## Version 1.0 | June 2026 | Live Operations Map Dependencies

---

## Resolution Queue

| # | Item | Why It Matters | Owner | Decision Needed | Source of Truth | Completion Condition | Priority |
|---|---|---|---|---|---|---|---|
| 1 | **Stale lead threshold not defined** | Without a definition, Pipeline Dashboard cannot flag stalled leads, Maya cannot intervene, and Follow-Up Sequences have no clean exit logic. Leads silently age out of the pipeline with no action taken. | Rob | Define maximum days allowed per pipeline stage before a lead is flagged as stale. Example: 5 days in First Touch with no reply = stale; 3 days post-quote with no response = stale. | GHL pipeline stage settings + MC-Live-Operations-Map-v1.md (update threshold per stage) | Threshold defined for every active GHL pipeline stage. Pipeline Dashboard flags leads that exceed it. Maya reviews the stale list daily. | **High** |
| 2 | **State compliance reference framework missing** | Florida is the active home-state standard; additional state licenses will be added as the operation expands. Without a multi-state compliance framework, every new license requires rebuilding compliance from scratch. Current outreach agents and Atlas operate on assumed FL rules — not documented, not confirmed, and not scalable. | Rob | Build a multi-state compliance framework: federal baseline layer (TCPA, DNC, CAN-SPAM) + state-specific layer (FL entry first, expansion protocol defined for additional states). Confirm FL rules against a licensed source. | `MC-State-Compliance-Framework-v1.md` added to docs:martinez-capital:, referenced in MC-Live-Operations-Map-v1.md. FL is active entry; additional states append as licensed. | FL entry is confirmed and documented. Federal baseline is documented. Expansion protocol is defined. All outreach agents and Atlas reference the framework. | **High** |
| 3 | **Renewal & Nurture Machine waiting on database cleanup** | The machine cannot run at full cadence until the active client list in GHL is accurate. Running nurture sequences on incorrect, duplicate, or stale contacts wastes credits, produces bad data, and risks contacting people who should not be in the sequence. | Rob | Complete GHL database cleanup: remove duplicates, confirm active policy holders, tag contacts by status (active client, prospect, lapsed, dead). Define which contact types enter the nurture machine. | GHL (cleaned contact list, correct tags and statuses) | GHL database is cleaned and tagged. Active clients are identified. Renewal & Nurture Machine is activated and running its defined cadence. Confirmed in writing by Rob. | **High** |
| 4 | **ETHOS carrier data — ✅ CLOSED** | Atlas had flagged ETHOS as uncertain with no routing data. Guide has been ingested. ETHOS is confirmed as Carrier #4 with two FL-available products: TruStage Advantage WL (simplified issue, age 18–85, up to $100K) and TruStage GAWL (true GI, age 45–80, $2K–$20K, graded benefit years 1–2). Atlas routing rules, Section 2 carrier entry, and Section 9 fit rules are documented in MC-ETHOS-Carrier-Reference-v1.md and ready to paste into Atlas. | — | No further decision needed. Paste Section 2 and Section 9 update blocks from MC-ETHOS-Carrier-Reference-v1.md into ATLAS-v1-Playbook-COMPLETE.md. | MC-ETHOS-Carrier-Reference-v1.md | Section 2 Carrier #4 entry and Section 9 ETHOS fit rules pasted into Atlas. | **CLOSED** |
| 5 | **GI fallback above $20K — ✅ CLOSED (gap confirmed)** | American-Amicable guide reviewed in full (Family Solution ages 0–49, Golden Solution ages 50–85). Neither product is GI — both are simplified issue with mandatory health questions. Hard knockouts on Questions 1–3 in Golden Solution. The GI gap above $20K is real and confirmed: no carrier in the current MC stack covers guaranteed issue above $20K. ETHOS GAWL is the hard GI ceiling at $20K. Atlas updated to reflect this — Section 9 Quick Reference flags the gap explicitly. | — | No further carrier review needed for this item. If Rob adds a true GI carrier above $20K in the future, Atlas will need to be updated at that time. | Atlas Sections 2 and 9 updated. MC-Resolution-Pack-v1.md Blocker 4 updated. | GI gap above $20K is a confirmed open gap in the MC stack, documented and reflected in Atlas. No routing path exists — Atlas will flag to Rob when this situation arises. | **CLOSED — gap confirmed** |
| 6 | **Social Prospecting platform list not confirmed** | Social Prospecting runs weekly but without a defined platform list, the scan has no consistent scope. Results will vary week to week, making the KPI (opportunities identified per week) unmeasurable and the agent's output unreliable. | Rob | Define which platforms Social Prospecting scans each week. Minimum: Facebook. Add LinkedIn, NextDoor, or others based on where Rob's target demographic is active. | MC-Live-Operations-Map-v1.md (Social Prospecting — systems touched field updated) | Platform list is defined and documented. Social Prospecting runs against the same platforms each week. Output is consistent and measurable. | **Medium** |
| 7 | **Ad Campaign Creator conditional on paid traffic budget** | Ad Campaign Creator cannot run without an active paid traffic allocation. This is a planning dependency, not a system failure. When paid traffic is budgeted, the agent needs to be activated; when it is not, it stays paused. No system fix needed — just a clear activation gate. | Rob | Confirm whether paid traffic is currently budgeted. If yes, activate Ad Campaign Creator and set the weekly run. If no, document the activation condition (e.g., minimum monthly budget threshold before activation). | MC-Live-Operations-Map-v1.md (Ad Campaign Creator — trigger field updated with activation gate) | Activation condition is documented. When paid traffic is allocated, Ad Campaign Creator runs. When it is not, it is explicitly paused — not just inactive. Rob confirms the current status. | **Low** |

---

## Recommended Order

**Address in this sequence:**

**1. Stale lead threshold** — This is blocking Pipeline Dashboard accuracy and Maya's daily intervention logic right now. No cost to fix; just a decision. Do this first.

**2. FL compliance reference** — Every outreach agent is live and touching leads in Florida today. Operating without a documented compliance reference is the highest-risk open item in the stack. Document it before scaling any outreach.

**3. GHL database cleanup / Renewal & Nurture Machine** — The database has to be clean before the nurture machine activates. Start the cleanup now so the machine can go live without delay. This takes real time — start early.

**4. ETHOS carrier data** — ETHOS is Carrier #4 in the active stack. Every client who does not qualify for Americo or MoO hits a routing gap until this is resolved. Obtain the agent guide and ingest it.

**5. GI fallback above $15K** — Directly tied to ETHOS resolution. If ETHOS is the GI fallback above $15K, resolving item 4 may resolve item 5 simultaneously. Confirm after ETHOS guide is reviewed.

**6. Social Prospecting platform list** — Quick to resolve; one decision. Do it before the next weekly run so the output is consistent.

**7. Ad Campaign Creator activation gate** — No urgency unless paid traffic is being allocated now. Resolve after items 1–6 are closed.

---

*Built for Martinez Capital — Live Operation Mode — June 2026*
*Resolves 7 unresolved items from MC-Live-Operations-Map-v1.md*
