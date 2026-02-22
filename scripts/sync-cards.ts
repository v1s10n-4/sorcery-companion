/**
 * Sync cards from the Sorcery: Contested Realm public API
 * Run: npx tsx scripts/sync-cards.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const API_URL = "https://api.sorcerytcg.com/api/cards";

// Known keywords to extract from rules text
const KEYWORDS = [
  "Airborne", "Amphibious", "Burrow", "Deathtouch", "Defender",
  "Genesis", "Guardian", "Lethal", "Ranged", "Stealth", "Submerge",
  "Spellcaster", "Disable", "Immobile", "Indestructible", "Legendary",
  "Projectile", "Voidwalk", "Ward", "Wither",
];

function extractKeywords(rulesText: string | null): string[] {
  if (!rulesText) return [];
  const found: string[] = [];
  for (const kw of KEYWORDS) {
    if (rulesText.includes(kw)) {
      found.push(kw);
    }
  }
  return found;
}

function slugifySetName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseElements(elements: string | null): string[] {
  if (!elements || elements === "None") return [];
  return elements.split(",").map((e) => e.trim()).filter(Boolean);
}

function parseSubTypes(subTypes: string | null): string[] {
  if (!subTypes) return [];
  return subTypes.split(",").map((s) => s.trim()).filter(Boolean);
}

interface ApiThresholds {
  air: number;
  earth: number;
  fire: number;
  water: number;
}

interface ApiMetadata {
  rarity: string | null;
  type: string;
  rulesText: string | null;
  cost: number | null;
  attack: number | null;
  defence: number | null;
  life: number | null;
  thresholds: ApiThresholds;
}

interface ApiVariant {
  slug: string;
  finish: string;
  product: string;
  artist: string | null;
  flavorText: string | null;
  typeText: string | null;
}

interface ApiSet {
  name: string;
  releasedAt: string | null;
  metadata: ApiMetadata;
  variants: ApiVariant[];
}

interface ApiCard {
  name: string;
  guardian: ApiMetadata;
  elements: string | null;
  subTypes: string | null;
  sets: ApiSet[];
}

async function syncCards() {
  console.log("Fetching cards from API...");
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`API returned ${response.status}`);

  const cards: ApiCard[] = await response.json();
  console.log(`Fetched ${cards.length} cards`);

  // Step 1: Create/update all Sets
  const setMap = new Map<string, string>(); // name → id
  const setsFromApi = new Map<string, { name: string; releasedAt: string | null }>();

  for (const apiCard of cards) {
    for (const apiSet of apiCard.sets) {
      if (!setsFromApi.has(apiSet.name)) {
        setsFromApi.set(apiSet.name, {
          name: apiSet.name,
          releasedAt: apiSet.releasedAt,
        });
      }
    }
  }

  for (const [name, data] of setsFromApi) {
    const set = await prisma.set.upsert({
      where: { name },
      update: {
        releasedAt: data.releasedAt ? new Date(data.releasedAt) : null,
      },
      create: {
        name,
        slug: slugifySetName(name),
        releasedAt: data.releasedAt ? new Date(data.releasedAt) : null,
      },
    });
    setMap.set(name, set.id);
  }

  console.log(`Synced ${setMap.size} sets`);

  // Step 2: Create/update cards, card-sets, and variants
  let cardCount = 0;

  for (const apiCard of cards) {
    const guardian = apiCard.guardian;
    const elements = parseElements(apiCard.elements);
    const subTypes = parseSubTypes(apiCard.subTypes);
    const keywords = extractKeywords(guardian.rulesText);

    const card = await prisma.card.upsert({
      where: { name: apiCard.name },
      update: {
        type: guardian.type,
        rarity: guardian.rarity,
        rulesText: guardian.rulesText,
        cost: guardian.cost,
        attack: guardian.attack,
        defence: guardian.defence,
        life: guardian.life,
        elements,
        subTypes,
        keywords,
        thresholdAir: guardian.thresholds.air,
        thresholdEarth: guardian.thresholds.earth,
        thresholdFire: guardian.thresholds.fire,
        thresholdWater: guardian.thresholds.water,
      },
      create: {
        name: apiCard.name,
        type: guardian.type,
        rarity: guardian.rarity,
        rulesText: guardian.rulesText,
        cost: guardian.cost,
        attack: guardian.attack,
        defence: guardian.defence,
        life: guardian.life,
        elements,
        subTypes,
        keywords,
        thresholdAir: guardian.thresholds.air,
        thresholdEarth: guardian.thresholds.earth,
        thresholdFire: guardian.thresholds.fire,
        thresholdWater: guardian.thresholds.water,
      },
    });

    for (const apiSet of apiCard.sets) {
      const setId = setMap.get(apiSet.name)!;

      const cardSet = await prisma.cardSet.upsert({
        where: {
          cardId_setId: { cardId: card.id, setId },
        },
        update: {
          rarity: apiSet.metadata.rarity,
          type: apiSet.metadata.type,
          rulesText: apiSet.metadata.rulesText,
          cost: apiSet.metadata.cost,
          attack: apiSet.metadata.attack,
          defence: apiSet.metadata.defence,
          life: apiSet.metadata.life,
          thresholdAir: apiSet.metadata.thresholds.air,
          thresholdEarth: apiSet.metadata.thresholds.earth,
          thresholdFire: apiSet.metadata.thresholds.fire,
          thresholdWater: apiSet.metadata.thresholds.water,
        },
        create: {
          cardId: card.id,
          setId,
          rarity: apiSet.metadata.rarity,
          type: apiSet.metadata.type,
          rulesText: apiSet.metadata.rulesText,
          cost: apiSet.metadata.cost,
          attack: apiSet.metadata.attack,
          defence: apiSet.metadata.defence,
          life: apiSet.metadata.life,
          thresholdAir: apiSet.metadata.thresholds.air,
          thresholdEarth: apiSet.metadata.thresholds.earth,
          thresholdFire: apiSet.metadata.thresholds.fire,
          thresholdWater: apiSet.metadata.thresholds.water,
        },
      });

      for (const apiVariant of apiSet.variants) {
        await prisma.cardVariant.upsert({
          where: { slug: apiVariant.slug },
          update: {
            finish: apiVariant.finish,
            product: apiVariant.product,
            artist: apiVariant.artist,
            flavorText: apiVariant.flavorText,
            typeText: apiVariant.typeText,
          },
          create: {
            slug: apiVariant.slug,
            finish: apiVariant.finish,
            product: apiVariant.product,
            artist: apiVariant.artist,
            flavorText: apiVariant.flavorText,
            typeText: apiVariant.typeText,
            cardId: card.id,
            setId: cardSet.id,
          },
        });
      }
    }

    cardCount++;
  }

  // Step 3: Update set card counts
  for (const [name, setId] of setMap) {
    const count = await prisma.cardSet.count({ where: { setId } });
    await prisma.set.update({ where: { id: setId }, data: { cardCount: count } });
    console.log(`  ${name}: ${count} cards`);
  }

  console.log(`\nSync complete: ${cardCount} cards processed`);
}

syncCards()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
