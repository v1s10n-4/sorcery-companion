"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/card-image";
import { CardBrowser, type CardOverlayEntry } from "@/components/card-browser";
import { ElementBadges } from "@/components/icons";
import {
  ChevronLeft,
  Minus,
  User,
  Map,
  BookOpen,
  Library,
} from "lucide-react";
import { removeCardFromDeck } from "@/lib/actions/deck";
import { cn } from "@/lib/utils";
import type { BrowserCard, SetInfo } from "@/lib/types";

interface DeckCardData {
  id: string;
  cardId: string;
  cardName: string;
  cardType: string;
  rarity: string | null;
  cost: number | null;
  attack: number | null;
  defence: number | null;
  life: number | null;
  elements: string[];
  slug: string;
  quantity: number;
  section: string;
}

type Section = "avatar" | "atlas" | "spellbook" | "collection";

interface DeckEditorViewProps {
  deckId: string;
  deckName: string;
  deckCards: DeckCardData[];
  allCards: BrowserCard[];
  sets: SetInfo[];
  userDecks: { id: string; name: string }[];
}

export function DeckEditorView({
  deckId,
  deckName,
  deckCards,
  allCards,
  sets,
  userDecks,
}: DeckEditorViewProps) {
  const [activeSection, setActiveSection] = useState<Section>("spellbook");
  const [showBrowser, setShowBrowser] = useState(true);
  const [isPending, startTransition] = useTransition();

  const avatar = deckCards.find((c) => c.section === "avatar") ?? null;
  const atlas = deckCards.filter((c) => c.section === "atlas");
  const spellbook = deckCards.filter((c) => c.section === "spellbook");
  const collection = deckCards.filter((c) => c.section === "collection");

  const atlasTotal = atlas.reduce((s, c) => s + c.quantity, 0);
  const spellbookTotal = spellbook.reduce((s, c) => s + c.quantity, 0);
  const collectionTotal = collection.reduce((s, c) => s + c.quantity, 0);

  const handleRemove = (deckCardId: string) => {
    startTransition(async () => {
      await removeCardFromDeck(deckCardId);
    });
  };

  const sections: { key: Section; label: string; icon: React.ReactNode; count: string }[] = [
    { key: "avatar", label: "Avatar", icon: <User className="h-3.5 w-3.5" />, count: avatar ? "1/1" : "0/1" },
    { key: "atlas", label: "Atlas", icon: <Map className="h-3.5 w-3.5" />, count: `${atlasTotal}/30` },
    { key: "spellbook", label: "Spellbook", icon: <BookOpen className="h-3.5 w-3.5" />, count: `${spellbookTotal}/60` },
    { key: "collection", label: "Sideboard", icon: <Library className="h-3.5 w-3.5" />, count: `${collectionTotal}/10` },
  ];

  const currentCards =
    activeSection === "avatar"
      ? avatar ? [avatar] : []
      : activeSection === "atlas" ? atlas
      : activeSection === "collection" ? collection
      : spellbook;

  // Build overlay from deck cards (shows what's already in the deck)
  const overlay: CardOverlayEntry[] = deckCards.map((dc) => ({
    cardId: dc.cardId,
    quantity: dc.quantity,
    marketPrice: null,
    purchasePrice: null,
  }));

  const isComplete = !!avatar && atlasTotal >= 30 && spellbookTotal === 60;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/decks" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold font-serif text-amber-100">{deckName}</h1>
        {isComplete && (
          <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-[10px]">Complete</Badge>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer",
              activeSection === s.key
                ? "bg-amber-900/40 text-amber-200 border border-amber-700/50"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            )}
          >
            {s.icon}
            <span className="hidden sm:inline">{s.label}</span>
            <span className="text-xs opacity-70">{s.count}</span>
          </button>
        ))}
      </div>

      {/* Deck stats bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground border border-border/30 rounded-lg p-3">
        <span>Avatar: {avatar ? "✓" : "—"}</span>
        <span className={atlasTotal >= 30 ? "text-green-400" : ""}>Atlas: {atlasTotal}/30</span>
        <span className={spellbookTotal === 60 ? "text-green-400" : ""}>Spellbook: {spellbookTotal}/60</span>
        <span className={collectionTotal <= 10 ? "" : "text-red-400"}>Sideboard: {collectionTotal}/10</span>
      </div>

      {/* Current section cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {activeSection === "avatar" ? "Avatar" : activeSection === "atlas" ? "Atlas (Sites)" : activeSection === "collection" ? "Sideboard (Collection)" : "Spellbook (Spells)"}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowBrowser((v) => !v)}
          >
            {showBrowser ? "Hide browser" : "Add cards"}
          </Button>
        </div>

        {currentCards.length === 0 ? (
          <p className="text-sm text-muted-foreground/50 py-4 text-center border border-dashed border-border/30 rounded-lg">
            No cards — use the browser below to add
          </p>
        ) : (
          <div className="space-y-1">
            {currentCards.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-border/30 bg-card p-2 hover:border-border/60 transition-colors"
              >
                <CardImage slug={c.slug} name={c.cardName} width={32} height={45} className="rounded-sm flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{c.cardName}</span>
                    {c.rarity && <Badge variant="outline" className="text-[9px] px-1">{c.rarity}</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {c.cost != null && <span>Cost {c.cost}</span>}
                    {c.attack != null && <span>A{c.attack}</span>}
                    {c.defence != null && <span>D{c.defence}</span>}
                    {c.elements.length > 0 && <ElementBadges elements={c.elements} size="xs" />}
                  </div>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground w-6 text-center">×{c.quantity}</span>
                <button
                  onClick={() => handleRemove(c.id)}
                  className="text-muted-foreground/40 hover:text-red-400 p-1 cursor-pointer transition-colors"
                  disabled={isPending}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Browser for adding cards */}
      {showBrowser && (
        <div className="border-t border-border/30 pt-4">
          <CardBrowser
            cards={allCards}
            sets={sets}
            overlay={overlay}
            selectable
            context="deck"
            deckId={deckId}
            userDecks={userDecks}
            searchPlaceholder={
              activeSection === "avatar" ? "Search avatars..."
              : activeSection === "atlas" ? "Search sites..."
              : activeSection === "collection" ? "Search cards for sideboard..."
              : "Search spells..."
            }
          />
        </div>
      )}
    </div>
  );
}
