# MARTINEZ CAPITAL — RENEWAL & NURTURE DATABASE CLEANUP PLAN
## Version 1.0 | June 2026 | Pre-Activation Requirement

---

## Purpose

The Renewal & Nurture Machine cannot run against an unclean database. Stale contacts waste credits, reduce deliverability scores, and risk contacting people who have opted out or should not receive outreach. This plan defines what to clean, how to clean it, who owns each step, and what must be true before the machine goes live.

Execute this plan in GHL. Complete all steps before activating the Renewal & Nurture Machine.

---

## Scope

All contacts currently in GHL — regardless of pipeline stage, source, or date added. No contact is assumed clean until verified.

---

## Cleanup Table

| # | Cleanup Item | Action | Owner | Disposition | Reason |
|---|---|---|---|---|---|
| 1 | **Duplicate contacts** | Search GHL for duplicate phone numbers and duplicate email addresses. Merge duplicates into a single contact record. Keep the record with the most complete information and most recent activity as the primary. | Maya | Merge | Duplicate records cause double-outreach, split activity history, and inaccurate pipeline counts. Merge before any tag or status work begins. |
| 2 | **Missing or invalid phone numbers** | Filter contacts with no phone number or an invalid format (fewer than 10 digits, non-US format). Flag for Rob review. If no valid contact info can be confirmed, suppress. | Maya | Suppress or archive | Contacts without a valid phone number cannot be called. Keeping them in active lists inflates pipeline counts and wastes sequence slots. |
| 3 | **Missing or invalid email addresses** | Filter contacts with no email or an invalid format (no @ symbol, obvious test entries, bounce history). Suppress from email sequences. Retain in GHL if phone is valid. | Maya | Suppress from email — retain if phone valid | Bad email addresses damage deliverability scores and generate bounce events. Remove them from email sequences even if the contact is otherwise valid. |
| 4 | **Opted-out / Do Not Contact contacts** | Search for any contact who has replied STOP, requested no contact, or was tagged Do Not Contact. Confirm the tag is applied and the contact is suppressed from all sequences. | Maya | Suppress — Do Not Contact tag required | Contacting an opted-out record is a compliance violation. This step is non-negotiable before any sequence goes live. |
| 5 | **Unsubscribed email contacts** | Identify contacts who unsubscribed from email at any point. Confirm they are suppressed from all email sequences. Retain in GHL for phone outreach if phone is valid and no opt-out was given. | Maya | Suppress from email — retain for phone if applicable | Email unsubscribe does not equal do-not-call. Keep the record for phone use unless a full opt-out was given. |
| 6 | **Test contacts and internal records** | Search for contacts created for testing (test@, [email protected], internal team numbers). Delete entirely. | Maya | Delete | Test records pollute reporting, inflate counts, and should not receive any outreach. No archiving — delete. |
| 7 | **Contacts with no activity in 12+ months** | Filter contacts with last activity date older than 12 months and no policy on record. Flag for Rob review. Rob decides: final re-engagement attempt or archive. | Rob | Archive or one-touch re-engagement | Contacts with no activity in 12 months are very unlikely to convert. They also represent deliverability risk if emailed at volume. Rob decides whether to attempt one final touch before archiving. |
| 8 | **Leads marked Closed Lost with no tag** | Find contacts in Closed Lost stage that have no tag explaining why (e.g., not interested, bad info, unreachable). Apply the correct tag so they are not accidentally re-entered into active sequences. | Maya | Tag and archive | Untagged Closed Lost records may re-enter active sequences if tags are used as sequence entry criteria. Apply the tag and confirm exclusion. |
| 9 | **Active clients — policy status unconfirmed** | Filter contacts who appear to be clients (policy sold, in nurture, or post-close) but whose active policy status is not confirmed in GHL. Rob confirms active policy status for each. Apply Active Client tag if confirmed. Move to Closed Lost if not. | Rob | Confirm and tag: Active Client or Closed Lost | The Renewal & Nurture Machine runs only against Active Clients. Any client whose status is unconfirmed must be resolved before the machine goes live. |
| 10 | **Active clients — missing key fields** | For confirmed Active Clients: verify that carrier name, policy number, issue date, face amount, and beneficiary name are logged in GHL. Flag incomplete records for Rob to fill in. | Rob | Complete record — required fields only | The Renewal & Nurture Machine uses these fields to personalize outreach and trigger anniversary sequences. Incomplete records produce generic or broken messages. |
| 11 | **Leads currently in active sequences** | Identify any contacts who are simultaneously in an active sales sequence AND would qualify for the Renewal & Nurture Machine. These must not be in both at the same time. | Maya | Keep in active sales sequence — exclude from nurture until sequence ends | Running a lead through both a sales sequence and a nurture sequence at the same time produces conflicting messages and compliance risk. Sales sequence takes priority. |
| 12 | **Pipeline stage mismatches** | Contacts whose GHL pipeline stage does not match their actual status (e.g., a closed-won client still showing in Needs Analysis). Correct the stage to match the actual record. | Maya | Correct pipeline stage | Inaccurate stage assignments break Pipeline Dashboard reporting and may cause the wrong sequences to fire. Fix before enabling any new automation. |
| 13 | **Tag audit** | Review all existing GHL tags. Remove duplicate or redundant tags (e.g., "do not call" and "DNC" and "Do Not Contact" all meaning the same thing). Standardize to the tag set defined in MC-Stale-Lead-Thresholds-v1.md. | Maya | Standardize — merge redundant tags | Redundant tags cause sequence logic errors. One tag per concept. |
| 14 | **Source field standardization** | Confirm that every contact has a lead source logged (Facebook ad, organic, referral, purchased list, inbound call, etc.). Fill in "Unknown" where source is genuinely not determinable. | Maya | Standardize — fill blanks | Lead source data is required for accurate ROI reporting by the Pipeline Dashboard and Brooks. Blank source fields make tracking impossible. |
| 15 | **Prospects to exclude from nurture** | Contacts in active sales flow (Inbound Lead through App Submitted) must be excluded from the Renewal & Nurture Machine. Confirm that no active prospect will receive a nurture sequence. | Maya | Exclude — sales flow contacts stay out of nurture | Sending a nurture message to a prospect mid-sales conversation is confusing and potentially undermines the sale. Hard exclude all active pipeline stages from nurture. |

---

## Field Standardization Requirements

Before go-live, confirm these fields are present and correctly formatted for every Active Client record:

| Field | Required Format | Notes |
|---|---|---|
| First name | Title case | No all-caps, no abbreviations |
| Last name | Title case | Same |
| Phone number | 10-digit US format | (XXX) XXX-XXXX or +1XXXXXXXXXX — GHL formats on save |
| Email | Valid format | Suppressed if bounced or unsubscribed |
| Lead source | One of the defined source values | No blanks |
| Pipeline stage | Matches actual contact status | Correct before go-live |
| Active Client tag | Applied | Required for nurture machine entry |
| Carrier name | Full carrier name, not abbreviation | Required for personalized outreach |
| Policy number | As issued | Required for anniversary triggers |
| Policy issue date | MM/DD/YYYY | Required for anniversary triggers |
| Do Not Contact tag | Applied where applicable | Required for compliance |

---

## Go-Live Condition

The Renewal & Nurture Machine activates only when all of the following are true:

- [ ] All duplicate contacts are merged
- [ ] All invalid phone and email contacts are suppressed or archived
- [ ] All Do Not Contact and unsubscribed contacts are tagged and suppressed from all sequences
- [ ] All test and internal contacts are deleted
- [ ] All Closed Lost contacts are tagged and excluded from active sequences
- [ ] Rob has reviewed all contacts with 12+ months of no activity and made a disposition decision (re-engage or archive)
- [ ] All Active Clients are confirmed by Rob and tagged with the Active Client tag
- [ ] All Active Client records have the five required fields completed: carrier name, policy number, issue date, face amount, beneficiary name
- [ ] No Active Client is simultaneously in an active sales sequence
- [ ] All pipeline stages are corrected to reflect actual contact status
- [ ] Tag library is standardized — one tag per concept, redundant tags merged
- [ ] All Active Clients are confirmed to be in the correct pipeline stage (Issued / Funded)
- [ ] Maya has confirmed to Rob in writing that all checklist items above are complete

When Maya confirms the checklist is complete, Rob approves activation. Renewal & Nurture Machine goes live on Active Clients only.

---

## Estimated Cleanup Sequence

Execute in this order to avoid rework:

1. Delete test records (step 6)
2. Merge duplicates (step 1)
3. Standardize tags (step 13)
4. Apply Do Not Contact and unsubscribe suppressions (steps 4 and 5)
5. Fix pipeline stage mismatches (step 12)
6. Suppress invalid phone and email (steps 2 and 3)
7. Tag and archive Closed Lost records (step 8)
8. Rob reviews 12-month inactive contacts (step 7)
9. Rob confirms Active Client status and completes required fields (steps 9 and 10)
10. Confirm no Active Client is in an active sales sequence (step 11)
11. Standardize lead source fields (step 14)
12. Confirm prospect exclusion from nurture (step 15)
13. Maya delivers go-live confirmation to Rob

---

*Built for Martinez Capital — Live Operation Mode — June 2026*
*Attach to MC-Live-Operations-Map-v1.md and MC-Resolution-Pack-v1.md (Blocker 3)*
*Do not activate Renewal & Nurture Machine until go-live checklist is signed off by Rob*
