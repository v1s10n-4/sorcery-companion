/**
 * Download card images from the official source and upload to Cloudflare R2.
 * Run: npx tsx scripts/sync-images.ts
 */

import "dotenv/config";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const R2_ACCOUNT_ID = "68cc56ef564436d10e19dedec8584f23";
const R2_BUCKET = "sorcery-companion-images";
const R2_PUBLIC_URL = "https://pub-fbad7d695b084411b42bdff03adbffd5.r2.dev";
const SOURCE_BASE = "https://d27a44hjr9gen3.cloudfront.net/cards";

// R2 uses S3-compatible API
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function syncImages() {
  // Get all variant slugs
  const variants = await prisma.cardVariant.findMany({
    select: { slug: true },
  });

  console.log(`Found ${variants.length} variants to sync`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches of 10 for rate limiting
  const BATCH_SIZE = 10;

  for (let i = 0; i < variants.length; i += BATCH_SIZE) {
    const batch = variants.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async ({ slug }) => {
        const key = `cards/${slug}.png`;

        // Skip if already uploaded
        if (await objectExists(key)) {
          skipped++;
          return;
        }

        try {
          // Download from source
          const response = await fetch(`${SOURCE_BASE}/${slug}.png`);
          if (!response.ok) {
            console.error(`  ✗ ${slug}: HTTP ${response.status}`);
            failed++;
            return;
          }

          const buffer = Buffer.from(await response.arrayBuffer());

          // Upload to R2
          await s3.send(
            new PutObjectCommand({
              Bucket: R2_BUCKET,
              Key: key,
              Body: buffer,
              ContentType: "image/png",
              CacheControl: "public, max-age=31536000, immutable",
            })
          );

          uploaded++;
        } catch (err) {
          console.error(`  ✗ ${slug}: ${err}`);
          failed++;
        }
      })
    );

    const total = uploaded + skipped + failed;
    if (total % 100 === 0 || i + BATCH_SIZE >= variants.length) {
      console.log(
        `Progress: ${total}/${variants.length} (uploaded: ${uploaded}, skipped: ${skipped}, failed: ${failed})`
      );
    }
  }

  console.log(
    `\nDone! Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`
  );
  console.log(`Images available at: ${R2_PUBLIC_URL}/cards/{slug}.png`);
}

syncImages()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
