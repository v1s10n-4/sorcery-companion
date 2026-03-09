# sorcery-companion

Companion app for [Sorcery: Contested Realm](https://sorcery.game/) — browse every card, track your collection, build decks, check market prices, and scan physical cards with your phone camera.

**Live →** https://sorcery-companion.com

## Stack

| | |
|---|---|
| **Framework** | Next.js 16 — App Router, Turbopack, React Compiler |
| **Styling** | Tailwind v4 + shadcn/ui |
| **Database** | PostgreSQL via Prisma |
| **Auth** | Supabase (OAuth + email) |
| **Client state** | Zustand (selection), nuqs (URL params) |
| **Caching** | `"use cache"` + tag-only ISR (see below) |

## Caching & Performance

The entire data layer runs on **tag-based ISR with zero time-based expiry**. Data is cached permanently and only invalidated explicitly via `revalidateTag()` after mutations.

### How it works

```
"use cache"          →  opt into Next.js request-level caching
cacheLife("max")     →  never expire (stale = revalidate = expire = ∞)
cacheTag("card:x")   →  associate the cached entry with a tag
revalidateTag("card:x", "max")  →  purge that entry; next request regenerates
```

Every data function in `src/lib/data.ts` (catalog) and `src/lib/data-user.ts` (user-specific) follows this pattern. Every server action that writes data calls `revalidateTag` with the relevant tags — no manual cache management, no stale windows.

### Tag taxonomy

| Tag | Scope |
|---|---|
| `catalog:cards` | Full card catalog (browser, search, counts) |
| `card:{id}` | Single card detail page + prices |
| `catalog:sets` | Set listings |
| `set:{slug}` | Single set page |
| `set-grid:{setId}` | Paginated card grid within a set |
| `collection:{userId}` | User's collection + stats |
| `decks:{userId}` | User's deck list |
| `deck:{deckId}` | Single deck with cards |
| `public-collection:{slug}` | Public collection profile (`/u/[slug]`) |
| `user:{userId}` | User profile / settings |

### Static generation

`/cards/[id]` and `/sets/[slug]` are **fully pre-rendered at build time** via `generateStaticParams` + `dynamicParams = false`. Unknown IDs/slugs return 404. Pages regenerate on the next request after their tag is invalidated.

Auth on static card pages is resolved **client-side** (Supabase browser client in `AddToCollectionButton`) so the HTML stays universally cacheable.

### Streaming & code splitting

- Every page wraps async content in `<Suspense>` with a matching skeleton — skeletons stream instantly, data fills in
- Heavy client components (`PriceChart`, `CollectionStatsView`, `DeckListView`, `DeckEditorView`) are lazy-loaded via `next/dynamic`
- Catalog data (`getAllCards` + `getAllSets`) is never prop-drilled — `CardCatalogBrowser` (async server component) fetches it internally, paired with `preloadCatalog()` in the parent page for parallelism on cold cache

## Routes

| Route | Rendering | Data source |
|---|---|---|
| `/` | Dynamic | `CardCatalogBrowser` (catalog cached) |
| `/cards/[id]` | **Static + ISR** | `getCard` → `card:{id}` |
| `/sets` | Dynamic | `getFullSets` (catalog cached) |
| `/sets/[slug]` | **Static + ISR** | `getSetBySlug` + `getSetCards` |
| `/collection` | Dynamic (auth) | Inline Prisma (get-or-create) |
| `/collection/stats` | Dynamic (auth) | `getCollectionStatsData` |
| `/decks` | Dynamic (auth) | `getUserDecks` |
| `/decks/[id]` | Dynamic (auth) | `getDeckWithCards` |
| `/u/[slug]` | Dynamic | `getPublicCollection` |
| `/scan` | Static | Client-only camera scanner |
| `/settings` | Dynamic (auth) | `requireUser` |

## Development

```bash
npm install
npm run dev          # Turbopack → http://localhost:3000
npm run build        # production build (pre-renders 1128 static card pages)
npm run lint
```

### Environment variables

```env
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SORCERY_LENS_URL=          # card scanner API (optional)
SORCERY_LENS_SECRET=       # scanner auth header (optional)
```

## Project structure

```
src/
├── app/
│   ├── (main)/                    ← pages with Nav layout
│   │   ├── cards/[id]/            ← card detail (static, ISR)
│   │   ├── sets/[slug]/           ← set page (static, ISR)
│   │   ├── collection/            ← user collection (dynamic, auth)
│   │   │   ├── stats/
│   │   │   ├── import/
│   │   │   └── export/
│   │   ├── decks/                 ← deck list + editor (dynamic, auth)
│   │   ├── u/[slug]/              ← public collection profiles
│   │   └── settings/
│   ├── (fullscreen)/
│   │   └── scan/                  ← camera card scanner
│   └── api/health/
├── components/
│   ├── card-browser.tsx           ← unified card grid (search/filter/sort)
│   ├── card-catalog-browser.tsx   ← async server wrapper (owns catalog fetch)
│   ├── card-detail-view.tsx       ← full card detail UI
│   ├── price-display.tsx          ← prices + lazy PriceChart
│   ├── scanner/                   ← scanner components
│   ├── selection-*.tsx            ← multi-select mode
│   └── skeletons.tsx              ← all loading skeletons
├── lib/
│   ├── data.ts                    ← cached catalog functions + preloadCatalog()
│   ├── data-user.ts               ← cached user-specific functions
│   ├── actions/                   ← server actions (all call revalidateTag)
│   ├── auth.ts                    ← Supabase auth helpers
│   └── prisma.ts                  ← Prisma client singleton
└── hooks/
    ├── use-camera.ts              ← getUserMedia + permissions
    └── use-frame-stability.ts     ← frame diff → stable card signal
```
