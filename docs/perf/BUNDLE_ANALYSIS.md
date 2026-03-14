# Bundle Analysis
*Measured on `perf` branch, local build — `next build` output*

## Summary

| Metric | Value |
|---|---|
| Total client JS chunks | ~1,459 KB (pre-gzip, est. ~420 KB gzipped) |
| Largest single chunk | 219 KB (Next.js framework) |
| Second largest | 199 KB — **Supabase** |
| nuqs (URL state) | ~81 KB (64 KB + 17 KB) |
| TanStack Virtual | not present in client chunks (correct — server/effect only) |
| aws-sdk/client-s3 | not present in client chunks ✅ (server-only) |

---

## Top Chunks

| Chunk | Size | Contents |
|---|---|---|
| `39d04e481d7296ba.js` | 219 KB | Next.js framework + React runtime |
| `7809fee34f841cc0.js` | **199 KB** | `@supabase/ssr` + `@supabase/supabase-js` (gotrue, realtime, storage) |
| `a6dad97d9634a72d.js` | 110 KB | React reconciler / scheduler |
| `dfa668c1dd61a806.js` | 82 KB | Framework internals |
| `7cf5baac0aa8ca8a.js` | 64 KB | `nuqs` (URL state) |
| `5ef04c0023f61bb5.js` | 17 KB | `nuqs` (additional) |

---

## Key Findings

### 🔴 Supabase client bundle — 199 KB

The `@supabase/supabase-js` package ships the full client including modules that sorcery-companion
does not use on the client side:

| Module | Included | Used client-side? |
|---|---|---|
| `gotrue` (auth) | ✅ | ✅ Yes — session management |
| `realtime` | ✅ | ❌ No — not used yet |
| `storage` | ✅ | ❌ No — not used |
| `functions` | ✅ | ❌ No — not used |
| `postgrest` | ✅ | ❌ No — all queries go through Prisma |

**Estimated savings:** 50–80 KB by tree-shaking unused Supabase modules.

**Options:**
1. **Configure the Supabase client to only import auth** — `@supabase/supabase-js` supports
   passing a custom fetch and disabling unused plugins, but the API doesn't expose clean
   module-level splitting yet.
2. **Use `@supabase/gotrue-js` directly for client auth** (lower-level, smaller) — more work
   but eliminates all non-auth code.
3. **Track [supabase-js#1000](https://github.com/supabase/supabase-js/issues/1000)** — the team
   is working on better tree-shaking. This is a dependency-level fix, not an app-level one.

**Short-term:** No easy fix without architectural changes. Document and revisit when Supabase
releases better tree-shaking support.

---

### 🟡 nuqs — 81 KB

`nuqs` handles URL state for the card browser search, sort, and filters. At 81 KB for URL
parameter management, it's disproportionate for the use case.

**What it's used for:**
- `q` — search query
- `sort` — sort key
- Filter state (element, type, rarity, set, cost, etc.)

**Options:**
1. **Keep nuqs** — it provides type-safe URL state with Next.js App Router integration and
   SSR-safe serialization. The developer experience is significantly better than raw URLSearchParams.
   81 KB is the tradeoff.
2. **Replace with native `useSearchParams` + `useRouter`** — ~0 KB overhead, but requires
   custom serialization/deserialization logic for every filter. Significant refactor.
3. **Replace with a lighter alternative** — `next-usequerystate` (nuqs predecessor, smaller) or
   a custom hook wrapping `URLSearchParams`.

**Recommendation:** Keep nuqs for now. The DX benefit justifies the size at this scale. Revisit
if bundle budget becomes a hard constraint.

---

### ✅ What's already good

- **`aws-sdk/client-s3`** — not in client bundle (scripts-only, server-side) ✅
- **TanStack Virtual** — correctly absent from client chunks analyzed (loads only when the
  grid mounts) ✅
- **Prisma** — entirely server-side, zero client footprint ✅
- **Lucide icons** — `optimizePackageImports` is working, icons appear as individual chunks ✅
- **Dynamic imports** — `PriceChart`, `CollectionStatsView`, `DeckListView`, `DeckEditorView`
  are all lazy-loaded ✅

---

## How to Run Bundle Analyzer Locally

`@next/bundle-analyzer` is installed as a devDependency.

Add to `next.config.ts`:
```typescript
import withBundleAnalyzer from "@next/bundle-analyzer";

const withAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
export default withAnalyzer(nextConfig);
```

Then run:
```bash
ANALYZE=true npx next build
```

This opens an interactive treemap in the browser showing exact chunk contents.

---

## Recommendations (Prioritized)

| Priority | Action | Est. Savings |
|---|---|---|
| Long-term | Switch to auth-only Supabase client or wait for upstream tree-shaking | ~60–80 KB |
| Medium | Evaluate nuqs replacement when bundle budget is constrained | ~81 KB |
| Done ✅ | `optimizePackageImports` for lucide-react, @radix-ui/* | already applied |
| Done ✅ | `aws-sdk/client-s3` → devDependencies | no client impact |
| Done ✅ | Dynamic imports for heavy components | already applied |
