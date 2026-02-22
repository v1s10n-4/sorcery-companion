import { prisma } from "@/lib/prisma";
import { CardGrid } from "@/components/card-grid";
import { SearchBar } from "@/components/search-bar";
import { FilterBar } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 24;

interface PageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    element?: string;
    rarity?: string;
    page?: string;
  }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const { q, type, element, rarity } = params;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const where: Record<string, unknown> = {};

  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }
  if (type) {
    where.type = type;
  }
  if (element) {
    where.elements = { contains: element, mode: "insensitive" };
  }
  if (rarity) {
    where.rarity = rarity;
  }

  const [cards, totalCount, types, elements, rarities] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        variants: {
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.card.count({ where }),
    prisma.card.findMany({
      select: { type: true },
      distinct: ["type"],
      orderBy: { type: "asc" },
    }),
    prisma.card.findMany({
      select: { elements: true },
      distinct: ["elements"],
      orderBy: { elements: "asc" },
    }),
    prisma.card.findMany({
      select: { rarity: true },
      distinct: ["rarity"],
      orderBy: { rarity: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sorcery Companion</h1>
        <p className="text-muted-foreground mt-1">
          {totalCount} card{totalCount !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <SearchBar defaultValue={q} />
        <FilterBar
          types={types.map((t) => t.type)}
          elements={elements.map((e) => e.elements).filter(Boolean) as string[]}
          rarities={rarities.map((r) => r.rarity).filter(Boolean) as string[]}
          currentType={type}
          currentElement={element}
          currentRarity={rarity}
        />
      </div>

      <CardGrid cards={cards} />

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </main>
  );
}
