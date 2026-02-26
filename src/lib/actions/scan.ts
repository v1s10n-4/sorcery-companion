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
): Promise<ResolvedVariant | null> {
  const where = setSlug
    ? { cardId, set: { set: { slug: setSlug } } }
    : { cardId };

  // Try selected set first, then fallback to any
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

  let variant = await prisma.cardVariant.findFirst({
    where,
    orderBy: [{ finish: "asc" }, { createdAt: "desc" }],
    select: variantSelect,
  });

  if (!variant && setSlug) {
    variant = await prisma.cardVariant.findFirst({
      where: { cardId },
      orderBy: [{ finish: "asc" }, { createdAt: "desc" }],
      select: variantSelect,
    });
  }

  if (!variant) return null;

  const price = variant.tcgplayerProducts[0]?.priceSnapshots[0]?.marketPrice ?? null;

  return {
    variantId: variant.id,
    slug: variant.slug,
    setName: variant.set.set.name,
    setSlug: variant.set.set.slug,
    finish: variant.finish,
    price,
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

// ── Get available sets ───────────────────────────────────────────────────────

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
