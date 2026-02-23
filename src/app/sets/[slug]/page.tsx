import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CardImage } from "@/components/card-image";
import { SetDetailSkeleton } from "@/components/skeletons";
import { SetPagination } from "./pagination";
import { getSetBySlug, getSetCards, getAllSetSlugs } from "@/lib/data";

export const revalidate = 3600;

const PAGE_SIZE = 42;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

// ── Static params (pre-render all sets) ──

export async function generateStaticParams() {
  const sets = await getAllSetSlugs();
  return sets.map((s) => ({ slug: s.slug }));
}

// ── Metadata ──

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const set = await getSetBySlug(slug);
  if (!set) return { title: "Set Not Found" };
  return {
    title: `${set.name} — Sorcery Companion`,
    description: `Browse ${set.cardCount} cards from ${set.name} in Sorcery: Contested Realm.`,
  };
}

// ── Page ──

export default async function SetDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr || "1", 10));

  const set = await getSetBySlug(slug);
  if (!set) notFound();

  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <Link
        href="/sets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        All sets
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif text-amber-100">
          {set.name}
        </h1>
        <div className="flex gap-3 text-muted-foreground mt-1 text-sm">
          <span>{set.cardCount} cards</span>
          {set.releasedAt && (
            <span>
              Released{" "}
              {new Date(set.releasedAt).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      <Suspense fallback={<SetDetailSkeleton />}>
        <SetCardGrid setId={set.id} page={page} />
      </Suspense>
    </main>
  );
}

// ── Async card grid ──

async function SetCardGrid({ setId, page }: { setId: string; page: number }) {
  const { cards, totalCount } = await getSetCards(setId, page, PAGE_SIZE);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (cards.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg">No cards in this set</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={`/cards/${card.id}`}
            className="group"
            prefetch={false}
          >
            <div className="relative overflow-hidden rounded-lg bg-muted/30">
              {card.variants[0] ? (
                <CardImage
                  slug={card.variants[0].slug}
                  name={card.name}
                  width={260}
                  height={364}
                  blurDataUrl={card.variants[0].blurDataUrl}
                  className="w-full h-auto transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <div className="aspect-[5/7] flex items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            <p className="text-[11px] mt-1 text-center truncate text-muted-foreground group-hover:text-foreground transition-colors px-0.5">
              {card.name}
            </p>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <SetPagination currentPage={page} totalPages={totalPages} />
      )}
    </>
  );
}
