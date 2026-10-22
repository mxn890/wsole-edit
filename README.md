# Jogglers

Next.js storefront preserving the original Jogglers design, with a protected Supabase management panel at `/admin`. Customers shop without signing in.

## Admin access

Open `/admin` and enter the private admin password. No email link or inbox is needed. The Supabase session is remembered in the browser and refreshes automatically; clearing browser data or signing out requires the password again. Use Password in the dashboard to change it. The password is never bundled in the frontend or committed to this repository.

The dedicated Supabase Auth account is provisioned separately and allowlisted in the private admin table. The SQL setup file creates the shared catalog, private order storage, owner-only policies and product-image bucket. Existing inventory and orders are retained. Production configuration uses the public publishable key only.

## Development

```sh
npm ci
npm run dev
```

`npm run build` bundles the Supabase browser client and builds Next.js. `vercel.json` configures the Next.js output. Catalog and product photos are shared through Supabase; browser storage keeps only auth sessions, the shopping bag, favourites, and recent order summaries. Existing browser-local catalog edits are not automatically imported.

## Management

Add, edit, hide, or delete products; upload up to eight compressed images; set sizes, prices, stock, and descriptions; manage categories and order statuses. Catalog writes use version checks to prevent overwriting a newer change. Export backup downloads catalog and private order data; keep exports private. Images removed from products are retained to preserve order snapshots.

Checkout calculates prices and stock in a database transaction. Cash on Delivery only; delivery is Rs. 250, free from Rs. 5,000. Retried orders deduct stock once. Tracking requires the order reference and checkout email. Cancellation restores stock once. Customers cannot list orders or write inventory. Shared catalog refreshes on page load, tab focus, and every 30 seconds outside checkout.

## Checks

```sh
npm test
npm run build
```

Database tests run the actual migration in a local PostgreSQL-compatible engine with mocked Supabase auth/storage schemas. They verify RLS, owner-only access, pricing, stock, retries, cancellation, tracking privacy and safe repeated setup. Live authentication uses Supabase password sign-in and the owner allowlist.
