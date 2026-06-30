# MARTINEZ CAPITAL — PIPELINE DASHBOARD STALE LEAD MONITORING SPEC
## Version 1.0 | June 2026 | Build Spec for GHL and Dashboard Layer

---

## Purpose

The Pipeline Dashboard exists to make pipeline problems visible before they become revenue problems. Its primary job is surfacing stale leads daily so Rob and Maya can take action before a lead goes cold, a follow-up window closes, or a carrier decision sits unacted on.

The dashboard does not manage leads — it reports their status against the approved thresholds. The action belongs to the owner listed for each stage.

---

## Data Source

**Primary:** GHL pipeline stage data — stage name, date lead entered stage, last activity date, contact owner, and GHL contact tags.

**Stale logic basis:** Days since last stage progression or meaningful activity (call connected, reply received, note logged, stage moved). A call attempt that did not connect does not reset the stale clock — only meaningful forward movement does.

**Refresh cadence:** Daily pull, run at 7:00 AM Eastern before Rob's call block and Maya's morning review. Results delivered via GHL report or connected dashboard (Make, GHL reporting, or equivalent).

---

## Stale Lead Monitoring Table

| Stage | Approved Threshold | Alert Format | Recipient | Required Action |
|---|---|---|---|---|
| **Inbound Lead** | 1 business day — no first touch sent | 🔴 **CRITICAL** — surfaces immediately at daily pull | Maya (primary), Rob (CC) | Confirm First Touch Outreach fired. If not, trigger manually. If still unsent after alert, Maya escalates to Rob same day. |
| **Consent Verified** | 2 business days — no call attempt logged | 🔴 **CRITICAL** — daily alert until resolved | Maya | Confirm outreach has started. If no outreach, initiate immediately. If consent record is unverifiable, flag for Rob to decide: re-verify or close out. |
| **Contact Attempted** | 7 days — no connection, 3+ daily attempts logged | 🟡 **WATCH** at day 5 → 🔴 **STALE** at day 7 | AI Call Manager (auto-move) / Maya (confirm) | At day 5: flag for awareness, continue sequence. At day 7: auto-exit active call sequence, apply Long-Drip Nurture tag in GHL. Maya confirms tag is applied. |
| **Connected** | 3 business days — no next step booked or conversation completed | 🟡 **WATCH** at day 2 → 🔴 **STALE** at day 3 | Rob | Day 2: reminder prompt — "Next step not set." Day 3: alert to Rob to make one final attempt within 24 hours, then move to Follow-Up Sequence (active, 5-day cadence) if no response. |
| **Needs Analysis** | 5 business days — no quote sent, no appointment set | 🟡 **WATCH** at day 3 → 🔴 **STALE** at day 5 | Rob | Day 3: reminder — "Quote or appointment not logged." Day 5: Rob reviews and decides: re-engage with direct outreach or move to Closed Lost. Decision must be logged in GHL within 24 hours of alert. |
| **App Submitted** | 10 business days — no carrier decision, no status update | 🟡 **WATCH** at day 7 → 🔴 **STALE** at day 10 | Maya (flag) / Rob (action) | Day 7: Maya flags for carrier follow-up. Day 10: Rob contacts carrier directly. Status update must be logged in GHL within 48 hours of stale alert. |
| **In Review** | 5 business days after carrier follow-up triggered — still no update | 🔴 **CRITICAL** — immediate alert | Rob | Rob calls carrier directly. If no resolution within 2 additional business days, escalate to carrier supervisor or E&O contact. Log every attempt in GHL. |
| **Approved** | 5 business days — no issued policy, no signed return | 🟡 **WATCH** at day 3 → 🔴 **STALE** at day 5 | Rob | Day 3: prompt to confirm next step with client. Day 5: Rob contacts client directly to resolve pending items. If client is unresponsive at day 7, Maya flags as at-risk. |
| **Issued / Funded** | No stale threshold | No stale alert | N/A | Trigger Referral Machine and onboarding sequence on close. Dashboard tracks as a closed win — no stale logic. |
| **Not Interested** | Immediate on status change | No alert — confirmation only | Maya | Maya confirms Do Not Contact tag is applied and lead is suppressed from all active sequences. 90-day re-evaluation queue tag applied. No further alerts until 90-day mark. |

---

## Alert Format Key

| Color / Label | Meaning | Action Urgency |
|---|---|---|
| 🔴 CRITICAL | Threshold exceeded or lead at immediate risk | Same-day action required |
| 🟡 WATCH | Approaching threshold — early warning | Action within 24 hours |
| ✅ CLEAR | Within threshold, no action needed | No action |
| ⚪ CLOSED | Issued, not interested, or closed lost — no stale logic | Pipeline tracking only |

---

## Escalation Logic

When a stale alert fires and no action is logged within the required window, the following escalation sequence applies:

**Day 1 of stale alert — no action logged:**
Maya sends a direct notification to Rob: "[Lead name] in [Stage] has been stale for [X] days. Action required today."

**Day 2 of stale alert — still no action logged:**
Maya flags the lead in the daily operations summary as an outstanding item. Rob must address it in the same session or provide a logged reason for delay (e.g., waiting on client, carrier hold confirmed).

**Day 3 of stale alert — still no action logged:**
Lead is auto-moved to its default next state (see table above) and tagged accordingly in GHL. Rob receives a final notification: "[Lead name] has been moved to [next state] after [X] days with no action."

**No exceptions to the day-3 escalation auto-move**, except:
- Stage-specific exceptions documented in MC-Stale-Lead-Thresholds-v1.md (carrier-imposed hold, client-requested delay with confirmed future date)
- Rob has logged a manual hold reason in GHL with an expected resolution date

Auto-moves are logged in GHL as a system note: "Moved to [next state] by stale lead threshold — [date]."

---

## Stage-Specific Dashboard Exceptions

**Contact Attempted — bad contact info:**
If the phone number is logged as disconnected or invalid before day 7, the lead is surfaced as 🔴 CRITICAL immediately — not at day 7. Maya flags for alternate contact attempt or Closed Lost.

**Needs Analysis — client-requested delay:**
If a future contact date is logged in GHL, the stale clock is suspended. Dashboard shows ✅ CLEAR with the scheduled follow-up date displayed. Stale logic resumes if the contact date passes with no activity.

**App Submitted — carrier-confirmed timeline:**
If Rob has logged a confirmed carrier review timeline in GHL, the stale threshold adjusts to match. Dashboard shows 🟡 WATCH at 2 days before the carrier's stated deadline, not at day 7.

**90-Day Re-evaluation queue:**
Leads in this tag are suppressed from the daily stale alert. At 90 days, the dashboard surfaces a single 🟡 WATCH alert: "[Lead name] — 90-day re-evaluation due. Rob to decide: re-engage or close permanently."

---

## Implementation Notes for GHL Build

- **Stale clock field:** Calculate from `date_entered_stage` or `last_meaningful_activity_date` — whichever is more recent. A call attempt that did not connect does not reset the clock. A connected call, a reply, a logged next step, or a stage move does.
- **Tags to create in GHL:** Long-Drip Nurture, Do Not Contact, 90-Day Re-evaluation, Carrier Hold, Client-Requested Delay, Stale — Pending Rob Decision
- **Automation triggers:** Stage age >= threshold → apply stale tag → notify recipient → log system note
- **Daily report delivery:** 7:00 AM Eastern, delivered to Rob and Maya via GHL report, email summary, or Make webhook to notification channel
- **Dashboard display:** Group by alert level (CRITICAL first, then WATCH, then CLEAR) within each stage. Total stale count displayed at top of report.

---

*Built for Martinez Capital — Live Operation Mode — June 2026*
*Attach to MC-Stale-Lead-Thresholds-v1.md and MC-Live-Operations-Map-v1.md*
*Implement in GHL pipeline settings and dashboard/reporting layer*
