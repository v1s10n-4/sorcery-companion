/**
 * Generate blurDataUrl for all card variants.
 * Fetches each image from R2, creates a tiny 10px-wide blur,
 * and stores the base64 data URL in the DB.
 *
 * Usage: npx tsx scripts/generate-blur.ts [--concurrency 20] [--force]
 */

import "dotenv/config";
import pg from "pg";
import sharp from "sharp";

const R2_BASE = "https://pub-fbad7d695b084411b42bdff03adbffd5.r2.dev/cards";
const CONCURRENCY = parseInt(
  process.argv.find((a) => a.startsWith("--concurrency="))?.split("=")[1] ?? "20",
  10
);
const FORCE = process.argv.includes("--force");

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function generateBlur(slug: string): Promise<string | null> {
  try {
    const url = `${R2_BASE}/${slug}.png`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const tiny = await sharp(buffer)
      .resize(10, 14, { fit: "fill" })
      .blur(2)
      .png({ quality: 20 })
      .toBuffer();

    return `data:image/png;base64,${tiny.toString("base64")}`;
  } catch {
    return null;
  }
}

async function main() {
  const whereClause = FORCE ? "" : ' WHERE "blurDataUrl" IS NULL';
  const { rows: variants } = await pool.query<{ id: string; slug: string }>(
    `SELECT id, slug FROM "CardVariant"${whereClause} ORDER BY slug`
  );

  console.log(`Found ${variants.length} variants to process (concurrency: ${CONCURRENCY})`);

  let processed = 0;
  let success = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < variants.length; i += CONCURRENCY) {
    const batch = variants.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (v) => {
        const blur = await generateBlur(v.slug);
        processed++;
        if (blur) {
          await pool.query(
            `UPDATE "CardVariant" SET "blurDataUrl" = $1 WHERE id = $2`,
            [blur, v.id]
          );
          success++;
        } else {
          failed++;
        }
        return blur !== null;
      })
    );

    const pct = ((processed / variants.length) * 100).toFixed(1);
    const successInBatch = results.filter(Boolean).length;
    process.stdout.write(
      `\r  ${processed}/${variants.length} (${pct}%) — ${success} ok, ${failed} failed`
    );
  }

  console.log(`\n\nDone: ${success} blurs generated, ${failed} failed.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
