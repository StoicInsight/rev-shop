# Rêveur — Shopify Theme

A production-ready, Online Store 2.0 Shopify theme built from the **Rêveur "Drop 01"** design
concept — a numbered-edition streetwear storefront in royal blue, Bodoni Moda serif display type,
and IBM Plex Mono labels.

Validated with `shopify theme check` — **0 offenses across 58 files**.

---

## 1. Theme structure

```
theme/
├── assets/            CSS (one file per component) + vanilla JS (no build step, no framework)
├── config/            settings_schema.json (Theme Editor settings) + settings_data.json (defaults)
├── layout/            theme.liquid — the HTML shell every template renders into
├── locales/           en.default.json (storefront strings) + en.default.schema.json (editor strings)
├── sections/          One Liquid file per page region. Every page is composed of sections.
├── snippets/          Small reusable partials (product-card, price, icon, swatch, ...)
└── templates/         JSON templates that assemble sections per route (index, product, collection, ...)
```

This is a standard **Online Store 2.0** theme: every template is JSON, every region is a section
with its own schema, and merchants can reorder, add, remove, and configure sections and blocks
entirely inside the Theme Editor — no code edits required for day‑to‑day merchandising.

## 2. How sections work here

- **Global/static sections** (`header`, `footer`, `cart-drawer`) are rendered directly by
  `layout/theme.liquid` via `{% section '...' %}` and appear on every page.
- **Template sections** (`main-product`, `main-collection`, `hero`, `featured-collection`,
  `brand-story`, `main-cart`, `main-search`, `main-404`, `main-page`, the `customers/*` account
  sections, `main-blog`, `main-article`, `main-list-collections`) are wired into the matching
  `templates/*.json` file and can be freely rearranged in the Theme Editor.
- Repeatable content (nav links, marquee messages, footer columns, stat blocks, accordions) is
  implemented as **blocks**, never hardcoded — add/remove/reorder them from the editor.

## 3. Design tokens & theme settings

All colors, fonts, page width, button radius, and section spacing are exposed under
**Theme settings** and drive CSS custom properties set once in `layout/theme.liquid`
(`--color-accent`, `--font-heading`, `--radius-button`, etc.), so a full re-skin only requires
changing values in the Editor — no CSS edits.

- **Logo** — image upload with a text/tagline fallback (`RÊVEUR` / "The House of Dreamers")
  when no image is set.
- **Colors** — brand accent + ink, plus a small surface/border/text scale (defaults reproduce the
  original royal-blue-on-off-white palette: `#1B3FAE` / `#0E1533` / `#E4E9F5`).
- **Typography** — three `font_picker` fields (heading / body / accent-mono) default to
  **Bodoni Moda**, **Archivo**, and **IBM Plex Mono** — served through Shopify's font system
  (self-hosted, no external Google Fonts request, `font-display: swap`).
- **Cart** — drawer vs. full-page cart, and the free-shipping progress threshold.
- **Social** — Instagram / X / Facebook / TikTok links, shown in the footer when set.

## 4. Required navigation menus

| Handle | Used by |
|---|---|
| `main-menu` | Header navigation (`sections/header.liquid`, `menu` setting, defaults to `main-menu`) |
| `footer` | The three footer columns (Shop / House / Help), pre-wired in `config/settings_data.json` |

Both are Shopify's standard default menu handles, so a fresh store works out of the box; edit
them under **Online Store → Navigation**.

## 5. Product setup

Nothing about products, prices, images, or inventory is hardcoded — everything reads from the
Shopify product/variant/collection objects. To match the source design most closely:

- **Options** — name your size option exactly `Size` and your color option `Color`/`Colour` to
  get the pill-button and swatch-circle treatments respectively (`snippets/product-variant-picker.liquid`).
  Any other option name (Material, Length, …) still works, rendered as pill buttons.
- **"Size" is intentionally not pre-selected** — like the source prototype, shoppers must
  explicitly tap a size before Add to Cart will submit (`assets/product-form.js`), even though a
  variant is technically selected server-side from the first page load.
- **Color swatches** — `snippets/swatch.liquid` maps common colour-family names (Royal Blue, Navy,
  Black, Mist, Ice, Silver, …) to a hex circle; unrecognised names fall back to an initial-letter
  chip. Extend the `case` statement there for a custom palette.
- **Badges** ("New" / "Low stock" / "Sale" / "Sold out") on product cards are computed, not typed
  in: sold out → `available == false`; low stock → ≤ 10 units on the selected/first variant; sale
  → `compare_at_price` set; new → the product is tagged `new`.

### Metafields (optional)

| Namespace.key | Type | Used for |
|---|---|---|
| `custom.subtitle` | single line text | Product-card subtitle line (e.g. "Royal blue / silver print"). Falls back to the product type. |
| `custom.edition_number` | single line text | "No. 0142" on the product page eyebrow. |
| `custom.edition_total` | single line text | "/ 0500" — paired with `edition_number`. Both must be set to display. |

Create these under **Settings → Custom data → Products** if you want the numbered-edition detail;
the theme degrades gracefully (just hides the line) when they're empty.

## 6. Collections & filtering

`sections/main-collection.liquid` uses Shopify's **native** collection filtering
(`collection.filters`) and sorting (`collection.sort_options`) — no app or custom logic required.
The category-chip row specifically looks for the standard **Product type** filter
(`filter.p.product_type`); enable filtering for a collection under **Search & Discovery → Filters**
to show it. Without that app configuration the filter row is simply omitted (never a fake control).
Sort chips are limited to Featured / Price / Newest to match the source design; edit
`wanted_sorts` in `sections/main-collection.liquid` to expose more of Shopify's sort options.

## 7. Cart

Real Shopify AJAX cart (`assets/cart.js`, `sections/cart-drawer.liquid`, `sections/main-cart.liquid`):
add/remove/update quantity call the Cart API (`/cart/add.js`, `/cart/change.js`) and the drawer +
cart page re-render themselves via the **Section Rendering API** (`?section_id=...`), so prices,
totals, and stock are always server-computed — never duplicated in JavaScript. Toggle
**Theme settings → Cart → Cart type** between drawer and full-page.

"Buy it now" uses Shopify's native dynamic checkout button (`{{ form | payment_button }}`), so
Shop Pay / Apple Pay / Google Pay show up automatically wherever the merchant has them enabled —
nothing to configure in the theme.

## 8. Search

The header search flyout and `/search` results page both use Shopify's native search:
predictive results come from `/search/suggest.json` (`assets/predictive-search.js`), full results
from the `search` Liquid object (`sections/main-search.liquid`). No app required; toggle predictive
search on/off under **Theme settings → Search**.

## 9. Pages

- `templates/page.json` — generic rich-text page (Shipping, Returns, Sizing, Stockists, …).
- `templates/page.about.json` — a richer About page (title/body + the brand-story stats section).
  To use it, create a page named **About**, then set its template to **page.about** under
  **Online Store → Pages → Theme template**.

## 10. Blog

Standard `blog.json` / `article.json` / `list-collections.json` templates are included (listing,
single post with native comments, and an all-collections directory) so the theme meets Shopify's
full required-template set and the footer's "Journal" link has somewhere real to go.

## 11. Customer accounts

Login, register, account overview + order history, order detail, address book (add/delete), reset
password, and activate account are all implemented with Shopify's native `{% form %}` helpers
(`customer_login`, `create_customer`, `customer_address`, `recover_customer_password`, etc.) and
styled to match — no third-party account app assumed.

## 12. Installation

1. Zip the contents of this `theme/` folder (the `assets/`, `config/`, `layout/`, `locales/`,
   `sections/`, `snippets/`, `templates/` folders at the top level of the zip).
2. In Shopify Admin → **Online Store → Themes → Add theme → Upload zip file**.
3. Or, with Shopify CLI: `shopify theme dev` / `shopify theme push` from inside `theme/`.
4. Add products with a `Size` and/or `Color` option, assign them to a collection, then set that
   collection on the homepage's **Featured collection** section (Theme Editor → Home page).
5. Confirm `main-menu` and `footer` navigation menus exist and are populated.
6. Optional: add the `custom.subtitle` / `custom.edition_number` / `custom.edition_total`
   metafields described above.

## 13. Customization

Everything editable — copy, images, colors, fonts, layout widths, columns, which collection feeds
the homepage grid, footer menus, marquee messages, brand-story stats, product-page accordions,
size-guide text — lives in **Theme Editor → Customize**. No code changes are needed for routine
merchandising; component CSS files under `assets/` are one-file-per-region if deeper visual
changes are ever needed.

## 14. Assumptions made from the source design

- The source was an interactive single-page prototype (one route, client-side state) built to
  demo the UX; it has been rebuilt as a real multi-page Shopify site (`/`, `/collections/...`,
  `/products/...`, `/cart`, `/search`, `/account/...`) rather than reproducing client-side routing.
- The prototype's hardcoded 6-product catalogue is **not** included — it was reference data only;
  create real products with matching titles/prices if you want to reproduce the original demo
  exactly (see §5 for the option-naming conventions that unlock the same UI).
- "Free shipping over $75" and similar marketing copy became editable theme settings /
  section text rather than logic — set the real threshold under **Theme settings → Cart**.
- Decorative product photography from the prototype was not carried over as theme assets; product
  imagery comes from the real Shopify product objects, as it should in a production store.
