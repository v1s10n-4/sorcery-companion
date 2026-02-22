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

interface ApiThresholds {
  air: number;
  earth: number;
  fire: number;
  water: number;
}

interface ApiMetadata {
  rarity: string;
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
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const cards: ApiCard[] = await response.json();
  console.log(`Fetched ${cards.length} cards`);

  let created = 0;
  let updated = 0;

  for (const apiCard of cards) {
    const guardian = apiCard.guardian;

    // Upsert the card
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
        elements: apiCard.elements,
        subTypes: apiCard.subTypes,
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
        elements: apiCard.elements,
        subTypes: apiCard.subTypes,
        thresholdAir: guardian.thresholds.air,
        thresholdEarth: guardian.thresholds.earth,
        thresholdFire: guardian.thresholds.fire,
        thresholdWater: guardian.thresholds.water,
      },
    });

    // Upsert sets and variants
    for (const apiSet of apiCard.sets) {
      const set = await prisma.cardSet.upsert({
        where: {
          cardId_name: { cardId: card.id, name: apiSet.name },
        },
        update: {
          releasedAt: apiSet.releasedAt ? new Date(apiSet.releasedAt) : null,
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
          name: apiSet.name,
          cardId: card.id,
          releasedAt: apiSet.releasedAt ? new Date(apiSet.releasedAt) : null,
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
            setId: set.id,
          },
        });
      }
    }

    created++;
  }

  console.log(`Sync complete: ${created} cards processed`);
}

syncCards()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
