# Config & Architecture Recommendations
*No code changes required — configuration and infrastructure only.*

---

## Vercel

### 1. Enable Speed Insights
Vercel Speed Insights tracks real-user Core Web Vitals (LCP, CLS, INP) per route.
Free tier is sufficient for this traffic level.

**Action:** Vercel dashboard → Project → Analytics → Enable Speed Insights.  
`@vercel/analytics` is already imported in `layout.tsx`. Speed Insights is a separate package:
```bash
npm install @vercel/speed-insights
```
Add `<SpeedInsights />` next to `<Analytics />` in `layout.tsx`.

---

### 2. Vercel Edge Config for feature flags
Store environment-dependent config (e.g., scanner kill switch, maintenance mode) in Vercel
Edge Config instead of env vars. Edge Config reads are ~1ms from edge — no DB round-trip.

**Action:** Create an Edge Config store in Vercel dashboard. Use `@vercel/edge-config` client.

---

### 3. Fluid Compute (Vercel)
Vercel's Fluid Compute allows serverless functions to handle multiple concurrent requests
in the same instance (instead of spinning new instances per request). This reduces cold starts
and is especially valuable for Prisma connections which are expensive to initialize.

**Action:** Vercel dashboard → Project → Settings → Functions → Enable Fluid Compute.  
*(Available on Pro plan. No code change required.)*

---

### 4. Response compression
Vercel automatically gzip/Brotli-compresses responses. Verify Brotli is enabled for the
Next.js output by checking response headers on production (`content-encoding: br`).
No action needed if already present.

---

## Supabase

### 5. Enable `pg_stat_statements`
Supabase has `pg_stat_statements` available but it may not be enabled by default.
This extension tracks query performance and is essential for identifying slow queries.

**Action:** Supabase dashboard → Database → Extensions → Enable `pg_stat_statements`.  
Then query slow queries: `SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;`

---

### 6. Connection pool sizing (PgBouncer)
The Supabase Vercel integration uses PgBouncer in Transaction mode with `connection_limit=1`
per serverless function. On Vercel, each function instance gets 1 connection.
With many concurrent users, connection queue depth increases latency.

**Current:** `POSTGRES_PRISMA_URL` includes `?pgbouncer=true&connection_limit=1`  
**Action:** Consider increasing `connection_limit` to 2–3 if DB server allows it.
Check: Supabase dashboard → Settings → Database → Connection Pooling → Pool Size.

---

### 7. Supabase Realtime for live collection updates
Currently, collection updates require a full page refresh or manual cache invalidation.
Supabase Realtime (Postgres LISTEN/NOTIFY) could push updates to the client when the
collection changes from another device/tab.

**Action (future):** Subscribe to `CollectionCard` changes via `supabase.channel()`.
This would enable live sync across devices without polling.

---

## Cloudflare R2 (card images)

### 8. Cache-Control headers on R2 objects
Card images at `pub-fbad7d695b084411b42bdff03adbffd5.r2.dev/cards/*.png` serve with default
cache headers. Card images never change (slug is permanent), so they should have long TTLs.

**Action:** Set object metadata on R2 uploads:
```
Cache-Control: public, max-age=31536000, immutable
```
This can be done via the R2 Workers binding or the S3-compatible API on upload:
```typescript
// In the seeding/upload script
await s3.putObject({
  Bucket: "cards",
  Key: `${slug}.png`,
  Body: imageBuffer,
  ContentType: "image/png",
  CacheControl: "public, max-age=31536000, immutable",
});
```

---

### 9. Cloudflare Image Resizing (R2 + Workers)
Currently `next/image` resizes card images via Vercel's Image Optimization API (consumes
Vercel image transformation credits). At 1128 cards × multiple sizes, this adds up.

**Alternative:** Use Cloudflare Image Resizing via a Worker in front of R2.
This would serve resized images directly from Cloudflare's edge, bypassing Vercel's optimizer.

```
https://images.sorcery-companion.com/cards/{slug}.png?width=260&quality=80
```

**Trade-off:** Requires Cloudflare Pro ($20/mo) for Image Resizing. Not urgent at current scale.

---

## Architecture Notes

### 10. Supabase Auth → Prisma user sync
Currently, when a user signs up via Supabase Auth, a `User` row must be created in Prisma.
This is presumably done via a Supabase trigger or a post-signup server action.

**Risk:** If the trigger fails, the Prisma `User` row doesn't exist and foreign key constraints
will fail on collection/deck creation.

**Recommendation:** Add a Supabase Database Webhook or Function to sync `auth.users` → `public.User`
on INSERT, with retry logic.

---

### 11. Static catalog data — consider moving out of Postgres
The card catalog (1128 cards, sets, variants) is essentially static data that changes only
when new sets are released. Querying it from Postgres on every build/cache-miss is expensive.

**Alternative options (long term):**
- Export catalog to a JSON file at set-release time, bundle it with the app (zero DB queries for browsing)
- Use Vercel KV (Redis) or Upstash for hot catalog data with ~1ms reads
- Use Cloudflare D1 (SQLite at edge) for catalog reads + keep Postgres for user data only

**Current state is fine** for the scale. Worth revisiting when card count exceeds ~5000.
