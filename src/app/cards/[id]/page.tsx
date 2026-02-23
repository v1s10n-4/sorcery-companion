import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CardDetailSkeleton } from "@/components/skeletons";
import { CardDetailView } from "@/components/card-detail-view";
import { getCard } from "@/lib/data";
import type { CardDetail, Printing } from "@/lib/types";

export const revalidate = 3600;

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
  const raw = await getCard(id);
  if (!raw) notFound();

  // Serialize into a clean, client-safe shape
  const printings: Printing[] = raw.sets.map((cs) => ({
    id: cs.id,
    setName: cs.set.name,
    setSlug: cs.set.slug,
    releasedAt: cs.set.releasedAt?.toISOString() ?? null,
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
    variants: cs.variants.map((v) => ({
      id: v.id,
      slug: v.slug,
      finish: v.finish,
      product: v.product,
      artist: v.artist,
      flavorText: v.flavorText,
      typeText: v.typeText,
      blurDataUrl: v.blurDataUrl,
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

  return <CardDetailView card={card} />;
}
