import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CardDetailSkeleton } from "@/components/skeletons";
import { CardDetailView } from "@/components/card-detail-view";
import { getCard } from "@/lib/data";
import type { CardDetail, Printing, VariantPrice } from "@/lib/types";
import { getUser } from "@/lib/auth";


interface PageProps {
  params: Promise<{ id: string }>;
}

// ── Metadata ──

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return { title: "Card Not Found" };
  return {
    title: `${card.name} — Sorcery Companion`,
    description: `${card.name} is a${card.rarity ? ` ${card.rarity}` : ""} ${card.type} in Sorcery: Contested Realm.`,
  };
}

// ── Page ──

export default async function CardDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to cards
      </Link>

      <Suspense fallback={<CardDetailSkeleton />}>
        <CardDetailContent id={id} />
      </Suspense>
    </main>
  );
}

// ── Async data component ──

async function CardDetailContent({ id }: { id: string }) {
  const [raw, user] = await Promise.all([getCard(id), getUser()]);
  if (!raw) notFound();

  // Serialize into a clean, client-safe shape
  const printings: Printing[] = raw.sets.map((cs) => ({
    id: cs.id,
    setName: cs.set.name,
    setSlug: cs.set.slug,
    releasedAt: cs.set.releasedAt ? String(cs.set.releasedAt) : null,
    rarity: cs.rarity,
    type: cs.type,
    rulesText: cs.rulesText,
    cost: cs.cost,
    attack: cs.attack,
    defence: cs.defence,
    life: cs.life,
    thresholdAir: cs.thresholdAir,
    thresholdEarth: cs.thresholdEarth,
    thresholdFire: cs.thresholdFire,
    thresholdWater: cs.thresholdWater,
    variants: [...cs.variants].sort((a, b) => {
      // Standard first, then alphabetical
      if (a.finish === "Standard" && b.finish !== "Standard") return -1;
      if (b.finish === "Standard" && a.finish !== "Standard") return 1;
      return a.finish.localeCompare(b.finish);
    }).map((v) => ({
      id: v.id,
      slug: v.slug,
      finish: v.finish,
      product: v.product,
      artist: v.artist,
      flavorText: v.flavorText,
      typeText: v.typeText,
      blurDataUrl: v.blurDataUrl,
      prices: (v.tcgplayerProducts ?? []).map((tp): VariantPrice => {
        const latest = tp.priceSnapshots[0];
        // Deduplicate snapshots by date, keep latest per day
        const byDate = new Map<string, number>();
        for (const snap of [...tp.priceSnapshots].reverse()) {
          if (snap.marketPrice != null) {
            const date = String(snap.recordedAt).slice(0, 10);
            byDate.set(date, snap.marketPrice);
          }
        }
        return {
          tcgplayerProductId: tp.id,
          productUrl: tp.productUrl,
          printing: tp.printing,
          marketPrice: latest?.marketPrice ?? null,
          lowPrice: latest?.lowPrice ?? null,
          medianPrice: latest?.medianPrice ?? null,
          history: Array.from(byDate, ([date, price]) => ({ date, price })),
        };
      }),
    })),
  }));

  const card: CardDetail = {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    rarity: raw.rarity,
    rulesText: raw.rulesText,
    cost: raw.cost,
    attack: raw.attack,
    defence: raw.defence,
    life: raw.life,
    elements: raw.elements,
    keywords: raw.keywords,
    subTypes: raw.subTypes,
    thresholdAir: raw.thresholdAir,
    thresholdEarth: raw.thresholdEarth,
    thresholdFire: raw.thresholdFire,
    thresholdWater: raw.thresholdWater,
    printings,
  };

  return <CardDetailView card={card} isLoggedIn={!!user} />;
}
