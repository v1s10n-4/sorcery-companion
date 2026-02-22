import { prisma } from "@/lib/prisma";
import { CardGrid } from "@/components/card-grid";
import { SearchBar } from "@/components/search-bar";
import { FilterBar } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 36;

const ELEMENTS = ["Air", "Earth", "Fire", "Water"] as const;

interface PageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    element?: string;
    rarity?: string;
    set?: string;
    page?: string;
    sort?: string;
  }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const { q, type, element, rarity, set: setSlug, sort } = params;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { rulesText: { contains: q, mode: "insensitive" } },
    ];
  }
  if (type) where.type = type;
  if (element) where.elements = { has: element };
  if (rarity) where.rarity = rarity;
  if (setSlug) {
    where.sets = { some: { set: { slug: setSlug } } };
  }

  // Sort
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { name: "asc" };
  if (sort === "cost") orderBy = [{ cost: "asc" }, { name: "asc" }];
  else if (sort === "cost-desc") orderBy = [{ cost: "desc" }, { name: "asc" }];
  else if (sort === "attack") orderBy = [{ attack: "desc" }, { name: "asc" }];
  else if (sort === "defence") orderBy = [{ defence: "desc" }, { name: "asc" }];
  else if (sort === "rarity") orderBy = [{ rarity: "asc" }, { name: "asc" }];

  const [cards, totalCount, types, rarities, sets] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy,
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
      select: { rarity: true },
      distinct: ["rarity"],
      where: { rarity: { not: null } },
      orderBy: { rarity: "asc" },
    }),
    prisma.set.findMany({
      orderBy: { releasedAt: "asc" },
      select: { name: true, slug: true, cardCount: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-serif text-amber-100">
          Sorcery Companion
        </h1>
        <p className="text-muted-foreground mt-1">
          {totalCount} card{totalCount !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <SearchBar defaultValue={q} />
        <FilterBar
          types={types.map((t) => t.type)}
          elements={[...ELEMENTS]}
          rarities={rarities.map((r) => r.rarity).filter(Boolean) as string[]}
          sets={sets}
          currentType={type}
          currentElement={element}
          currentRarity={rarity}
          currentSet={setSlug}
          currentSort={sort}
        />
      </div>

      <CardGrid cards={cards} />

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </main>
  );
}
