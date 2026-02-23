import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeckEditorView } from "@/components/deck/deck-editor-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const deck = await prisma.deck.findUnique({ where: { id }, select: { name: true } });
  return { title: deck ? `${deck.name} — Sorcery Companion` : "Deck Not Found" };
}

export default async function DeckEditorPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();

  const deck = await prisma.deck.findUnique({
    where: { id },
    include: {
      cards: {
        include: {
          card: {
            include: {
              variants: {
                take: 1,
                orderBy: { createdAt: "asc" },
                select: { slug: true },
              },
            },
          },
        },
        orderBy: { card: { name: "asc" } },
      },
    },
  });

  if (!deck || deck.userId !== user.id) notFound();

  const cards = deck.cards.map((dc) => ({
    id: dc.id,
    cardId: dc.cardId,
    cardName: dc.card.name,
    cardType: dc.card.type,
    rarity: dc.card.rarity,
    cost: dc.card.cost,
    attack: dc.card.attack,
    defence: dc.card.defence,
    life: dc.card.life,
    elements: dc.card.elements,
    slug: dc.card.variants[0]?.slug ?? "",
    quantity: dc.quantity,
    section: dc.section,
  }));

  const avatar = cards.find((c) => c.section === "avatar") ?? null;
  const atlas = cards.filter((c) => c.section === "atlas");
  const spellbook = cards.filter((c) => c.section === "spellbook");

  return (
    <main className="container mx-auto px-4 py-6 max-w-6xl">
      <DeckEditorView
        deckId={deck.id}
        deckName={deck.name}
        avatar={avatar}
        atlas={atlas}
        spellbook={spellbook}
      />
    </main>
  );
}
