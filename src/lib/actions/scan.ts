"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { batchAddToCollection } from "@/lib/actions/collection";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ScanCandidate {
  cardId: string;
  name: string;
  slug: string | null;
  confidence: number;
  distance: number;
  rotation: string;
}

/** A resolved variant with display info + price */
export interface ResolvedVariant {
  variantId: string;
  slug: string | null;
  setName: string;
  setSlug: string;
  finish: string;
  /** Market price in USD, or null if unknown */
  price: number | null;
}

/** All available variants for a card (for the variant picker) */
export interface CardVariantOption {
  variantId: string;
  slug: string | null;
  setName: string;
  setSlug: string;
  finish: string;
  price: number | null;
}

export interface ScanResult {
  match: {
    cardId: string;
    name: string;
    slug: string | null;
    confidence: number;
    distance: number;
    rotation: string;
  } | null;
  candidates: ScanCandidate[];
  method: "detected" | "fallback" | null;
  latencyMs: number;
  noDetection: boolean;
  error?: string;
}

export interface ScanSessionItem {
  cardId: string;
  variantId: string;
  name: string;
  slug: string | null;
  setName: string;
  setSlug: string;
  finish: string;
  price: number | null;
  quantity: number;
}

export interface ScanSet {
  id: string;
  name: string;
  slug: string;
  cardCount: number;
}

// ── Confidence thresholds ────────────────────────────────────────────────────
const CONF_HIGH = 0.7;
const CONF_NO_DETECT = 0.45;

// ── Raw API types ────────────────────────────────────────────────────────────
interface LensApiEntry {
  cardId: string;
  name: string;
  slug: string;
  distance: number;
  confidence: number;
  rotation: string;
}

interface LensApiResponse {
  results: LensApiEntry[];
  method: "detected" | "fallback";
  time_ms: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Identify card via sorcery-lens ─────────────────────────────────────────────

export async function identifyCard(frameBase64: string): Promise<ScanResult> {
  const lensUrl = process.env.SORCERY_LENS_URL;
  const apiKey = process.env.SORCERY_LENS_API_KEY;

  if (!lensUrl) {
    return {
      match: null, candidates: [], method: null, latencyMs: 0,
      noDetection: true, error: "Scanner service not configured",
    };
  }

  const raw = frameBase64.includes(",")
    ? frameBase64.split(",")[1]!
    : frameBase64;

  const buffer = Buffer.from(raw, "base64");
  const blob = new Blob([buffer], { type: "image/jpeg" });

  const headers: Record<string, string> = {};
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const MAX_RETRIES = 3;
  let attempt = 0;
  const t0 = Date.now();

  while (attempt <= MAX_RETRIES) {
    try {
      const formData = new FormData();
      formData.append("image", blob, "frame.jpg");

      const res = await fetch(`${lensUrl}/identify`, {
        method: "POST",
        headers,
        body: formData,
        signal: AbortSignal.timeout(8000),
      });

      const latencyMs = Date.now() - t0;

      if (!res.ok) {
        if (res.status === 429 && attempt < MAX_RETRIES) {
          await sleep(1000 * Math.pow(2, attempt));
          attempt++;
          continue;
        }

        const errMsg =
          res.status === 401 ? "Invalid API key"
          : res.status === 422 ? "Invalid image — try a different photo"
          : res.status === 429 ? "Too many requests — please wait"
          : res.status === 503 ? "Scanner temporarily unavailable"
          : `Scanner error (${res.status})`;

        return {
          match: null, candidates: [], method: null, latencyMs,
          noDetection: true, error: errMsg,
        };
      }

      const data: LensApiResponse = await res.json();
      const results = data.results ?? [];
      const method = data.method ?? "fallback";

      if (results.length === 0) {
        return { match: null, candidates: [], method, latencyMs, noDetection: true };
      }

      const top = results[0];
      if (method === "fallback" && top.confidence < CONF_NO_DETECT) {
        return { match: null, candidates: [], method, latencyMs, noDetection: true };
      }

      const match = {
        cardId: top.cardId,
        name: top.name,
        slug: top.slug ?? null,
        confidence: top.confidence,
        distance: top.distance,
        rotation: top.rotation,
      };

      // Deduplicate candidates by cardId (different variants of same card)
      const seenIds = new Set([top.cardId]);
      const candidates: ScanCandidate[] = [];
      for (const r of results.slice(1)) {
        if (!seenIds.has(r.cardId)) {
          seenIds.add(r.cardId);
          candidates.push({
            cardId: r.cardId, name: r.name, slug: r.slug ?? null,
            confidence: r.confidence, distance: r.distance, rotation: r.rotation,
          });
        }
        if (candidates.length >= 3) break;
      }

      return { match, candidates, method, latencyMs, noDetection: false };
    } catch (e) {
      const latencyMs = Date.now() - t0;
      const msg = e instanceof Error ? e.message : "Scanner unavailable";
      if (attempt < MAX_RETRIES && (msg.includes("timeout") || msg.includes("fetch"))) {
        await sleep(1000 * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      return {
        match: null, candidates: [], method: null, latencyMs,
        noDetection: true,
        error: msg.includes("timeout") ? "Connection lost, retrying…" : "Scanner unavailable",
      };
    }
  }

  return {
    match: null, candidates: [], method: null, latencyMs: Date.now() - t0,
    noDetection: true, error: "Scanner unavailable",
  };
}

// ── Resolve variant for a card (with price) ──────────────────────────────────

export async function resolveVariantForCard(
  cardId: string,
  setSlug: string | null,
  preferFoil: boolean = false,
): Promise<ResolvedVariant | null> {
  const variantSelect = {
    id: true,
    slug: true,
    finish: true,
    set: {
      select: {
        set: {
          select: { name: true, slug: true, releasedAt: true },
        },
      },
    },
    tcgplayerProducts: {
      select: {
        priceSnapshots: {
          orderBy: { recordedAt: "desc" as const },
          take: 1,
          select: { marketPrice: true },
        },
      },
      take: 1,
    },
  };

  // Desired finish: Standard by default, Foil only if explicitly toggled
  const targetFinish = preferFoil ? "Foil" : "Standard";

  // 1. If user locked a set, try that set + target finish first
  if (setSlug) {
    const inSet = await prisma.cardVariant.findFirst({
      where: { cardId, finish: targetFinish, set: { set: { slug: setSlug } } },
      select: variantSelect,
    });
    if (inSet) return toResolved(inSet);

    // Fallback: any finish in locked set
    const anyFinish = await prisma.cardVariant.findFirst({
      where: { cardId, set: { set: { slug: setSlug } } },
      orderBy: { finish: "asc" },
      select: variantSelect,
    });
    if (anyFinish) return toResolved(anyFinish);
  }

  // 2. No locked set → latest set, Standard finish
  //    Order by set release date DESC → newest set first
  const latest = await prisma.cardVariant.findFirst({
    where: { cardId, finish: targetFinish },
    orderBy: { set: { set: { releasedAt: "desc" } } },
    select: variantSelect,
  });
  if (latest) return toResolved(latest);

  // 3. Absolute fallback: any variant, Standard preferred
  const fallback = await prisma.cardVariant.findFirst({
    where: { cardId },
    orderBy: [{ finish: "asc" }, { set: { set: { releasedAt: "desc" } } }],
    select: variantSelect,
  });
  if (!fallback) return null;
  return toResolved(fallback);
}

/** Check if a foil variant exists for a card in a given set */
export async function hasFoilVariant(
  cardId: string,
  setSlug: string,
): Promise<boolean> {
  const count = await prisma.cardVariant.count({
    where: { cardId, finish: "Foil", set: { set: { slug: setSlug } } },
  });
  return count > 0;
}

/** Get the foil/standard counterpart of a variant */
export async function toggleFinish(
  cardId: string,
  setSlug: string,
  currentFinish: string,
): Promise<ResolvedVariant | null> {
  const newFinish = currentFinish === "Foil" ? "Standard" : "Foil";
  return resolveVariantForCard(cardId, setSlug, newFinish === "Foil");
}

function toResolved(v: {
  id: string;
  slug: string;
  finish: string;
  set: { set: { name: string; slug: string; releasedAt: Date | null } };
  tcgplayerProducts: { priceSnapshots: { marketPrice: number | null }[] }[];
}): ResolvedVariant {
  return {
    variantId: v.id,
    slug: v.slug,
    setName: v.set.set.name,
    setSlug: v.set.set.slug,
    finish: v.finish,
    price: v.tcgplayerProducts[0]?.priceSnapshots[0]?.marketPrice ?? null,
  };
}

// ── Get all variants for a card (for variant picker in result card) ──────────

export async function getCardVariants(cardId: string): Promise<CardVariantOption[]> {
  const variantSelect = {
    id: true,
    slug: true,
    finish: true,
    set: { select: { set: { select: { name: true, slug: true } } } },
    tcgplayerProducts: {
      select: {
        priceSnapshots: {
          orderBy: { recordedAt: "desc" as const },
          take: 1,
          select: { marketPrice: true },
        },
      },
      take: 1,
    },
  };

  const variants = await prisma.cardVariant.findMany({
    where: { cardId },
    orderBy: [{ createdAt: "desc" }, { finish: "asc" }],
    select: variantSelect,
  });

  return variants.map((v) => ({
    variantId: v.id,
    slug: v.slug,
    setName: v.set.set.name,
    setSlug: v.set.set.slug,
    finish: v.finish,
    price: v.tcgplayerProducts[0]?.priceSnapshots[0]?.marketPrice ?? null,
  }));
}

// ── Get ALL sets (for the session-wide set locker) ──────────────────────────

export async function getScanSets(): Promise<ScanSet[]> {
  const sets = await prisma.set.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { cardSets: true } },
    },
    orderBy: { releasedAt: "desc" },
  });

  return sets.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    cardCount: s._count.cardSets,
  }));
}

// ── Get sets where a specific card exists (for per-card set picker) ─────────

export async function getSetsForCard(cardId: string): Promise<ScanSet[]> {
  // Find all sets that have at least one variant of this card
  const sets = await prisma.set.findMany({
    where: {
      cardSets: {
        some: {
          variants: { some: { cardId } },
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { cardSets: true } },
    },
    orderBy: { releasedAt: "desc" },
  });

  return sets.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    cardCount: s._count.cardSets,
  }));
}

// ── Commit scan session to collection ─────────────────────────────────────────

export async function commitScanSession(
  items: ScanSessionItem[],
): Promise<{ added: number }> {
  if (items.length === 0) return { added: 0 };
  await requireUser();

  const batch = items.map((item) => ({
    cardId: item.cardId,
    variantId: item.variantId,
    quantity: item.quantity,
  }));

  const result = await batchAddToCollection(batch);
  return { added: result.added };
}
