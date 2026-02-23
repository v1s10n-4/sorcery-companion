import { Suspense } from "react";
import { getAllCards, getAllSets } from "@/lib/data";
import { CardBrowser } from "@/components/card-browser";
import { CardBrowserSkeleton } from "@/components/skeletons";
import type { SetInfo } from "@/lib/types";

export const revalidate = 3600;

export default function Home() {
  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif text-amber-100">
          Sorcery Companion
        </h1>
      </div>
      <Suspense fallback={<CardBrowserSkeleton />}>
        <CardBrowserLoader />
      </Suspense>
    </main>
  );
}

async function CardBrowserLoader() {
  const [cards, sets] = await Promise.all([getAllCards(), getAllSets()]);
  return <CardBrowser cards={cards} sets={sets as SetInfo[]} />;
}
