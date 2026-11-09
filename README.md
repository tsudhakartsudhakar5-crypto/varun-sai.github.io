# Varun Sai — Official Author Website

Static GitHub Pages site for author Varun Sai. Separate from VARUN SAI BOOKSTORE. FLAT structure: no folders, unique file names.

## Status: Phase 6 (live features + admin panel)
Public: journal (list, search, categories, article pages, related, prev/next, share), Reader's Corner (polls, results, feedback), quotes, announcements, contact form, live home page cards.
Admin: admin.html (not linked anywhere, noindex). Sign-in uses Supabase Auth; every action is enforced by database Row Level Security.

## Files — upload ALL to the repository's main folder (overwrite existing)
Pages: index.html about.html journey.html books.html book.html learn-it-build-it-master-it.html the-unknown-truth.html
thoughts.html article.html readers-corner.html quotes.html announcements.html achievements.html media.html contact.html unknown-signal.html 404.html admin.html
Code: style.css script.js config.js site.js admin.js favicon.svg
Images/docs: book-cover.png learn-it-build-it-master-it-cover.jpg the-unknown-truth-cover.jpg The_Unknown_Signal.pdf
Other: sitemap.xml robots.txt googled3fd27eadf9718ae.html README.md

## Security notes
- config.js holds only the PUBLIC connection details (project URL + publishable key). Never put a service-role key, password or secret in any file in this repo.
- Admin access is decided by the database (admin_users table + RLS), not by the admin page.
- Voting: one vote per browser token per poll; clearing browser data allows another vote.
- The journal is rendered in the browser (JavaScript). article.html is intentionally not in sitemap.xml.
