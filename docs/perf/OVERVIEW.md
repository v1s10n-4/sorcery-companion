# Performance Epic — Overview

**Branch:** `perf` (tracks `main`)  
**Goal:** Identify and fix performance bottlenecks across the full stack.  
**Strategy:** Each sub-PR is a standalone, independently testable change. No merges until reviewed.

---

## Issues Found

### 🔴 High Impact

#### 1. Card grid — no virtualization (`perf/virtual-grid`)
The card browser renders every visible card as a DOM node. With 1128 cards and a batch size of 42
(growing via IntersectionObserver), users who scroll far accumulate hundreds of DOM nodes.
On mobile this causes jank, high memory usage, and slow input response.

**Fix:** Replace IntersectionObserver batch loading with TanStack Virtual, rendering only the ~15
visible rows at any time regardless of scroll depth.

**Metric:** DOM node count before/after scroll, scroll FPS in DevTools, mobile memory in Performance tab.

---

#### 2. Card detail — price history fetched at page load (`perf/price-history-lazy`)
`getCard()` fetches `take: 90` price snapshots per TCGplayer product, per variant, per printing.
A card with 3 printings × 2 finish variants × 1 TCGplayer product = 6 × 90 = 540 price rows
fetched synchronously at page load, even when the user never opens the price chart.

**Fix:** Split the price history into a separate `getPriceHistory(variantId)` function.
The card detail page loads instantly with current prices. Chart history lazy-loads when the tab opens.

**Metric:** Initial DB query time for `/cards/[id]`, initial payload size (bytes).

---

### 🟡 Medium Impact

#### 3. Card images — missing `sizes` + no priority hints (`perf/image-optimizations`)
`CardImage` passes `width={260} height={364}` but no `sizes` attribute. Without `sizes`, the browser
downloads the largest srcset variant even on mobile where cards render at ~33vw (≈120px).
Also: no card gets `priority={true}`, so the browser treats ALL card images as lazy — including
the first visible row, hurting LCP.

**Fix:** Add `sizes` responsive descriptor. Add `priority` prop to the first 6–7 cards (above-fold).

**Metric:** LCP in Lighthouse, image download sizes in Network tab.

---

#### 4. Missing DB indexes (`perf/db-indexes`)
The scanner makes up to 3 sequential `findFirst` queries filtered by `(cardId, finish, set.slug)`.
`CardVariant` has no explicit composite index on `(cardId, finish)`. PostgreSQL uses the FK index
on `cardId` alone, then filters `finish` in-memory.

Also: `CollectionCard` queries for stats fetch ALL cards with full relations — no aggregation-level
indexes exist.

**Fix:** Add composite indexes via Prisma migration:
- `CardVariant @@index([cardId, finish])`
- `PriceSnapshot @@index([variantId, recordedAt])` (for latest-price lookups)

**Metric:** `EXPLAIN ANALYZE` output in PR description.

---

#### 5. Partial Prerendering for auth routes (`perf/ppr`)
Collection and decks pages are fully dynamic (require auth). Every navigation to `/collection`
or `/decks` does a full server round-trip before any HTML is sent. PPR would serve the static
shell from edge cache instantly and stream the auth-gated content.

**Fix:** Add `export const experimental_ppr = true` to `/collection`, `/decks`, `/u/[slug]`.
Ensure all async boundaries are inside `<Suspense>` (already done ✅).

**Metric:** TTFB before/after on authenticated routes (use WebPageTest with cookie).

---

### 📄 Config & Architecture (no code)

#### 6. Vercel / Supabase / R2 config recommendations (`perf/config-recommendations`)
A markdown document with actionable config changes across the hosting stack.
No code changes required — configuration only.

See: `docs/perf/CONFIG_RECOMMENDATIONS.md`

---

## Sub-PRs Map

| Branch | Target | Status |
|---|---|---|
| `perf/virtual-grid` | `perf` | 🔄 In progress |
| `perf/price-history-lazy` | `perf` | 🔄 In progress |
| `perf/image-optimizations` | `perf` | 🔄 In progress |
| `perf/db-indexes` | `perf` | 🔄 In progress |
| `perf/ppr` | `perf` | 🔄 In progress |
| `perf/config-recommendations` | `perf` | 🔄 In progress |

## Measuring
- **Lighthouse:** Run against https://sorcery-companion.com (or Vercel preview URL)
- **WebPageTest:** https://www.webpagetest.org — use "Repeat View" to isolate cache behavior
- **Vercel Speed Insights:** Enable in Vercel dashboard if not already active
- **DevTools Performance tab:** For runtime metrics (scroll FPS, DOM count, memory)
