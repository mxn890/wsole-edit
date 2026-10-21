# Sole Edit

Responsive pre-loved footwear storefront with categories, search, filters, product pages, wishlist, cart and guest demo checkout.

## Run locally

```bash
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. No dependencies or build step required.

## Customize

- `dist/index.html`: store name and page shell
- `dist/style.css`: theme and responsive layouts
- `dist/app.js`: products, prices, categories and shopping interactions
- `dist/assets/`: product and category images

Cart, wishlist and demo orders are saved in browser localStorage. Real payment, order processing and inventory services are not connected. Replace reference imagery with your authorized product photos before commercial launch.
