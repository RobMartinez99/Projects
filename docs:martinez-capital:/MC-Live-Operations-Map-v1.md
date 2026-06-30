# MARTINEZ CAPITAL — LIVE OPERATIONS MAP
## Version 1.0 | June 2026 | Live Operation Mode Active

---

## TIER 1 — DAILY REVENUE ENGINE

---

### 1. Lead Intake & Scoring

**Purpose:** Receive incoming leads from all sources, score them by quality and urgency, and route them into the correct pipeline stage in GHL.

**Owner:** Automated — Maya monitors exceptions

**Trigger:** Lead file upload, lead import, or inbound form submission

**Cadence:** Runs on every new lead, as received

**Stop condition:** Lead is scored and routed into GHL; no further action needed from this agent

**Systems touched:** GHL (pipeline), lead source (Facebook, list upload, inbound form)

**KPI:**
- Lead-to-scored rate (target: 100% of imported leads scored within 1 hour)
- Routing accuracy (correct stage assignment on first pass)

**Notes:** GHL is source of truth. Any unscored or mis-routed leads should surface in the Pipeline Dashboard daily report. Maya handles exceptions.

---

### 2. First Touch Outreach

**Purpose:** Send the first contact to a new lead immediately after scoring — before the lead goes cold.

**Owner:** Automated — Rob reviews reply logic

**Trigger:** Lead is scored and marked as new/active in GHL

**Cadence:** Immediately after scoring; first touch within 5 minutes of lead arrival during business hours

**Stop condition:** Lead replies, books an appointment, or is manually moved to a different stage

**Systems touched:** GHL (SMS/email outreach), lead source record

**KPI:**
- First-touch speed (target: under 5 minutes during business hours)
- Reply rate on first touch

**Notes:** Message must comply with state-specific calling and texting rules. Florida is the active home-state standard (8AM–8PM local time, consent-based SMS). As new state licenses are added, outreach rules for each contact must match that contact's state — not FL defaults. Reference `MC-State-Compliance-Framework-v1.md` for current rules. First touch is text or email — no outbound call until call attempt logic engages.

---

### 3. Follow-Up Sequences

**Purpose:** Maintain contact with leads who did not respond to first touch, did not book, or went quiet after initial contact.

**Owner:** Automated — Maya monitors cadence compliance

**Trigger:** Lead did not respond within defined window after first touch, or booking was not completed

**Cadence:** Defined sequence — typically Day 1, Day 3, Day 5, Day 7, then weekly until stop condition is met

**Stop condition:** Lead replies, books, opts out, or is manually moved to a closed/dead stage by Rob

**Systems touched:** GHL (sequences, contact record, pipeline stage)

**KPI:**
- Sequence completion rate (percentage of leads who reach a defined stop condition vs. fall through)
- Booking conversion rate from sequence contacts

**Notes:** Reply-stop logic must be active — any reply pauses or exits the sequence. Max 3 call attempts per 24-hour period per Florida compliance. Sequences must have an explicit endpoint; no infinite loops.

---

### 4. AI Call Manager

**Purpose:** Generate the daily call list and enforce Florida calling compliance across all outreach activity.

**Owner:** Automated — Rob executes the call list

**Trigger:** Daily, at a set time before Rob's call block begins

**Cadence:** Daily (business days), before call activity starts

**Stop condition:** Call list is generated and delivered; resets next business day

**Systems touched:** GHL (contact records, call history, pipeline stage), compliance rules (FL 8AM–8PM, 3-call/24-hour limit)

**KPI:**
- Call list accuracy (contacts included are eligible per compliance rules)
- Daily dials completed vs. list generated

**Notes:** Compliance rules are non-negotiable. Florida is the active home-state standard: 8AM–8PM local time, maximum 3 call attempts per lead per 24-hour period. As additional state licenses are added, the call list must apply that contact's state rules — not FL defaults. Reference `MC-State-Compliance-Framework-v1.md` for active state rules. AI Call Manager does not make calls; it generates and prioritizes the list. Rob works the list.

---

### 5. Atlas — Sales Assistant

**Purpose:** Support Rob during live sales activity. Helps close business, handle objections, support product framing, and narrow carrier direction in real time.

**Owner:** Rob — on-demand activation

**Trigger:** Rob activates Atlas during a live call, post-call recap need, or active sales conversation

**Cadence:** On-demand only — not scheduled, not automated

**Stop condition:** Call ends or Rob closes the conversation

**Systems touched:** ATLAS-v1-Playbook-COMPLETE.md (carrier cheat sheet, objection handling, carrier fit rules, scripts), Insurance Toolkit (for quote direction only — Rob runs the quotes)

**KPI:**
- Conversion rate on calls where Atlas is used (tracked manually)
- Carrier routing accuracy on referred cases

**Notes:**
Atlas owns: live-call objection handling, closing support, product framing, carrier direction, short post-call recap when useful.
Atlas does not own: lead intake, outreach, follow-up, COO coordination, finance, content, referrals, renewal automation, or any operations function.
Atlas stays narrow. If it is not a sales support task on an active call, it is not Atlas's job.

---

## TIER 2 — OPERATIONS CONTROL

---

### 6. Maya — COO

**Purpose:** Daily operations coordination across the full agent stack. Monitors execution, surfaces exceptions, manages task follow-up, and intervenes when automation breaks or falls out of sequence.

**Owner:** Automated daily run — Rob reviews the daily summary

**Trigger:** Daily at a fixed time; also on-demand when Rob or another agent surfaces an exception

**Cadence:** Daily operations summary + on-demand intervention

**Stop condition:** No specific stop — ongoing operational role

**Systems touched:** GHL (pipeline visibility), all live agents (monitoring), task management layer

**KPI:**
- Percentage of daily automation workflows completing without exception
- Time-to-resolution on flagged issues

**Notes:** Maya is the connective tissue of the operation. If an agent breaks, a sequence stalls, or a lead falls out of the pipeline without resolution, Maya should catch it before Rob does. Maya does not make sales decisions.

---

### 7. Pipeline Dashboard

**Purpose:** Daily visibility into the lead pipeline — what came in, what is moving, what is stalled, and what closed.

**Owner:** Automated — Rob reviews daily

**Trigger:** Daily, at a fixed reporting time

**Cadence:** Daily

**Stop condition:** Report is delivered; resets next day

**Systems touched:** GHL (pipeline data, stage history, contact records)

**KPI:**
- Pipeline velocity (leads moving stage week-over-week)
- Stale lead count (leads sitting in a stage beyond defined threshold without action)

**Notes:** This is a reporting agent, not an action agent. Its output informs Rob's daily priorities and Maya's intervention decisions. If the dashboard shows leads stalling consistently in a specific stage, that is a system or process issue — not a lead quality issue until proven otherwise.

---

## TIER 3 — POST-CLOSE AND RETENTION

---

### 8. Referral Machine

**Purpose:** Trigger a referral outreach workflow after a policy closes, while the client relationship is at its strongest.

**Owner:** Automated — Rob confirms timing

**Trigger:** Policy issued (marked closed/won in GHL)

**Cadence:** Triggered at close; follow-up sequence runs per defined cadence (typically 24–48 hours post-close, then at 30 days)

**Stop condition:** Referral is received and entered, client declines, or defined sequence window expires

**Systems touched:** GHL (contact record, pipeline, outreach), Atlas playbook (Section 17 and Section 25 for tone and language reference)

**KPI:**
- Referral ask rate (percentage of closes where referral sequence is triggered)
- Referral conversion rate (introductions received per 10 closes)

**Notes:** Referral language must follow Section 17 and Section 25 tone rules — warm, specific, non-transactional. No incentive offers. No compensation for referrals. Florida compliance applies to any follow-up outreach.

---

### 9. Brooks — CFO

**Purpose:** Weekly finance and commission tracking. Monitors revenue, commission receivables, policy counts, and business financial health.

**Owner:** Automated — Rob reviews weekly

**Trigger:** Weekly, on a fixed day

**Cadence:** Weekly

**Stop condition:** Weekly report delivered; resets next week

**Systems touched:** Commission tracking (carrier statements, CRM data), GHL (closed pipeline), financial records

**KPI:**
- Revenue MTD vs. target
- Commission receivables (submitted vs. issued vs. paid)
- Policies submitted, issued, and active per period

**Notes:** Brooks does not make sales decisions. Output informs Rob's weekly business review. Any discrepancy between submitted and issued policies should be flagged to Rob for follow-up with the carrier.

---

### 10. Renewal & Nurture Machine

**Purpose:** Maintain active client relationships post-close through scheduled policy reviews, anniversary touchpoints, and light nurture communications.

**Owner:** Automated — Rob reviews flagged clients

**Trigger:** Policy anniversary date, defined nurture cadence after issue, or client life event logged in GHL

**Cadence:** Annual review prompt at 11 months post-issue; light nurture 2–3 times per year; event-triggered as signals appear

**Stop condition:** No specific stop — ongoing for active clients; paused or removed for lapsed, cancelled, or unresponsive contacts after defined window

**Systems touched:** GHL (contact record, policy anniversary data, communication history)

**KPI:**
- Annual review completion rate (percentage of active clients contacted at anniversary)
- Retention rate at 12 months and 24 months post-issue

**Notes:** Currently active after database cleanup is completed. Nurture language must follow Section 27, Section 29, and Section 18 tone rules. No sales push in nurture sequences. The goal is retention, not re-sale.

---

## TIER 4 — GROWTH ENGINE

---

### 11. Creative Director

**Purpose:** Weekly content production for organic brand presence — social posts, short-form video scripts, educational content, and brand-consistent creative.

**Owner:** Automated — Rob reviews and approves before publish

**Trigger:** Weekly content production run

**Cadence:** Weekly

**Stop condition:** Weekly content delivered and approved; resets next week

**Systems touched:** Content calendar, social platforms (if connected), GHL (if content feeds into lead capture)

**KPI:**
- Content pieces produced per week
- Engagement rate on published content (tracked monthly)

**Notes:** Replaced Content Machine permanently. Content must align with Martinez Capital brand voice — trusted advisor, plain language, no hype. Atlas tone rules apply to any content that involves insurance guidance or product education.

---

### 12. Ad Campaign Creator

**Purpose:** Build and structure paid ad campaigns when paid traffic is active. Generates ad copy, audience targeting direction, and campaign structure.

**Owner:** Rob activates when paid traffic budget is allocated

**Trigger:** Paid traffic is active for the period

**Cadence:** Weekly when paid traffic is running; paused when it is not

**Stop condition:** Campaign is built and handed off; or paid traffic is paused

**Systems touched:** Ad platform (Facebook, Google, or other), GHL (lead capture and tracking), Lead Intake & Scoring (downstream)

**KPI:**
- Cost per lead on active campaigns
- Lead-to-conversation rate from paid traffic vs. organic

**Notes:** Ad campaigns must route leads into the same GHL intake flow as organic leads. Any ad that makes specific product claims must be reviewed for compliance before running. Do not run ads that promise specific rates or outcomes.

---

### 13. Social Prospecting

**Purpose:** Weekly scan for organic outreach opportunities — conversations, posts, or signals in social platforms that suggest a genuine coverage need.

**Owner:** Automated — Rob reviews opportunities flagged

**Trigger:** Weekly scan on defined platforms

**Cadence:** Weekly

**Stop condition:** Opportunities delivered to Rob; resets next week

**Systems touched:** Social platforms (Facebook, LinkedIn, or other), GHL (if a prospect is entered)

**KPI:**
- Opportunities identified per week
- Conversion rate from social prospect to booked conversation

**Notes:** Social prospecting is not cold outreach at scale. It is a targeted scan for real buying signals. Any outreach from social prospecting must follow Florida compliance rules and must not be automated — Rob makes the judgment call on each opportunity before contacting.

---

## SUMMARY

### Agents That Run Daily
- Lead Intake & Scoring
- First Touch Outreach
- Follow-Up Sequences
- AI Call Manager
- Maya — COO
- Pipeline Dashboard

### On-Demand Only
- Atlas — Sales Assistant (activated by Rob during live sales activity only)

### Post-Close and Retention
- Referral Machine (triggered at policy close)
- Brooks — CFO (weekly, post-close financial tracking)
- Renewal & Nurture Machine (anniversary and nurture cadence, active after database cleanup)

### Growth-Oriented
- Creative Director (weekly)
- Ad Campaign Creator (weekly when paid traffic is active)
- Social Prospecting (weekly)

---

### Unresolved Dependencies and Cleanup Items

| Item | Status | Owner | Notes |
|---|---|---|---|
| Renewal & Nurture Machine activation | Pending database cleanup | Rob / Maya | Cannot run at full cadence until active client list is cleaned in GHL |
| Ad Campaign Creator | Conditional | Rob | Only active when paid traffic budget is allocated — confirm before next run |
| Pipeline Dashboard stale lead threshold | Not yet defined | Rob | Define what counts as "stale" per stage (e.g., 5 days in First Touch with no reply = stale) |
| ETHOS carrier data in Atlas | Missing | Rob | ETHOS agent guide not yet ingested — Atlas flags ETHOS as uncertain on all questions until resolved |
| FL-specific compliance reference | Missing | Rob | General compliance rules are in place; FL-specific calling and replacement rules not yet documented in playbook |
| GI fallback carrier above $15K | Missing | Rob | Americo Eagle Guaranteed caps at $15K — no confirmed high-face GI option in current Atlas carrier stack |
| Social Prospecting platform list | Not confirmed | Rob | Define which platforms Social Prospecting scans each week |

---

*Built for Martinez Capital — Live Operation Mode — June 2026*
*Agent stack: 13 live agents across 4 tiers*
