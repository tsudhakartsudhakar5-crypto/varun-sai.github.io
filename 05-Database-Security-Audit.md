# VARUN SAI Author Website — Database Security Audit

**Date:** 11 November 2026  
**Scope:** Supplied frontend source, five RPC definitions, Supabase table grants, RLS policy expressions and `private.is_admin()` definition supplied by the operator.  
**Method:** Read-only review of supplied evidence. No database changes or live penetration tests were performed.

## 1. Evidence reviewed
- Frontend source archive `varun-sai.github.io-main (2).zip`.
- RPC definitions: `submit_contact`, `submit_feedback`, `get_approved_feedback`, `cast_vote`, `get_poll_results`.
- Table grants for `admin_users`, `contact_messages`, `poll_options`, `poll_votes`, `polls`, `reader_feedback`.
- RLS policies for admin/content/contact/feedback/poll tables.
- `private.is_admin()` definition.

## 2. Positive findings
- RLS was reported enabled for reviewed tables.
- `contact_messages` and `reader_feedback` have no displayed anon SELECT policy.
- Admin operations use `private.is_admin()` in their RLS policy expressions.
- `admin_users` authenticated SELECT policy restricts a user to their own row.
- `poll_votes` has no displayed anon/authenticated table grants and no RLS policies; direct table access is therefore not granted by the supplied grant output.
- `submit_contact` and `submit_feedback` validate fields server-side and use honeypots.
- `get_approved_feedback` returns approved records only and omits email.
- `cast_vote` derives a peppered hash from poll ID and browser token rather than inserting the raw token into `poll_votes`.
- `get_poll_results` returns aggregate totals and percentages rather than voter hashes.
- Reviewed SECURITY DEFINER functions use an empty `search_path` and qualified object names.

## 3. Findings and qualifications
### Global rate limits — Medium
The reviewed submission functions use global limits (10 contact submissions/10 minutes and 20 feedback submissions/10 minutes); voting uses a global 60-votes/minute limit. Global limits can be exhausted by one source or abused to temporarily block legitimate visitors. Consider a carefully designed per-client/IP-aware or provider-level control, with privacy and proxy considerations. Do not expose IP addresses unnecessarily.

### Poll options visibility — review required
The `poll_options` SELECT policy checks that a parent poll exists. It does not itself test the poll's publication status or start time. The parent `polls` table has a visibility policy, but actual nested/direct query behavior should be tested. Verify that unpublished/scheduled poll options are not unintentionally exposed.

### Quote scheduling — design question
The public quotes policy checks `status = 'published'` but not `published_at`. If scheduled publication is intended, this is an inconsistency to correct; otherwise document that quotes publish immediately when status becomes published.

### Administrator helper — promising, not fully certified
`private.is_admin()` checks for a row matching `auth.uid()` in `public.admin_users`, uses SECURITY DEFINER and an empty search path. Supplied table grants did not show INSERT/UPDATE/DELETE for `authenticated` on `admin_users`. Still verify function owner, EXECUTE grants, all other functions/triggers that can modify admin membership and private-schema access.

### SECURITY DEFINER — ownership/grants outstanding
A fixed empty search path is good practice but does not alone establish safety. Function owner, EXECUTE ACLs, private schema privileges, secret-table grants and possible logging of parameters remain to be verified.

### Poll privacy — pseudonymous, not anonymous
The browser stores a client token. The backend derives a hash with a private pepper. This is not a basis for claiming absolute anonymity. Public results are aggregate; avoid collecting personal details in poll responses.

## 4. Table-level grant interpretation
The supplied grant output shows `authenticated` has SELECT/UPDATE/DELETE privileges on `contact_messages` and `reader_feedback`, and content-management privileges on several content tables. RLS policies further restrict row access to administrators. Table grants alone do not establish that all authenticated users can access every row; both grants and RLS must be considered together.

The supplied output shows no anon/authenticated direct table privileges for `poll_votes`. `service_role` and `postgres` have broad privileges; protect service-role credentials and database administration access.

## 5. `private.is_admin()` reviewed definition
The function checks whether `auth.uid()` exists in `public.admin_users`. Its `SECURITY DEFINER` setting and empty search path were observed. The supplied definition does not itself provide a user-controlled promotion path. Full review still depends on ownership, grants and other database objects.

## 6. Status
**Preliminary configuration review: positive controls observed; additional verification required.**  
Not a penetration test, legal opinion, or certification.

## 7. Remaining evidence
- Function owner and EXECUTE ACL query.
- Private schema grants and `private.secrets` table grants.
- Feedback status column default.
- Live tests proving anonymous and non-admin denial.
- Tests for scheduled poll/options and quote visibility.
- Backup/log retention and deletion evidence.
- Confirmation of storage bucket policies and password protection settings.
