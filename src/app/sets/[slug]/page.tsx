import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CardGrid } from "@/components/card-grid";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 36;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function SetDetailPage({ params, searchParams }: PageProps) {
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
        },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.card.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <Link
        href="/sets"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 inline-block"
      >
        ← All sets
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-serif text-amber-100">
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

      <CardGrid cards={cards} />

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </main>
  );
}
