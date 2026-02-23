import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CardImage } from "@/components/card-image";
import { ChevronLeft } from "lucide-react";
import { SetPagination } from "./pagination";

const PAGE_SIZE = 42;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function SetDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr || "1", 10));

  const set = await prisma.set.findUnique({ where: { slug } });
  if (!set) notFound();

  const where = { sets: { some: { setId: set.id } } };

  const [cards, totalCount] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        variants: {
          where: { set: { setId: set.id } },
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { slug: true, blurDataUrl: true },
        },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.card.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
          <span>{totalCount} cards</span>
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

      {cards.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No cards in this set</p>
        </div>
      ) : (
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
      )}

      {totalPages > 1 && (
        <SetPagination currentPage={page} totalPages={totalPages} />
      )}
    </main>
  );
}
