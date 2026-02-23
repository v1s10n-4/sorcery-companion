/**
 * TCGplayer Price Sync Script
 *
 * 1. Fetches all Sorcery products from TCGplayer's search API
 * 2. Matches them to our CardVariant records by name + set + finish
 * 3. Upserts TcgplayerProduct rows (with variant linkage)
 * 4. Inserts PriceSnapshot rows for current prices
 *
 * Usage: npx tsx scripts/sync-tcgplayer.ts [--prices-only]
 *   --prices-only  Skip product discovery, only sync prices for existing mappings
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DB_URL =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:9lwYZvpK75kFoiLl@db.wainhxavewgcarxhdicu.supabase.co:5432/postgres";

const SEARCH_API = "https://mp-search-api.tcgplayer.com/v1/search/request";
const PRICE_API = "https://mpapi.tcgplayer.com/v2/product";
const PAGE_SIZE = 50;
const DELAY_MS = 500; // polite delay between requests

// ── Set name mapping: TCGplayer → our slugs ──
const SET_MAP: Record<string, string> = {
  alpha: "alpha",
  beta: "beta",
  gothic: "gothic",
  "arthurian legends": "arthurian-legends",
  dragonlord: "dragonlord",
  "dust reward promos": "promotional",
  "arthurian legends promo": "promotional",
};

// ── Finish mapping: TCGplayer printing → our finish ──
function tcgPrintingToFinish(productName: string): {
  printing: "Normal" | "Foil";
  finish: string;
} {
  if (productName.includes("(Foil)")) {
    return { printing: "Foil", finish: "Foil" };
  }
  return { printing: "Normal", finish: "Standard" };
}

function cleanCardName(tcgName: string): string {
  return tcgName.replace(/\s*\(Foil\)\s*/g, "").trim();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface TcgProduct {
  productId: number;
  productName: string;
  setName: string;
  setUrlName: string;
  productUrlName: string;
  marketPrice: number | null;
  lowestPrice: number | null;
  medianPrice: number | null;
  foilOnly: boolean;
  normalOnly: boolean | null;
}

// ── Fetch all Sorcery products from TCGplayer search ──
async function fetchAllTcgProducts(): Promise<TcgProduct[]> {
  const allProducts: TcgProduct[] = [];
  let from = 0;
  let total = Infinity;

  console.log("Fetching TCGplayer product catalog...");

  while (from < total) {
    const body = {
      algorithm: "",
      from,
      size: PAGE_SIZE,
      filters: {
        term: {
          productLineName: ["sorcery-contested-realm"],
          productTypeName: ["Cards"],
        },
        range: {},
        match: {},
      },
      listingSearch: {
        filters: {
          term: {},
          range: {},
          exclude: { channelExclusion: 0 },
        },
        context: { cart: {} },
      },
      context: { cart: {}, shippingCountry: "US" },
    };

    const res = await fetch(`${SEARCH_API}?q=&isList=false`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`Search API error: ${res.status} at offset ${from}`);
      break;
    }

    const data = await res.json();
    const result = data.results?.[0];
    if (!result) break;

    total = result.totalResults;
    const items = result.results || [];

    for (const item of items) {
      allProducts.push({
        productId: Math.round(item.productId),
        productName: item.productName,
        setName: item.setName,
        setUrlName: item.setUrlName,
        productUrlName: item.productUrlName,
        marketPrice: item.marketPrice,
        lowestPrice: item.lowestPrice,
        medianPrice: item.medianPrice,
        foilOnly: item.foilOnly ?? false,
        normalOnly: item.normalOnly ?? false,
      });
    }

    from += PAGE_SIZE;
    process.stdout.write(
      `\r  ${allProducts.length}/${total} products fetched...`
    );
    if (from < total) await sleep(DELAY_MS);
  }

  console.log(`\n  Done: ${allProducts.length} products total.`);
  return allProducts;
}

// ── Match TCGplayer products to our variants ──
async function matchAndUpsertProducts(
  prisma: PrismaClient,
  tcgProducts: TcgProduct[]
) {
  // Load all our variants with card name + set info
  const variants = await prisma.cardVariant.findMany({
    select: {
      id: true,
      finish: true,
      card: { select: { name: true } },
      set: { select: { set: { select: { name: true, slug: true } } } },
    },
  });

  // Build lookup: "cardname|setslug|finish" → variantId
  const variantMap = new Map<string, string>();
  for (const v of variants) {
    const key = `${v.card.name.toLowerCase()}|${v.set.set.slug}|${v.finish.toLowerCase()}`;
    variantMap.set(key, v.id);
  }

  let matched = 0;
  let unmatched = 0;
  const unmatchedNames: string[] = [];

  for (const tcg of tcgProducts) {
    const { printing, finish } = tcgPrintingToFinish(tcg.productName);
    const cardName = cleanCardName(tcg.productName);
    const setSlug = SET_MAP[tcg.setName.toLowerCase()];

    if (!setSlug) {
      unmatched++;
      if (!unmatchedNames.includes(`[set: ${tcg.setName}]`)) {
        unmatchedNames.push(`[set: ${tcg.setName}]`);
      }
      continue;
    }

    const key = `${cardName.toLowerCase()}|${setSlug}|${finish.toLowerCase()}`;
    const variantId = variantMap.get(key) ?? null;

    if (variantId) {
      matched++;
    } else {
      unmatched++;
      if (unmatchedNames.length < 20) {
        unmatchedNames.push(
          `${cardName} (${tcg.setName}, ${printing})`
        );
      }
    }

    const productUrl = `https://www.tcgplayer.com/product/${tcg.productId}/${encodeURIComponent(tcg.setUrlName)}-${encodeURIComponent(tcg.productUrlName)}`;

    await prisma.tcgplayerProduct.upsert({
      where: { id: tcg.productId },
      create: {
        id: tcg.productId,
        cardName,
        setName: tcg.setName,
        printing,
        productUrl,
        variantId,
      },
      update: {
        cardName,
        setName: tcg.setName,
        printing,
        productUrl,
        variantId: variantId ?? undefined,
      },
    });
  }

  console.log(
    `  Matched: ${matched} | Unmatched: ${unmatched}`
  );
  if (unmatchedNames.length > 0) {
    console.log(`  Sample unmatched: ${unmatchedNames.slice(0, 10).join(", ")}`);
  }
}

// ── Sync prices from search results ──
async function syncPricesFromSearch(
  prisma: PrismaClient,
  tcgProducts: TcgProduct[]
) {
  console.log("Inserting price snapshots...");
  const now = new Date();
  let count = 0;

  // Batch insert for performance
  const snapshots = tcgProducts
    .filter((p) => p.marketPrice != null || p.lowestPrice != null)
    .map((p) => ({
      tcgplayerProductId: p.productId,
      marketPrice: p.marketPrice,
      lowPrice: p.lowestPrice,
      medianPrice: p.medianPrice,
      recordedAt: now,
    }));

  // Prisma doesn't support createMany with relations well, so chunk it
  const CHUNK = 100;
  for (let i = 0; i < snapshots.length; i += CHUNK) {
    const chunk = snapshots.slice(i, i + CHUNK);
    await prisma.priceSnapshot.createMany({ data: chunk });
    count += chunk.length;
    process.stdout.write(`\r  ${count}/${snapshots.length} snapshots...`);
  }
  console.log(`\n  Done: ${count} price snapshots recorded.`);
}

// ── Prices-only mode: fetch fresh prices for existing products ──
async function syncPricesOnly(prisma: PrismaClient) {
  const products = await prisma.tcgplayerProduct.findMany({
    select: { id: true },
  });

  console.log(`Fetching prices for ${products.length} known products...`);

  // Re-fetch from search API to get current prices
  const allProducts = await fetchAllTcgProducts();
  const priceMap = new Map(allProducts.map((p) => [p.productId, p]));

  const now = new Date();
  const snapshots: Array<{
    tcgplayerProductId: number;
    marketPrice: number | null;
    lowPrice: number | null;
    medianPrice: number | null;
    recordedAt: Date;
  }> = [];

  for (const prod of products) {
    const tcg = priceMap.get(prod.id);
    if (tcg && (tcg.marketPrice != null || tcg.lowestPrice != null)) {
      snapshots.push({
        tcgplayerProductId: prod.id,
        marketPrice: tcg.marketPrice,
        lowPrice: tcg.lowestPrice,
        medianPrice: tcg.medianPrice,
        recordedAt: now,
      });
    }
  }

  const CHUNK = 100;
  let count = 0;
  for (let i = 0; i < snapshots.length; i += CHUNK) {
    await prisma.priceSnapshot.createMany({
      data: snapshots.slice(i, i + CHUNK),
    });
    count += snapshots.slice(i, i + CHUNK).length;
    process.stdout.write(`\r  ${count}/${snapshots.length} snapshots...`);
  }
  console.log(`\n  Done: ${count} price snapshots recorded.`);
}

// ── Main ──
async function main() {
  const pricesOnly = process.argv.includes("--prices-only");
  const pool = new pg.Pool({ connectionString: DB_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    if (pricesOnly) {
      console.log("=== TCGplayer Price Sync (prices only) ===");
      await syncPricesOnly(prisma);
    } else {
      console.log("=== TCGplayer Full Sync (products + prices) ===");
      const tcgProducts = await fetchAllTcgProducts();
      await matchAndUpsertProducts(prisma, tcgProducts);
      await syncPricesFromSearch(prisma, tcgProducts);
    }

    // Stats
    const productCount = await prisma.tcgplayerProduct.count();
    const matchedCount = await prisma.tcgplayerProduct.count({
      where: { variantId: { not: null } },
    });
    const snapshotCount = await prisma.priceSnapshot.count();
    console.log(
      `\n=== Summary ===\nProducts: ${productCount} (${matchedCount} matched to variants)\nPrice snapshots: ${snapshotCount}`
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
