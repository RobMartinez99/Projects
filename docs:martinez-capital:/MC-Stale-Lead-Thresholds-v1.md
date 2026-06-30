# MARTINEZ CAPITAL — STALE LEAD THRESHOLDS
## Version 1.0 | June 2026 | Decision Document

---

## Stale Lead Threshold Table

| Pipeline Stage | Stale Threshold | Action When Stale | Next State | Owner | Rationale |
|---|---|---|---|---|---|
| **Inbound Lead** | 1 business day with no first touch sent | Trigger First Touch Outreach immediately; flag if still unsent after 1 day | Remains in Inbound Lead until touched; escalated to Maya if no touch | Maya | A lead that has not received a first touch within 24 business hours is bleeding out. Speed-to-contact is the single biggest driver of connection rate. No exceptions. |
| **Consent Verified** | 2 business days with no call attempt logged | Flag for manual review; confirm consent record is valid and outreach has started | Move to Contact Attempted if outreach begins; close out if consent is unverifiable | Rob / Maya | Once consent is confirmed, the lead is warm and ready to contact. A 2-day gap here is a process failure, not a lead quality issue. |
| **Contact Attempted** | 7 days with no connection after 3+ call attempts per day | Exit active call sequence; move to long-drip nurture with reduced cadence | Long-Drip Nurture (GHL tag) | AI Call Manager / Maya | Seven days of 3-call-per-day attempts is 21 touches. If there is no connection after that volume, the lead is either unresponsive or the contact info is bad. Continuing the same sequence produces diminishing returns and compliance risk. |
| **Connected** | 3 business days with no next step booked or no conversation completed | One additional attempt within 24 hours; if no response, move to follow-up sequence with a 5-day cadence | Follow-Up Sequence (active) | Follow-Up Sequences agent | A connected lead who goes quiet within 3 days is still warm. They picked up once — they may pick up again. Give one more active attempt before shifting to a slower cadence. |
| **Needs Analysis** | 5 business days with no quote sent and no appointment scheduled | Flag for Rob review; determine if the conversation is still live or needs re-engagement | Re-engagement sequence or Closed Lost (Rob decides) | Rob | If five days have passed since a needs analysis conversation with no follow-through, something stalled. Rob makes the judgment call — some of these are still closeable; some are done. |
| **App Submitted** | 10 business days with no carrier decision and no status update from Rob | Carrier follow-up triggered; Rob notified to check application status | Remains in App Submitted with active carrier follow-up flag | Rob / Maya | Carrier underwriting typically runs 5–10 business days for simplified issue. At 10 days with no update, Rob or Maya should be following up with the carrier — not waiting. |
| **In Review** | 5 business days with no carrier update after follow-up was triggered | Escalate to Rob for manual carrier contact | Remains In Review with escalation flag | Rob | If a follow-up was triggered and still no update in 5 more days, Rob needs to call the carrier directly. This stage should not hold a lead for more than 15 total business days without a decision. |
| **Approved** | 5 business days with no issued policy and no signed app returned | Contact client to confirm next step; flag if no response | Remains Approved with active client follow-up | Rob | An approved application that has not issued within 5 business days usually means paperwork is pending or the client has questions. Rob follows up — approved is not done until the policy is issued. |
| **Issued / Funded** | No stale threshold — this stage is a closed win | Trigger Referral Machine and onboarding sequence | Active Client (GHL tag) | Referral Machine / Renewal & Nurture Machine | A funded policy is a closed win. The lead is no longer in sales flow — they enter the client retention system. No stale logic applies here. |
| **Not Interested** | Immediate — lead exits active sales flow on status change | Suppress from all active outreach sequences; retain in GHL for 90-day re-evaluation | Closed Lost / 90-Day Re-evaluation queue | Maya | A clear "not interested" response ends active outreach immediately. Compliance-wise, continued outreach after a stated disinterest is a risk. At 90 days, Rob can decide whether to make one more attempt or close permanently. |

---

## Stage-Specific Exceptions

**Contact Attempted — bad contact info:**
If a lead's phone number is disconnected or email bounces before the 7-day threshold, do not run the full sequence. Flag immediately, attempt one alternate contact method if available, and move to Closed Lost if no valid contact info can be confirmed.

**Needs Analysis — client-requested delay:**
If the client explicitly asked to be contacted at a future date ("call me next week," "check back in a month"), the stale threshold is suspended until that date passes. Resume normal logic if they are unresponsive after the agreed follow-up date.

**App Submitted — carrier-imposed hold:**
If the carrier has communicated a specific review timeline (e.g., "we'll have a decision in 15 business days"), the stale clock adjusts to match that timeline. Do not flag as stale mid-carrier-review if a timeline has been confirmed.

**Not Interested — 90-day re-evaluation:**
A lead in the 90-day re-evaluation queue is not in active outreach. At 90 days, Rob reviews manually. If no outreach is made, the lead moves to permanent Closed Lost. There is no automated re-engagement from this queue — Rob makes the call.

---

## Approved Operating Rule

A lead becomes stale when it has exceeded the defined threshold for its current pipeline stage with no meaningful forward movement — no connection, no conversation, no next step, no carrier update. When a lead goes stale, it does not simply sit — it moves. Uncontacted leads in Inbound move immediately to first touch. Unresponsive leads in Contact Attempted move to long-drip nurture. Stalled leads in Needs Analysis or Approved get flagged for Rob's manual review and a direct decision. Leads who have clearly disengaged or said no move to Closed Lost or the 90-day re-evaluation queue. The Pipeline Dashboard surfaces stale leads daily. Maya owns the escalation path. Rob makes the final call on anything that requires a human judgment. No lead sits in an active stage past its threshold without an action on record.

---

*Built for Martinez Capital — Live Operation Mode — June 2026*
*Attach to MC-Live-Operations-Map-v1.md and GHL pipeline stage settings*
