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
  setName?: string;
}

export interface ScanResult {
  match: {
    cardId: string;
    name: string;
    slug: string | null;
    confidence: number;
  } | null;
  candidates: ScanCandidate[];
  latencyMs: number;
  error?: string;
}

export interface ScanSessionItem {
  cardId: string;
  variantId: string;
  name: string;
  slug: string | null;
  quantity: number;
}

export interface ScanSet {
  id: string;
  name: string;
  slug: string;
  cardCount: number;
}

// ── Identify card via sorcery-lens ─────────────────────────────────────────────

/**
 * Send a base64-encoded JPEG frame to sorcery-lens for identification.
 * Returns the top match + up to 3 candidates.
 * Gracefully returns error result if service is unavailable.
 */
export async function identifyCard(frameBase64: string): Promise<ScanResult> {
  const lensUrl = process.env.SORCERY_LENS_URL;
  if (!lensUrl) {
    return {
      match: null,
      candidates: [],
      latencyMs: 0,
      error: "Scanner service not configured",
    };
  }

  const t0 = Date.now();
  try {
    const res = await fetch(`${lensUrl}/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: frameBase64 }),
      signal: AbortSignal.timeout(8000),
    });

    const latencyMs = Date.now() - t0;

    if (!res.ok) {
      return {
        match: null,
        candidates: [],
        latencyMs,
        error: `Scanner service error (${res.status})`,
      };
    }

    const data = await res.json();
    return {
      match: data.match ?? null,
      candidates: data.candidates ?? [],
      latencyMs,
    };
  } catch (e) {
    return {
      match: null,
      candidates: [],
      latencyMs: Date.now() - t0,
      error: e instanceof Error ? e.message : "Scanner unavailable",
    };
  }
}

// ── Resolve which variant to use for a scanned card ───────────────────────────

/**
 * Given a cardId and optional setSlug (from the set picker),
 * returns the best variantId + image slug to use for collection add.
 * Falls back to the default variant if card isn't in the selected set.
 */
export async function resolveVariantForCard(
  cardId: string,
  setSlug: string | null
): Promise<{ variantId: string; slug: string | null; setName: string } | null> {
  // Try to find a variant in the requested set first
  if (setSlug) {
    const inSet = await prisma.cardVariant.findFirst({
      where: {
        cardId,
        set: { set: { slug: setSlug } },
      },
      orderBy: { finish: "asc" }, // Standard before foil
      select: {
        id: true,
        slug: true,
        set: { select: { set: { select: { name: true } } } },
      },
    });
    if (inSet) {
      return {
        variantId: inSet.id,
        slug: inSet.slug,
        setName: inSet.set.set.name,
      };
    }
  }

  // Fall back to default variant (first by finish asc)
  const fallback = await prisma.cardVariant.findFirst({
    where: { cardId },
    orderBy: [{ finish: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      set: { select: { set: { select: { name: true } } } },
    },
  });

  if (!fallback) return null;
  return {
    variantId: fallback.id,
    slug: fallback.slug,
    setName: fallback.set.set.name,
  };
}

// ── Get available sets for the set picker ──────────────────────────────────────

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

/**
 * Add all items from the scan session to the user's collection.
 * Uses explicit variantIds so the correct printing is recorded.
 */
export async function commitScanSession(
  items: ScanSessionItem[]
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
