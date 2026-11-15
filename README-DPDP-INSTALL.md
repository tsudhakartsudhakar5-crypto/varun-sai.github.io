# README: author website DPDP update
## Package
- `UPLOAD-TO-GITHUB/`: only the nine files that changed. Copy them into the **root** of the `varun-sai.github.io` repository, replacing files with the same name.
- `KEEP-PRIVATE-DOCS/`: these private documents. **Do not upload them to the public repository.**

## Files changed
`contact.html`, `data-rights.html`, `index.html`, `privacy.html`, `readers-corner.html`, `site.js`, `sitemap.xml`, `style.css`, `terms.html`. Unchanged: `config.js`, `script.js`, `admin.html`, `admin.js`, all other pages and images.
All existing features are kept: journal, polls, quotes, announcements, feedback, contact, admin panel, share buttons. The database function calls and their parameters are the same.

## Upload
1. GitHub → repository → Add file → Upload files; drag the **contents** of `UPLOAD-TO-GITHUB/` (not the folder); commit to `main`.
2. Wait about a minute, hard-refresh, and run the tests below.

## Homepage 3D script
`hero-scene.js` is not in the repository, so its line in `index.html` is now a comment. If you later add the file, it loads Three.js from a CDN: first add "Three.js is loaded from a content delivery network, which can see your IP address" to the privacy page's list in section 2.

## Tests
| # | Test | Result |
|---|---|---|
| 1 | Pages load | NOT TESTED (no browser) |
| 2 | Homepage cover and banner show | NOT TESTED visually; static check: all local file references now resolve |
| 3 | Contact form blocked without tick-box | PASSED (logic test, fake page) |
| 4 | Contact form sends with tick-box | PASSED in logic test (same 5 parameters to `submit_contact`); real submission NOT TESTED |
| 5 | Feedback form blocked / sends | PASSED in logic test (same 4 parameters, empty email sent as null); real submission NOT TESTED |
| 6 | Network error shows generic message | PASSED (logic test) |
| 7 | Poll voting, journal, quotes, announcements | NOT TESTED (code unchanged except the two form checks) |
| 8 | Admin panel | NOT TESTED; admin files unchanged |
| 9 | Privacy, terms, data-rights pages open | Static check only; the email-draft script is the original, unchanged |
| 10 | Footer legal links on every public page | PASSED (static check) |
| 11 | Mobile layout | NOT TESTED |
| 12 | Console errors | NOT TESTED; `node --check` passes for all scripts |
| 13 | Secrets | Scanned: only the publishable key; no service-role key; no `eval`/`innerHTML` risks in scripts |
Your tests: open each page on a phone; try the contact form with and without the tick-box; send yourself a test message and see it in the admin panel; vote in a poll; check the homepage cover.

## Backend (your approval)
See `SUPABASE-CHECKLIST.md`: five read-only queries plus dashboard checks. Send me the results.
