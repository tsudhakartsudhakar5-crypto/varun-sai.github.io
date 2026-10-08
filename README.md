# Varun Sai — The Time Changes

Static author website with a paperback and ebook storefront interface.

## Current status

Changes are on `feature/book-store`; `main` and the live deployment have not been changed. Payment activation and live-subdomain publishing are excluded by the owner's request.

Direct checkout URLs and prices are intentionally empty. Visitors see coming-soon labels, not fake working checkout buttons. The existing Pothi product link is preserved. Its current stock and price have not been verified by this upgrade.

This is a storefront frontend, not a payment processor, stock database, admin panel, or shipping system. Orders, payments, inventory, refunds and ebook fulfilment must be configured in the chosen commerce provider before launch.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Homepage, format options, author, journey and purchase FAQ |
| `book.html` | Book details and reading-format choices |
| `about.html` | Preserved author biography with repaired markup |
| `style.css` | Responsive cream, charcoal and gold styling |
| `script.js` | Accessible navigation, copyright year and checkout validation |
| `store-config.js` | Public product URLs and optional display prices |
| `favicon.svg` | Local VS website icon |
| `book-cover.png` | Existing cover image |
| `tests/site.test.mjs` | Baseline content and checkout-safety tests |
| `404.html` | Existing legacy error page, unchanged |
| `script .js` | Original legacy script, retained but no longer referenced |

## Preview locally

With Python 3 installed, from the repository directory:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. Check all three pages on desktop and mobile. No build or package installation is required for the website.

## Required checks before release

These commands are provided for execution; no claim is made that they ran in the chat environment.

```sh
node --check script.js
node --check store-config.js
node --check tests/site.test.mjs
node --test tests/site.test.mjs
```

Use Node.js 20 or newer. The baseline tests were committed before page changes. Additional tests check single-body markup, assets, empty initial prices, unsafe checkout addresses and valid HTTPS checkout wiring. They do not test live payments or guarantee provider fulfilment.

Run HTML/CSS validation with a validator of your choice, and inspect mobile layouts at 360px, 640px, 850px and desktop widths. Check keyboard navigation, Escape-to-close, focus indicators, reduced motion and navigation with JavaScript disabled. No type-check step is configured: this is plain JavaScript without a TypeScript project.

## Payment setup — deferred

A hosted commerce provider such as Payhip can handle product checkout and delivery. Before activation, the owner must configure an approved seller account, payment gateway, accurate prices, paperback stock, shipping regions, shipping costs, dispatch times, refund policy, support details, and privacy information.

Upload the final ebook only to the commerce provider's protected delivery system. Do not commit it to this public repository. Confirm the digital format, device compatibility and seller's distribution rights before selling it.

Once real product checkout links are ready, edit `store-config.js` with HTTPS URLs and optional display-price strings. Never put gateway API keys, secrets, bank details or customer data in that file. The script rejects non-HTTPS and credential-containing URLs. URL validation is not payment verification: the owner must verify the destination and test the provider's checkout.

The launch-pending notices in `index.html` and `book.html`, and the homepage FAQ, must also be updated to accurate live-sale wording when checkout is activated. Adding a URL alone does not make this website launch-ready. Publish the actual shipping, refund, privacy and customer-support details first.

Use the provider dashboard for orders, product inventory and delivery. Use the payment provider dashboard for settlements and payment status. This frontend does not confirm payments, send transactional email, or protect downloads itself.

## Free-subdomain deployment — deferred

No domain was purchased and no hosting account was changed. When publishing is authorized, a static host such as Cloudflare Pages can serve this repository on a provider subdomain within its free-plan limits.

Deploy only the reviewed branch after checks pass. The static files are at the repository root; there is no frontend build. Confirm the host's current dashboard setup, project name availability and commercial-use terms. Update homepage canonical and social URLs to the actual deployed address, not an invented address.

A direct-upload deployment should include the HTML files, CSS, `script.js`, `store-config.js`, `favicon.svg` and `book-cover.png`. Keep the error page behavior under review: the unchanged legacy `404.html` still has pre-existing favicon and relative-path limitations on nested URLs.

Free hosting does not remove printing, packaging, shipping, transaction fees or applicable tax obligations.

## Change impact and rollback

Existing `index.html`, `book.html`, `about.html` and homepage section anchors `home`, `book`, `journey`, `author`, `future` are retained. The wrong script filename and mismatched navigation selectors are addressed by the new `script.js`. Content is no longer dependent on reveal animations. The existing Pothi product listing is preserved.

The shared stylesheet intentionally redesigns the author pages for shopping and supplies compatibility styles for the unchanged error page. No fake reviews, prices, availability, contact details or product specifications were added.

Do not merge or deploy until checks pass. Rollback is possible by redeploying the previously approved `main` version. The original code remains in Git history and `main` is unchanged.

© 2026 Varun Sai. All rights reserved.
