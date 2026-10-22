# Jogglers

Next.js 16 footwear storefront with a browser-local management panel at `/admin`.

## Start

```bash
npm ci
npm run dev
```

No database, environment variables, account, password, or backend service setup is required. Deploy the repository to Vercel using the included Next.js configuration.

## Manage your catalog

Open `/admin` to add, edit, hide and delete products, upload multiple photos, set cover photos, prices, stock, sizes and descriptions, and manage categories. Photos are resized automatically and saved with the catalog in localStorage.

**Changes only exist in the same browser and website origin. They are not published to other devices or customers.** The management page has no authentication because it only edits that browser's own data. Clearing site data removes saved changes. A different domain or deployment URL has its own separate storage.

Use **Export backup** to download a JSON copy containing the catalog, photos and local orders. Use **Import backup** to restore it, or move it to another browser. Import replaces the receiving browser's catalog and orders after confirmation. Backups include order contact details; keep them private.

Checkout saves orders and updates stock in the current browser. Orders are not transmitted to the owner, no payment is processed, and orders from other devices will not appear here. The checkout and confirmation screens explain this. A shared backend is required if you later want a real shared catalog and centralized orders.

Photo compression helps conserve browser space. If storage fills up, the save is rejected with an explanatory message and the previous catalog stays intact. Remove unused photos/products and keep backups.

## Checks

```bash
npm test
npm run build
```

The original theme, category layout and cart are retained. Branding is Jogglers. No database/API dependencies remain.
