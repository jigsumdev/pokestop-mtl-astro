# PokéStop MTL — Astro 6 Website

Rebuilt from the original vanilla HTML/JS site into **Astro 6** with Tailwind CSS, bilingual i18n (EN/FR), and a Medusa v2 storefront integration.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro 6 (static output) |
| Styling | Tailwind CSS 3 + custom CSS variables |
| i18n | Astro built-in i18n (EN default, FR under `/fr/`) |
| Shop backend | Medusa v2 Storefront API |
| Cart | localStorage (client-side) |
| Deployment | Cloudflare Pages |
| Server endpoints | Cloudflare Pages Functions (`functions/`) |

---

## Project Structure

```
src/
  components/
    SiteHeader.astro      — Fixed dark navbar with search, lang switcher, cart badge
    SiteFooter.astro      — Footer with newsletter, links, social
    ProductCard.astro     — Reusable card with holo shimmer + add-to-cart
  data/
    i18n.ts               — Translation helper + faqItems
    locales/
      en.ts               — English strings
      fr.ts               — French strings
    products.ts           — Static product catalog (fallback when Medusa is offline)
  layouts/
    BaseLayout.astro      — HTML shell, SEO meta, hreflang, shared popup + toast
  lib/
    medusa.ts             — Medusa v2 API client (fetch-based)
  pages/
    index.astro           — Home (EN)
    shop/index.astro      — Shop (EN) — Medusa-connected with static fallback
    cards.astro           — Pokémon Cards (EN)
    about.astro           — About (EN)
    contact.astro         — Contact (EN)
    faq.astro             — FAQ (EN)
    cart.astro            — Cart (EN, localStorage)
    mystery-packs.astro   — Mystery Packs (EN)
    privacy.astro         — Privacy Policy
    terms.astro           — Terms of Service
    shipping.astro        — Shipping Policy
    404.astro             — 404 page
    fr/                   — All above pages in French
  scripts/
    cart.ts               — Cart logic (add, remove, qty, popup, badge)
  styles/
    global.css            — Design tokens, component classes
public/
  favicon.svg
  robots.txt
  _headers
  _redirects             — Cloudflare Pages redirects
functions/
  api/store/             — Medusa storefront proxy endpoints (Pages Functions)
  api/admin/             — Protected admin endpoints (Pages Functions)
scripts/
  postbuild.mjs          — Post-build HTML optimization
  setup-cloudflare-pages.ps1 — Create Pages project, upload secrets, deploy
```

---

## Connecting to Medusa

Medusa is a full Node server. It does **not** run well on Cloudflare Workers.

Recommended options:

- **Low-cost / free-ish**: host Medusa on an external Node host (Railway/Render/Fly/VPS).
- **Cloudflare-only**: run Medusa via **Cloudflare Containers** (usually not free).

1. Deploy your **Medusa v2** backend and note its public URL.
2. In Medusa Admin → **Settings → API Keys**, create a **Publishable** key.
3. Configure environment variables:

   | Key | Value |
   |---|---|
   | `PUBLIC_MEDUSA_BACKEND_URL` | `https://your-medusa.example.com` |
   | `PUBLIC_MEDUSA_PUBLISHABLE_KEY` | `pk_...` |
   | `PUBLIC_MEDUSA_USE_PROXY` | `true` (recommended on Pages) |
   | `MEDUSA_ADMIN_EMAIL` | admin email (for sync) |
   | `MEDUSA_ADMIN_PASSWORD` | admin password (for sync) |
   | `ADMIN_SYNC_TOKEN` | random secret (protects manual sync endpoint) |

4. The shop pages (`/shop/`, `/fr/boutique/`) will automatically use Medusa products when the backend is reachable. If the backend is offline or the env vars are empty, the site falls back to the static `products.ts` catalog seamlessly.

---

## Local Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

---

## Deployment (Cloudflare Pages)

### Local Pages runtime (Functions + headers)

Pages Functions don’t run under `astro dev`. To emulate Cloudflare Pages locally:

```powershell
Copy-Item .dev.vars.example .dev.vars
# edit .dev.vars with real values

bun run build
bunx --no-install wrangler pages dev dist
```

1. Push this repository to GitHub.
2. In Cloudflare Pages → **Create a project** → connect the repo.
3. Build settings:
   - **Build command**: `bun run build`
   - **Build output directory**: `dist`
4. Add environment variables (`PUBLIC_MEDUSA_BACKEND_URL`, `PUBLIC_MEDUSA_PUBLISHABLE_KEY`).
5. Deploy.

---

## Manual Collectr → Medusa sync (production)

There is a protected Pages Function endpoint:

- `POST /api/admin/sync-collectr`

Headers:
- `X-Admin-Token: <ADMIN_SYNC_TOKEN>`

Body:

```json
{
  "dryRun": false,
  "portfolio": []
}
```

Notes:
- This endpoint is for **manual admin use** and requires you to provide the portfolio payload.
- Local CLI sync still exists:
  - `bun run sync`
  - `bun run sync:dry`

---

## Design System

- **Fonts**: Barlow Condensed (display headings) + Inter (body)
- **Accent**: `oklch(0.70 0.18 250)` — electric blue
- **Background**: `oklch(0.93 0.005 285)` — light vault grey
- **Dark surfaces**: `oklch(0.10–0.18 0.01 285)` — deep charcoal
- **Holo shimmer**: CSS gradient overlay on product card hover
- **Signature element**: Gold-blue gradient rule under navbar

---

## i18n Routes

| Page | EN | FR |
|---|---|---|
| Home | `/` | `/fr/` |
| Shop | `/shop/` | `/fr/boutique/` |
| About | `/about/` | `/fr/a-propos/` |
| Contact | `/contact/` | `/fr/contact/` |
| FAQ | `/faq/` | `/fr/faq/` |
| Cart | `/cart/` | `/fr/panier/` |
| Mystery Packs | `/mystery-packs/` | — |
