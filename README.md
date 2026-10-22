# Jogglers

Next.js storefront preserving the original Jogglers design, with a protected Supabase management panel at `/admin`. Customers shop without signing in.

## One-time Supabase setup

1. Replace `OWNER_EMAIL_HERE` with your owner email, then run `supabase/setup.sql` in the SQL Editor of the configured Supabase project. It creates owner policies, the shared catalog, private orders, atomic checkout functions, and the public product-image bucket. It imports initial inventory once and can be rerun without replacing edits.
2. In Authentication > URL Configuration, set Site URL to the production website origin and add `https://YOUR-DOMAIN/admin` to Redirect URLs. Keep email sign-in enabled.
3. Open `/admin` and request a sign-in email using the registered owner email. Only the verified allowlisted account can manage the catalog or view customer details.
4. Publish the `supabase-shared-store` branch after database setup. The public Supabase publishable key and project URL are bundled; no service-role key or database password is required in Vercel.

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

Database tests run the actual migration in a local PostgreSQL-compatible engine with mocked Supabase auth/storage schemas. They verify RLS, owner-only access, pricing, stock, retries, cancellation, tracking privacy and safe repeated setup. Live upload/auth verification requires the Supabase schema and production redirect configuration.
