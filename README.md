# Jogglers

Next.js 16 storefront and private store-management panel. The original yellow, black and white storefront is preserved, including category browsing, search, filters, wishlist, cart and guest checkout.

## Run locally

```bash
npm ci
cp .env.example .env.local
# Set ADMIN_PASSWORD (12+ characters) and SESSION_SECRET (32+ characters).
npm run dev
```

Visit `/` for the shop and `/admin` for management. Customers do not need an account. Only the store owner signs in to `/admin`.

Without DATABASE_URL, development uses a persistent PostgreSQL-compatible PGlite database in `.data/jogglers`. Production requires a PostgreSQL connection; it never writes inventory or orders to an ephemeral Vercel filesystem.

## Production setup on Vercel

1. Connect the repository, choose Next.js, and leave the root directory at the repository root. Remove any old `dist` output-directory override and old build/install-command overrides in the Vercel project settings.
2. Connect a PostgreSQL database, preferably a pooled Neon database from Vercel Storage, and set `DATABASE_URL`.
3. Set `ADMIN_PASSWORD` to your own long password and `SESSION_SECRET` to a random secret (e.g. `openssl rand -hex 32`) using Vercel's secret environment-variable fields. Never commit them or use a `NEXT_PUBLIC_` prefix.
4. Deploy. The first database request creates the tables and imports the existing catalog once. No default admin password is shipped.
5. Open `/admin` to review the existing inventory, update stock and product photos, then accept customer orders.

Storefront catalog pages can render the retained catalog before database setup; all management writes and checkout require the database. Setup-incomplete screens do not pretend to save anything.

## Store management

- Add, edit, hide and delete products in any category or collection.
- Upload up to 8 PNG/JPEG/WebP photos per product (2 MB each), choose a cover photo and remove photos from the product.
- Edit price, original price, description, brand, colour, condition, EU sizes and stock.
- Add/edit category names and photos. A category containing products cannot be deleted until those products are moved or removed.
- View orders with customer delivery details and update order status. Cancelling an order restores stock once; cancelled orders cannot be reopened.

Images are stored in PostgreSQL alongside the catalog, so uploads and changes work across devices. Image uploads are restricted to authenticated administrators. Removed product photos are unlinked from the product; uploaded files are retained in storage to preserve order snapshots.

Checkout stores orders on the server and calculates prices and shipping from current inventory. Cash on Delivery only; no card payment service is configured. Delivery is Rs. 250, free for orders from Rs. 5,000. Edit these rules in `lib/validation.mjs` and the storefront together if needed.

## Structure

- `app/`: Next.js App Router, private management UI and API handlers
- `public/storefront.js`: retained storefront controller and shared-catalog integration
- `app/globals.css`: retained storefront theme
- `data/seed.json`: initial inventory, imported once
- `lib/`: server storage, sessions, validation and atomic ordering
- `public/assets/`: existing imagery

## Checks

```bash
npm test
npm run build
```

The retained reference images should be reviewed and replaced with your authorized inventory photos before commercial use. No contact email, phone number or guaranteed return window has been invented.
