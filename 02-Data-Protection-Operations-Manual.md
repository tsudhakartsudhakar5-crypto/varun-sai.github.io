# VARUN SAI Author Website
## Data Protection & Privacy Operations Manual

**Version:** 1.0 — internal draft  
**Prepared:** 11 November 2026  
**Responsible operator:** Parent/guardian-operated website administration  
**Privacy contact:** tsudhakartsudhakar5@gmail.com

## 1. Purpose and scope
This manual describes practical procedures for contact messages, Reader's Corner feedback, polls, administrator access, privacy requests, incidents and provider oversight. It applies to the author website and its connected Supabase project. It does not apply to the separate VARUN SAI BOOKSTORE.

## 2. Roles
- **Responsible operator:** parent/guardian overseeing the website, privacy decisions and access to private records.
- **Author/content contributor:** provides public content; should not receive unnecessary access to private visitor records.
- **Administrator:** an individually authorised account whose user ID is present in `public.admin_users`.
- **Service providers:** hosting and backend providers that may process technical or submitted information.

Keep administrator accounts limited to people who genuinely need access. Never share passwords or service-role keys.

## 3. Data inventory

| Feature | Data observed/expected | Purpose | Access |
|---|---|---|---|
| Contact form | Name, email, subject, message | Respond to enquiry | Authorised admin |
| Reader's Corner | Name, optional email, message, moderation status | Receive and moderate reader feedback | Authorised admin; public only after approval |
| Poll voting | Poll ID, option ID, protected voter hash | Count votes and limit repeat voting | Controlled RPC; aggregate public results |
| Public content | Articles, quotes, announcements, poll metadata/options | Display public content | Public according to RLS visibility |
| Admin | Supabase authentication identity and admin membership | Manage website content | Authorised admin |

Technical logs and provider-side metadata may also exist. Their exact fields and retention periods have not yet been independently inspected.

## 4. Data-flow controls
### Contact form
The frontend calls `submit_contact`. The reviewed function validates name, email, subject and message lengths/formats, uses a honeypot and applies a global rate limit before inserting a contact record. Direct public table access is not shown in the grants/policies supplied. Admin read/update/delete policies call `private.is_admin()`.

### Reader's Corner
The frontend calls `submit_feedback`. The reviewed function validates fields, uses a honeypot and applies a global rate limit. The public retrieval function returns only approved feedback and does not return email. Verify that the database default status is pending before relying on that behavior.

### Polls
The browser stores a client token. `cast_vote` combines the token with a private pepper and poll ID to derive a hash; the reviewed function inserts the hash, not the raw token, into `poll_votes`. Duplicate votes are prevented by an `ON CONFLICT` path, subject to the expected unique constraint. Public results are aggregates. Describe the process as pseudonymous, not absolutely anonymous.

## 5. Access management
- Maintain an up-to-date list of authorised administrators.
- Use individual accounts and strong unique passwords.
- Enable multi-factor authentication where available.
- Remove access promptly when an administrator no longer needs it.
- Never place service-role keys, database passwords or admin credentials in frontend files.
- Review Supabase authentication settings and leaked-password protection.
- Verify that `admin_users` cannot be modified by ordinary authenticated users or public functions.

## 6. Proposed retention schedule
These are internal review targets, not claims about statutory retention periods. Confirm actual operational and backup behavior before adopting them.

| Record | Proposed handling |
|---|---|
| Resolved contact enquiry | Review for deletion within 12 months |
| Unresolved enquiry | Retain while needed to resolve it |
| Spam/test submission | Delete as soon as practical |
| Rejected feedback | Review for deletion within 12 months |
| Approved feedback | Retain while publication remains intended and appropriate |
| Poll votes | Retain only as long as needed for poll integrity/results; establish a documented schedule |
| Security/provider logs | Verify provider retention and document it |

Deletion from the live table may not immediately remove provider backups or logs. Do not promise immediate permanent erasure until those systems are checked.

## 7. Handling privacy requests
1. Receive the request at the privacy email.
2. Record date, request type and relevant feature.
3. Ask only for proportionate information needed to locate the record.
4. Verify authority without collecting excessive identity documents.
5. Locate the relevant record and assess legal/operational retention needs.
6. Complete the action where appropriate, or explain why it cannot be completed.
7. Record the outcome and close the request.

Suggested internal service targets: acknowledge within 3 working days and aim to resolve within 30 days. These are proposed operational targets, not statutory deadlines.

## 8. Grievance handling
Maintain a restricted grievance register. Record receipt date, category, responsible reviewer, actions, response date and closure. Do not put unnecessary personal data into the register.

## 9. Personal data breach / security incident
1. Preserve relevant evidence and timestamps.
2. Restrict compromised accounts, tokens or access paths.
3. Notify the responsible operator immediately.
4. Determine what information and people may be affected.
5. Obtain legal/provider advice on applicable notification duties and timelines.
6. Notify affected people or authorities when legally required.
7. Document containment, remediation and lessons learned.
8. Do not delete evidence before the incident review is complete.

## 10. Children's privacy
- Keep public browsing account-free unless a separate review approves a change.
- Do not collect age, school, home address or other child details unless strictly necessary and legally reviewed.
- Do not publish private details about the minor author.
- Do not introduce reader accounts or child-directed profiling without a fresh privacy and safeguarding assessment.
- Moderate public submissions to remove personal or sensitive details.

## 11. Provider register
Maintain provider name, service, data processed, account owner, contract/terms link, region where known, security settings, retention information and review date. Current known providers include GitHub Pages and Supabase. Verify any additional analytics, fonts, embeds, email delivery or third-party scripts from the live site.

## 12. Review schedule
Review this manual:
- before adding accounts, analytics, newsletters, payments or new forms;
- after a security incident or material provider change;
- whenever the website's data flows change; and
- at least annually.

## 13. Current open items
- Verify function owners and EXECUTE grants.
- Verify `private` schema and `private.secrets` access.
- Confirm feedback default status.
- Test anonymous direct access denial for private tables.
- Test scheduled poll/option visibility and quote publication timing.
- Confirm provider logs, backups and deletion behavior.
- Run the live acceptance tests in the testing report.

**Approval record:** Leave unsigned until the responsible operator reviews and adopts the procedures.
