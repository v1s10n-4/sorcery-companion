import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sets — Sorcery Companion",
  description: "Browse all Sorcery: Contested Realm card sets",
};
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SetsListSkeleton } from "@/components/skeletons";
import { getFullSets } from "@/lib/data";

export const revalidate = 3600;

export default function SetsPage() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-5xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        All cards
      </Link>

      <h1 className="text-3xl font-bold tracking-tight font-serif text-amber-100 mb-8">
        Card Sets
      </h1>

      <Suspense fallback={<SetsListSkeleton />}>
        <SetsListContent />
      </Suspense>
    </main>
  );
}

async function SetsListContent() {
  const sets = await getFullSets();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sets.map((set) => (
        <Link key={set.id} href={`/sets/${set.slug}`}>
          <Card className="hover:shadow-lg hover:shadow-amber-900/10 hover:scale-[1.02] transition-all cursor-pointer border-border/50 h-full">
            <CardHeader>
              <CardTitle className="font-serif text-amber-100">
                {set.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{set.cardCount} cards</span>
                {set.releasedAt && (
                  <span>
                    {new Date(set.releasedAt).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
              {set.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {set.description}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
