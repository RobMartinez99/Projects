# MARTINEZ CAPITAL — STATE COMPLIANCE FRAMEWORK
## Version 1.0 | June 2026 | Florida Active | Multi-State Expansion Ready

---

## HOW THIS DOCUMENT IS STRUCTURED

This framework has three layers:

**Layer 1 — Federal Baseline:** Rules that apply in every state regardless of license. All outreach must meet these minimums.

**Layer 2 — State-Specific Rules:** One entry per licensed state. Florida is the current active entry. Additional states are appended here as licensed.

**Layer 3 — Expansion Protocol:** What to do when a new state license is added.

All outreach agents and Atlas reference this document. When a contact's state differs from Florida, the rules for that contact's state apply — not FL defaults.

---

## LAYER 1 — FEDERAL BASELINE

Applies to all outreach in all states at all times.

**TCPA (Telephone Consumer Protection Act):**
- Prior express written consent is required before sending automated or pre-recorded calls or texts to a cell phone.
- Manual outbound calls to cell phones without consent are permitted under TCPA, but state rules may be stricter — always check the state entry.
- Consent must be documented. If consent cannot be confirmed, do not call or text.

**Federal DNC Registry:**
- Check the National Do Not Call Registry before calling any number that has not been contacted in the prior 31 days.
- Scrub against the federal DNC list at minimum every 31 days.
- Established business relationship (EBR) exception applies only if the lead has an existing relationship with Martinez Capital — it does not apply to cold or purchased lists.

**CAN-SPAM (Email):**
- All commercial email must include a valid physical address and a working opt-out mechanism.
- Opt-out requests must be honored within 10 business days.
- Subject lines must not be deceptive.

**Opt-Out / Stop Requests:**
- Any stop, opt-out, do not call, or remove me request received via any channel must be honored immediately.
- The contact must be suppressed from all outreach within the same business day.
- No grace period. No follow-up to confirm the opt-out.

---

## LAYER 2 — STATE-SPECIFIC RULES

---

### ACTIVE STATE: FLORIDA

**License status:** Active home-state license

**Last reviewed:** June 2026

**Licensed confirmation source:** *Pending — rules below are enforced in practice and consistent with FL statutes; licensed confirmation from carrier compliance desk, E&O carrier, or FL Department of Financial Services required before volume scaling.*

---

#### 1. Scope

This reference governs all outbound telephone and SMS contact with leads and clients located in Florida by Martinez Capital agents, automated systems, and outreach sequences.

It applies to:
- All outbound calls to Florida numbers
- All outbound SMS messages to Florida numbers
- All automated follow-up sequences contacting Florida leads

It does not apply to inbound contacts initiated by the client or lead.

---

#### 2. Calling Hours

**Rule:** Outbound calls to Florida leads and clients may only be made between **8:00 AM and 8:00 PM Florida local time (Eastern Time).**

**Status:** Enforced in practice. Consistent with FL Statute §501.616 governing commercial telephone solicitation.

**Application:**
- The AI Call Manager must filter all call lists to contacts in the Florida time zone and enforce the 8AM–8PM window before generating the daily list.
- No outbound calls may be initiated outside this window, regardless of the agent's local time.
- Voicemail left outside these hours by an automated system is not permitted; a human agent leaving a voicemail on a manually dialed call should be confirmed with a licensed source.

**Open question:** Confirm whether the 8AM–8PM window applies equally to SMS outreach under FL statute or whether a different window governs text messages.

---

#### 3. Call Frequency Limits

**Rule:** No more than **3 outbound call attempts per lead per 24-hour period** on the same matter or issue.

**Status:** Enforced in practice. Consistent with FL Statute §501.616 governing call frequency limits for commercial telephone solicitation.

**Application:**
- The AI Call Manager enforces the 3-call limit before generating the daily call list.
- A call attempt counts regardless of whether the call was answered, went to voicemail, or rang without answer.
- The 24-hour period resets from the time of the first call attempt — not at midnight.
- Calls made by Rob manually and calls made by automated systems both count toward the limit.

**Open question:** Confirm whether the 3-call limit applies to SMS messages as well, or only to telephone calls. Also confirm whether a call and an SMS in the same 24-hour period count toward the same limit or are tracked separately.

---

#### 4. Consent Standard

**Rule:** Prior consent is required before sending automated or marketing text messages. Manual calls to leads who have submitted a lead form or made an inbound inquiry are generally permissible under an established interest standard, but consent documentation is best practice and required for any automated texting.

**Status:** Partially enforced. Consent is treated as mandatory before texting. Manual call consent standards pending licensed confirmation.

**Application:**
- Any lead who submits a form, requests a quote, or initiates contact is treated as having expressed interest — this supports outbound manual calling.
- For automated SMS sequences: prior express written consent is required. Leads acquired through lead forms must have opted into receiving text messages at the point of form submission. Confirm that lead sources capture and document this consent.
- Consent records must be retained. If a lead source does not document consent for SMS, do not add those leads to automated text sequences.

**Open question:** Confirm consent requirements for Florida specifically under the FL Telemarketing Act vs. TCPA for: (a) manual calls to purchased lists, (b) automated calls to leads who submitted forms, (c) automated SMS to leads who submitted forms.

---

#### 5. DNC / Opt-Out Handling

**Federal DNC:** Scrub against the National DNC Registry before contacting any number not previously contacted within 31 days. Scrub cycle must not exceed 31 days.

**Florida DNC:** Florida maintains its own Do Not Call list. Scrub against the FL DNC list in addition to the federal list. *(Status: pending confirmation of current FL DNC registry access and scrub requirements — confirm with licensed source.)*

**Internal opt-out / stop requests:**
- Any request to stop contact — by phone, text, email, or any other channel — must be honored the same business day.
- The contact must be tagged in GHL with a Do Not Contact status immediately.
- No follow-up sequence, no confirmation text, no additional outreach of any kind after a stop request is received.
- Internal opt-out list must be maintained and checked before any new outreach campaign or list is contacted.

---

#### 6. What Outbound Agents Must Confirm Before Contacting a Lead

Before any outbound contact — call or text — the following must be confirmed:

- [ ] Contact's state is Florida (or the applicable licensed state)
- [ ] Current time is between 8AM and 8PM Florida local time
- [ ] Contact has not already received 3 call attempts in the past 24 hours
- [ ] Contact is not on the federal DNC registry (scrubbed within 31 days)
- [ ] Contact is not on the FL state DNC list
- [ ] Contact has not submitted a stop or opt-out request (check GHL Do Not Contact tag)
- [ ] For automated SMS: consent to receive text messages is documented at the lead source

All six checks must pass before outreach proceeds. The AI Call Manager handles the time window and call frequency checks automatically. DNC scrubbing and consent verification must be confirmed at the system level before lists are uploaded.

---

#### 7. What Outbound Agents Must Not Do

- Call before 8AM or after 8PM Florida local time
- Make more than 3 call attempts to the same lead within any 24-hour period
- Send automated text messages to leads who have not consented to receive them
- Contact any lead or client who has submitted a stop or opt-out request
- Use deceptive or misleading identification on outbound calls (caller ID must accurately represent Martinez Capital)
- Make specific rate promises, coverage guarantees, or benefit claims in outbound outreach that are not confirmed in the carrier documentation
- Initiate replacement conversations without the required disclosure (see replacement disclosure — open item below)

---

#### 8. Source of Truth

| Rule | Current Source | Confirmation Status |
|---|---|---|
| 8AM–8PM calling hours | FL Statute §501.616 | Enforced in practice — licensed confirmation pending |
| 3-call / 24-hour limit | FL Statute §501.616 | Enforced in practice — licensed confirmation pending |
| TCPA consent for automated calls/SMS | 47 U.S.C. §227 | Federal standard — apply in all states |
| Federal DNC registry | FTC / 16 CFR Part 310 | Federal standard — apply in all states |
| FL state DNC registry | FL Statute §501.059 | Pending confirmation of access and scrub process |
| Replacement disclosure requirements | FL Insurance Code | Pending — FL-specific replacement disclosure form not yet documented |
| Telemarketing registration | FL Statute §501.601 | Pending — confirm whether Martinez Capital requires FL telemarketing registration |

---

#### 9. Open Questions Requiring Licensed Confirmation

The following items are not confirmed against a licensed compliance source. They must be resolved before outreach volume is scaled.

1. **FL DNC registry:** Confirm access to FL state DNC list and required scrub frequency. Confirm whether it is mandatory in addition to the federal DNC.
2. **SMS calling hours:** Confirm whether the 8AM–8PM window applies to SMS under FL statute, or whether a separate window governs text messages.
3. **Call vs. SMS frequency:** Confirm whether the 3-call limit covers SMS attempts in addition to telephone calls, or whether they are tracked separately.
4. **Consent for automated calls to inbound leads:** Confirm the standard for automated calls (not just SMS) to leads who submitted a form or requested a quote.
5. **Consent for purchased lists:** Confirm permissible outreach standards for leads acquired from purchased or third-party lists under FL law.
6. **Replacement disclosure:** Confirm whether FL requires a specific replacement disclosure form when a client is replacing an existing life insurance policy. Identify the correct form and add to Atlas Section 24.
7. **Telemarketing registration:** Confirm whether Martinez Capital is required to register under the FL Telemarketing Act.

**Who to contact for confirmation:** Carrier compliance desk (primary), E&O carrier, or FL Department of Financial Services (licensed insurance compliance inquiry).

---

## LAYER 3 — EXPANSION PROTOCOL

When a new state license is added, follow this sequence:

1. Create a new state entry in Layer 2 of this document using the same section structure as the Florida entry (scope, calling hours, call frequency limits, consent standard, DNC/opt-out, confirmation checklist, prohibited actions, source of truth, open questions).
2. Research and document state-specific rules before the first outreach contact in that state.
3. Confirm rules against a licensed source before scaling outreach volume.
4. Update the AI Call Manager to apply the new state's calling hours and call frequency limits for contacts in that state.
5. Update GHL to tag contacts by state so outreach rules are applied correctly by contact location, not by Rob's location.
6. Notify Maya to confirm the new state entry is active and the outreach agents are referencing it.

Do not default to FL rules for contacts in a new state. Each state entry governs contacts in that state.

---

## READY-TO-USE CHECKLIST — OUTREACH TEAM

Before starting any outbound calling or texting session:

- [ ] I know what time it is in Florida — it is between 8AM and 8PM
- [ ] My call list has been generated by AI Call Manager with the 3-call/24-hour limit enforced
- [ ] The list has been DNC-scrubbed within the past 31 days (federal)
- [ ] FL state DNC scrub is confirmed *(pending — use federal scrub until FL process is confirmed)*
- [ ] I am not contacting anyone who has submitted a stop or opt-out request
- [ ] Any automated text sequences are running only to leads who consented to receive SMS
- [ ] If I am in a new state: I have confirmed which state entry applies and am not defaulting to FL rules

If any item cannot be confirmed, stop and resolve it before making outreach contact.

---

*Built for Martinez Capital — Florida Active | Multi-State Expansion Ready — June 2026*
*Pending licensed compliance confirmation on items listed in Section 9 before volume scaling*
