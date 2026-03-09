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

All data fetching uses Next.js's experimental `"use cache"` directive with **tag-based invalidation only** — no time-based expiry.

### Strategy

```
cacheLife("max")   →  stale/revalidate/expire = Infinity (permanent until tagged bust)
cacheTag(...)      →  enables on-demand revalidation via revalidateTag()
```

### Cache Tags

| Tag | Scope | Functions |
|---|---|---|
| `"cards"` | All card data | `getAllCards`, `getCard`, `getAllCardIds`, `getSetCards` |
| `"card-{id}"` | Single card | `getCard` |
| `"sets"` | All set data | `getAllSets`, `getFullSets`, `getSetBySlug`, `getAllSetSlugs` |
| `"set-{slug}"` | Single set | `getSetBySlug` |
| `"set-cards-{setId}"` | Cards within a set | `getSetCards` |

### Revalidation

```ts
import { revalidateTag } from "next/cache";

revalidateTag("cards");           // bust all card caches (card browser + all detail pages)
revalidateTag("card-abc123");     // bust a single card detail page
revalidateTag("sets");            // bust all set listings
revalidateTag("set-beta");        // bust one set page
revalidateTag("set-cards-xyz");   // bust the card grid for one set
```

Call these from a webhook handler, admin route, or build pipeline whenever card/set data changes in the database.

### Static Pages

`/cards/[id]` and `/sets/[slug]` are **fully pre-rendered at build time** via `generateStaticParams`. Unknown slugs/IDs return 404 (`dynamicParams = false` on both routes). Revalidation re-renders the affected pages on the next request after `revalidateTag()` is called.

Auth state on card detail pages is resolved **client-side** (Supabase browser client in `AddToCollectionButton`) so the static HTML shell stays auth-agnostic and universally cacheable.

---

## Routes

| Route | Type | Cache Tags |
|---|---|---|
| `/` | Dynamic (user data) | `cards`, `sets` |
| `/cards/[id]` | Static + ISR | `cards`, `card-{id}` |
| `/sets` | Dynamic | `sets` |
| `/sets/[slug]` | Static + ISR | `sets`, `set-{slug}`, `set-cards-{id}` |
| `/collection` | Dynamic (auth required) | — |
| `/collection/stats` | Dynamic (auth required) | — |
| `/decks/[id]` | Dynamic (auth required) | — |
| `/scan` | Static (client-only scanner) | — |
| `/u/[slug]` | Dynamic | — |

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
    (main)/          — authenticated + public pages (with Nav)
      cards/[id]/    — card detail (static, ISR via revalidateTag)
      sets/[slug]/   — set pages (static, ISR via revalidateTag)
      collection/    — user collection (dynamic, auth-gated)
      decks/         — deck builder (dynamic, auth-gated)
    (fullscreen)/    — fullscreen layouts (scanner)
      scan/          — camera card scanner
    api/health/      — health check endpoint
  components/
    card-browser.tsx      — unified card grid (search/filter/sort)
    card-cell.tsx         — individual card tile
    card-detail-view.tsx  — full card detail UI
    scanner/              — scanner components
    selection-*.tsx       — multi-select mode
  lib/
    data.ts          — cached data-fetching (cacheLife("max") + cacheTag)
    actions/         — server actions (collection, deck, scan, etc.)
    auth.ts          — Supabase auth helpers
    prisma.ts        — Prisma client singleton
  hooks/
    use-camera.ts           — getUserMedia + permission error handling
    use-frame-stability.ts  — frame diff → stable card detection signal
```
