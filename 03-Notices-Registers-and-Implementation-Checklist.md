# VARUN SAI Author Website
## Notices, Registers & Implementation Checklist

**Prepared:** 11 November 2026

## A. Contact form notice
When submitting the contact form, visitors provide their name, email address, subject and message so the website operator can respond. Do not include passwords, payment details or sensitive personal information. Privacy questions: tsudhakartsudhakar5@gmail.com.

## B. Reader's Corner notice
Reader submissions may be reviewed before publication. Only approved contributions are intended to appear publicly. Name and message may be displayed; optional email is for moderation/contact and is not returned by the reviewed public feedback retrieval function. Do not include private or sensitive information.

## C. Poll notice
See `04-Poll-Privacy-Notice.md`. Use that wording wherever the poll feature explains its privacy behavior.

## D. Privacy contact notice
For privacy questions, correction/deletion requests or grievances: tsudhakartsudhakar5@gmail.com.

## E. Operational registers

### Contact request register
Recommended fields: reference number; received date; category; status; assigned reviewer; response date; deletion/review date; notes limited to what is necessary.

### Feedback moderation register
Recommended fields: feedback ID; received date; moderation status; reviewer; decision date; public display status; removal/review date. Avoid copying email/message contents into a second register.

### Grievance register
Recommended fields: reference; received date; issue category; acknowledgement date; action owner; outcome; closure date.

### Incident register
Recommended fields: incident reference; detection date; systems affected; data categories potentially affected; containment; assessment; notifications/legal advice; remediation; closure.

### Provider register
Recommended fields: provider; service; data categories; purpose; account owner; terms/privacy link; region (if known); retention; security configuration; review date.

## F. Technical implementation checklist

### Forms
- [ ] Confirm contact form validation and server-side validation.
- [ ] Confirm honeypot behavior.
- [ ] Confirm error messages do not expose database internals.
- [ ] Test submission and admin receipt with disposable data.
- [ ] Confirm feedback default status is pending.

### Database and access
- [ ] Verify RLS is enabled on every exposed table.
- [ ] Verify actual policy expressions after any schema change.
- [ ] Verify only authorised admins can read contact and unapproved feedback.
- [ ] Verify `anon` and ordinary `authenticated` roles cannot directly access poll votes.
- [ ] Verify admin membership cannot be self-assigned.
- [ ] Verify function owners, EXECUTE grants and private-schema permissions.
- [ ] Verify `private.secrets` cannot be read by public roles.
- [ ] Review rate limits; current limits are global and may create denial-of-service or availability issues.

### Polls and content visibility
- [ ] Test duplicate voting and poll closure.
- [ ] Test access to options for unpublished/scheduled polls.
- [ ] Confirm quote scheduling behavior matches policy.
- [ ] Confirm only aggregate poll results are public.

### Security and operations
- [ ] Enable leaked-password protection if supported and appropriate.
- [ ] Enable MFA for administrators where available.
- [ ] Verify backups and deletion/retention behavior.
- [ ] Review third-party scripts and providers.
- [ ] Test mobile and desktop layouts, keyboard navigation and accessibility.
- [ ] Confirm no secret keys or credentials are present in public files.

### Legal and publication
- [ ] Confirm operator/contact details.
- [ ] Confirm actual data flows and provider list.
- [ ] Obtain Indian privacy/technology lawyer review.
- [ ] Approve policy version and effective date.
- [ ] Publish the privacy policy and notices only after approval.

## G. Approval record
Policy version: __________  
Reviewed by responsible operator: __________  
Date: __________  
Legal review (if obtained): __________  
Publication date: __________  
Next review date: __________

**Do not mark an item complete merely because a checklist has been prepared. Record evidence of the actual test or configuration.**
