# sorcery-companion

A companion app for the [Sorcery: Contested Realm](https://sorcery.game/) TCG.
Browse cards, track your collection, build decks, and scan physical cards with your camera.

**Live:** https://sorcery-companion.vercel.app

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind v4 + shadcn/ui |
| Database | PostgreSQL via Prisma |
| Auth | Supabase |
| State | Zustand (selection), nuqs (URL params) |
| Compiler | React Compiler (`reactCompiler: true`) |

---

## Caching Architecture

All data fetching uses Next.js's `"use cache"` directive with **tag-based invalidation only** — no time-based expiry.

### Strategy

```
cacheLife("max")   →  stale/revalidate/expire = Infinity (permanent until tagged bust)
cacheTag(...)      →  enables on-demand invalidation via revalidateTag()
```

### Cache Tag Taxonomy

```
// Catalog (shared, slow-changing)
"catalog:cards"              → all card data
"card:{id}"                  → single card detail + prices
"catalog:sets"               → all set data
"set:{slug}"                 → single set metadata
"set-grid:{setId}"           → paginated cards in a set

// User data (per-user, mutation-driven)
"collection:{userId}"        → user's collection items + stats
"decks:{userId}"             → user's deck list
"deck:{deckId}"              → single deck with cards
"public-collection:{slug}"   → public collection page (/u/[slug])
"user:{userId}"              → user profile / settings
```

### Revalidation

```ts
import { revalidateTag } from "next/cache";

// Next.js 16 API: revalidateTag(tag, profile)
revalidateTag("catalog:cards", "max");        // bust all card caches
revalidateTag("card:abc123", "max");           // bust one card detail
revalidateTag("catalog:sets", "max");          // bust all set listings
revalidateTag("collection:user123", "max");    // bust user's collection + stats
revalidateTag("decks:user123", "max");         // bust user's deck list
revalidateTag("deck:deck456", "max");          // bust one deck
revalidateTag("public-collection:slug", "max");// bust public collection page
```

All server actions that mutate data call `revalidateTag` with the relevant tags — no manual cache management needed.

### Data Layer

| File | Scope | Functions |
|---|---|---|
| `src/lib/data.ts` | Catalog (public) | `getAllCards`, `getCard`, `getAllCardIds`, `getAllSets`, `getFullSets`, `getSetBySlug`, `getSetCards`, `getAllSetSlugs`, `getTotalCardCount`, `getTotalVariantCount`, `getSetCardCounts` |
| `src/lib/data-user.ts` | User (auth-gated) | `getCollectionStatsData`, `getUserDecks`, `getDeckWithCards`, `getPublicCollection`, `getPublicCollectionMeta` |

### Static Pages

`/cards/[id]` and `/sets/[slug]` are **fully pre-rendered at build time** via `generateStaticParams`. Unknown slugs/IDs return 404 (`dynamicParams = false`). Revalidation re-renders affected pages on the next request after `revalidateTag()` is called.

Auth state on card detail pages is resolved **client-side** (Supabase browser client) so the static HTML stays auth-agnostic.

### Suspense + Streaming

Every page with async work wraps its data-fetching component in `<Suspense fallback={<XxxSkeleton />}>`. This enables:
- Instant skeleton rendering on navigation
- Independent streaming of page sections
- Better FCP than blocking on full page data

### Lazy Loading

Heavy client components are code-split via `next/dynamic`:
- `PriceChart` (ssr: false) — only loads when price data is visible
- `CollectionStatsView` — stats charts
- `DeckListView` — deck list UI
- `DeckEditorView` — full deck editor

---

## Routes

| Route | Type | Notes |
|---|---|---|
| `/` | Dynamic | Card browser, catalog cached via `"use cache"` |
| `/cards/[id]` | Static + ISR | Pre-rendered, `revalidateTag("card:{id}")` |
| `/sets` | Dynamic | Set list, catalog cached |
| `/sets/[slug]` | Static + ISR | Pre-rendered, `revalidateTag("set:{slug}")` |
| `/collection` | Dynamic (auth) | Inline Prisma (get-or-create pattern) |
| `/collection/stats` | Dynamic (auth) | Cached via `getCollectionStatsData` |
| `/decks` | Dynamic (auth) | Cached via `getUserDecks` |
| `/decks/[id]` | Dynamic (auth) | Cached via `getDeckWithCards` |
| `/u/[slug]` | Dynamic | Cached via `getPublicCollection` |
| `/scan` | Static | Client-only camera scanner |
| `/settings` | Dynamic (auth) | User profile |

---

## Development

```bash
npm install
npm run dev       # Turbopack dev server → http://localhost:3000
npm run build     # Production build (pre-renders all static pages)
npm run lint
```

Required env vars (`.env.local`):
```
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SORCERY_LENS_URL=     # card scanner API
SORCERY_LENS_SECRET=  # scanner auth header
```

---

## Project Structure

```
src/
  app/
    (main)/              — pages with Nav layout
      cards/[id]/        — card detail (static, ISR via revalidateTag)
      sets/[slug]/       — set pages (static, ISR via revalidateTag)
      collection/        — user collection (dynamic, auth-gated)
        stats/           — collection statistics
        import/          — CSV/decklist import
        export/          — CSV/decklist export
      decks/             — deck list + editor (dynamic, auth-gated)
      u/[slug]/          — public collection profiles
      settings/          — user settings
    (fullscreen)/        — fullscreen layouts
      scan/              — camera card scanner
    api/health/          — health check endpoint
  components/
    card-browser.tsx          — unified card grid (search/filter/sort)
    card-cell.tsx             — individual card tile
    card-detail-view.tsx      — full card detail UI
    price-display.tsx         — price info + lazy-loaded PriceChart
    scanner/                  — scanner components
    selection-*.tsx           — multi-select mode
    skeletons.tsx             — all loading skeletons
  lib/
    data.ts              — cached catalog data (cacheLife("max") + cacheTag)
    data-user.ts         — cached user data (collection, decks, profiles)
    actions/             — server actions (all wire revalidateTag after mutations)
    auth.ts              — Supabase auth helpers
    prisma.ts            — Prisma client singleton
  hooks/
    use-camera.ts             — getUserMedia + permission handling
    use-frame-stability.ts    — frame diff → stable card detection
```
