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
  /** Populated after variant resolution for display in picker */
  setName?: string;
}

export interface ScanResult {
  match: {
    cardId: string;
    name: string;
    /** Variant slug from the lens API (for image display) */
    slug: string | null;
    confidence: number;
    distance: number;
    rotation: string;
  } | null;
  /** Additional results for uncertain-confidence picker */
  candidates: ScanCandidate[];
  /** "detected" = card contour found; "fallback" = center-crop guess */
  method: "detected" | "fallback" | null;
  latencyMs: number;
  /** True when results are empty OR method=fallback AND conf < CONF_NO_DETECT */
  noDetection: boolean;
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

// ── Confidence thresholds (mirrors scanner-view.tsx) ──────────────────────────
const CONF_HIGH = 0.7;       // ≥ 0.7 → auto-add
const CONF_NO_DETECT = 0.45; // < 0.45 → no detection, don't even show a result

// ── Raw API shape from sorcery-lens ──────────────────────────────────────────
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

// ── Sleep helper for retry backoff ────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Identify card via sorcery-lens ─────────────────────────────────────────────

/**
 * Send a JPEG frame (base64-encoded) to sorcery-lens for identification.
 * POSTs as multipart/form-data with Bearer auth.
 * Retries up to 3× on 429 with exponential backoff (1s → 2s → 4s).
 * Gracefully returns an error result if the service is unavailable.
 */
export async function identifyCard(frameBase64: string): Promise<ScanResult> {
  const lensUrl = process.env.SORCERY_LENS_URL;
  const apiKey = process.env.SORCERY_LENS_API_KEY;

  if (!lensUrl) {
    return {
      match: null,
      candidates: [],
      method: null,
      latencyMs: 0,
      noDetection: true,
      error: "Scanner service not configured",
    };
  }

  // Convert base64 → Buffer → Blob for FormData
  const buffer = Buffer.from(frameBase64, "base64");
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

      // ── HTTP error handling ────────────────────────────────────────────────
      if (!res.ok) {
        if (res.status === 429) {
          // Rate limited — exponential backoff then retry
          if (attempt < MAX_RETRIES) {
            await sleep(1000 * Math.pow(2, attempt));
            attempt++;
            continue;
          }
          return {
            match: null, candidates: [], method: null, latencyMs,
            noDetection: true,
            error: "Too many requests — please wait a moment",
          };
        }

        const errMsg =
          res.status === 401
            ? "Invalid API key"
            : res.status === 422
            ? "Invalid image — try a different photo"
            : res.status === 503
            ? "Scanner temporarily unavailable"
            : `Scanner error (${res.status})`;

        return {
          match: null, candidates: [], method: null, latencyMs,
          noDetection: true,
          error: errMsg,
        };
      }

      // ── Parse new response format ──────────────────────────────────────────
      const data: LensApiResponse = await res.json();
      const results = data.results ?? [];
      const method = data.method ?? "fallback";

      // Empty results → no detection
      if (results.length === 0) {
        return {
          match: null, candidates: [], method, latencyMs,
          noDetection: true,
        };
      }

      const top = results[0];
      const conf = top.confidence;

      // Fallback method + very low confidence → treat as no detection
      if (method === "fallback" && conf < CONF_NO_DETECT) {
        return {
          match: null, candidates: [], method, latencyMs,
          noDetection: true,
        };
      }

      // Build match from top result
      const match: ScanResult["match"] = {
        cardId: top.cardId,
        name: top.name,
        slug: top.slug ?? null,
        confidence: conf,
        distance: top.distance,
        rotation: top.rotation,
      };

      // Build candidates from remaining results (for uncertain-confidence picker)
      const candidates: ScanCandidate[] = results.slice(1, 4).map((r) => ({
        cardId: r.cardId,
        name: r.name,
        slug: r.slug ?? null,
        confidence: r.confidence,
        distance: r.distance,
        rotation: r.rotation,
      }));

      // noDetection is false at this point — we have a usable result
      return { match, candidates, method, latencyMs, noDetection: false };
    } catch (e) {
      // Network / timeout errors
      const latencyMs = Date.now() - t0;
      const msg = e instanceof Error ? e.message : "Scanner unavailable";

      // Retry on timeout if we have attempts left
      if (attempt < MAX_RETRIES && (msg.includes("timeout") || msg.includes("fetch"))) {
        await sleep(1000 * Math.pow(2, attempt));
        attempt++;
        continue;
      }

      const userMsg = msg.includes("timeout")
        ? "Connection lost, retrying…"
        : "Scanner unavailable";

      return {
        match: null, candidates: [], method: null, latencyMs,
        noDetection: true,
        error: userMsg,
      };
    }
  }

  // Should never reach here
  return {
    match: null, candidates: [], method: null, latencyMs: Date.now() - t0,
    noDetection: true,
    error: "Scanner unavailable",
  };
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
