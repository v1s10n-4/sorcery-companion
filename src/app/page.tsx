import { Suspense } from "react";
import { getAllCards, getAllSets } from "@/lib/data";
import { CardBrowser } from "@/components/card-browser";
import { CardBrowserSkeleton } from "@/components/skeletons";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SetInfo } from "@/lib/types";

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
  const [cards, sets, user] = await Promise.all([
    getAllCards(),
    getAllSets(),
    getUser(),
  ]);

  // If user is logged in, fetch their decks for the selection action bar
  let userDecks: { id: string; name: string }[] = [];
  if (user) {
    userDecks = await prisma.deck.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  return (
    <CardBrowser
      cards={cards}
      sets={sets as SetInfo[]}
      selectable={!!user}
      userDecks={userDecks}
    />
  );
}
