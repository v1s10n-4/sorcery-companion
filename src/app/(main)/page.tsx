import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllCards, getAllSets } from "@/lib/data";
import { CardBrowser } from "@/components/card-browser";
import { CardBrowserSkeleton } from "@/components/skeletons";
import type { SetInfo } from "@/lib/types";

export const metadata: Metadata = {
  // Use absolute title so the homepage gets the brand name, not the template
  title: { absolute: "Sorcery Companion" },
  description:
    "Browse, search, and filter every Sorcery: Contested Realm card. Track your collection, build decks, and stay on top of market prices.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Sorcery Companion",
    description:
      "Your all-in-one companion for Sorcery: Contested Realm — card browser, collection tracker, deck builder, and card scanner.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sorcery Companion",
    description:
      "Your all-in-one companion for Sorcery: Contested Realm — card browser, collection tracker, deck builder, and card scanner.",
  },
};

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
