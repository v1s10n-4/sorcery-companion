"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/card-image";
import { CardBrowser } from "@/components/card-browser";
import { ElementBadges } from "@/components/icons";
import {
  ChevronLeft,
  Minus,
  User,
  Map,
  BookOpen,
  Library,
  ChevronDown,
  ChevronUp,
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
}

const SECTION_META: Record<Section, { label: string; sublabel: string; icon: React.ReactNode; max: number }> = {
  avatar: { label: "Avatar", sublabel: "Your hero", icon: <User className="h-3.5 w-3.5" />, max: 1 },
  atlas: { label: "Atlas", sublabel: "Sites", icon: <Map className="h-3.5 w-3.5" />, max: 30 },
  spellbook: { label: "Spellbook", sublabel: "Spells", icon: <BookOpen className="h-3.5 w-3.5" />, max: 60 },
  collection: { label: "Collection", sublabel: "Sideboard", icon: <Library className="h-3.5 w-3.5" />, max: 10 },
};

export function DeckEditorView({
  deckId,
  deckName,
  deckCards,
  allCards,
  sets,
}: DeckEditorViewProps) {
  const [activeSection, setActiveSection] = useState<Section>("spellbook");
  const [deckCollapsed, setDeckCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const avatar = deckCards.find((c) => c.section === "avatar") ?? null;
  const sectionCards: Record<Section, DeckCardData[]> = {
    avatar: avatar ? [avatar] : [],
    atlas: deckCards.filter((c) => c.section === "atlas"),
    spellbook: deckCards.filter((c) => c.section === "spellbook"),
    collection: deckCards.filter((c) => c.section === "collection"),
  };

  const totals: Record<Section, number> = {
    avatar: avatar ? 1 : 0,
    atlas: sectionCards.atlas.reduce((s, c) => s + c.quantity, 0),
    spellbook: sectionCards.spellbook.reduce((s, c) => s + c.quantity, 0),
    collection: sectionCards.collection.reduce((s, c) => s + c.quantity, 0),
  };

  const totalDeckCards = totals.avatar + totals.atlas + totals.spellbook + totals.collection;
  const isComplete = !!avatar && totals.atlas >= 30 && totals.spellbook === 60;

  const handleRemove = (deckCardId: string) => {
    startTransition(async () => { await removeCardFromDeck(deckCardId); });
  };

  const currentCards = sectionCards[activeSection];
  const meta = SECTION_META[activeSection];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/decks" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-amber-100 truncate">{deckName}</h1>
            {isComplete && <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-[10px]">Complete</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalDeckCards} cards · {avatar?.cardName ?? "No avatar"}
          </p>
        </div>
      </div>

      {/* Section tabs — compact, showing counts as progress */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(Object.keys(SECTION_META) as Section[]).map((key) => {
          const m = SECTION_META[key];
          const total = totals[key];
          const isFull = total >= m.max;
          const isActive = activeSection === key;

          return (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-amber-900/40 text-amber-200 border border-amber-700/50"
                  : "text-muted-foreground hover:text-foreground border border-border/30 hover:border-border/60"
              )}
            >
              {m.icon}
              <span>{m.label}</span>
              <span className={cn("tabular-nums font-medium", isFull && "text-green-400")}>
                {total}/{m.max}
              </span>
            </button>
          );
        })}
      </div>

      {/* Deck list for active section — collapsible */}
      <div className="rounded-lg border border-border/30 bg-card/50">
        <button
          onClick={() => setDeckCollapsed(!deckCollapsed)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
        >
          <span className="font-medium uppercase tracking-wider">
            {meta.label} — {meta.sublabel} ({currentCards.length} unique, {totals[activeSection]} total)
          </span>
          {deckCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>

        {!deckCollapsed && (
          <div className="border-t border-border/20">
            {currentCards.length === 0 ? (
              <p className="text-sm text-muted-foreground/40 py-6 text-center">
                No cards yet — browse and select below
              </p>
            ) : (
              <div className="divide-y divide-border/20">
                {currentCards.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-1.5">
                    <CardImage slug={c.slug} name={c.cardName} width={28} height={39} className="rounded-sm shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{c.cardName}</span>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {c.rarity && <span>{c.rarity}</span>}
                        {c.cost != null && <span>· {c.cost}⬡</span>}
                        {c.elements.length > 0 && <ElementBadges elements={c.elements} size="xs" />}
                      </div>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">×{c.quantity}</span>
                    <button
                      onClick={() => handleRemove(c.id)}
                      className="text-muted-foreground/30 hover:text-red-400 p-1 cursor-pointer transition-colors"
                      disabled={isPending}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Browser — shows ALL cards for adding to deck */}
      <div>
        <CardBrowser
          cards={allCards}
          sets={sets}
          searchPlaceholder={
            activeSection === "avatar" ? "Search avatars..."
            : activeSection === "atlas" ? "Search sites..."
            : activeSection === "collection" ? "Search cards for collection..."
            : "Search spells..."
          }
        />
      </div>
    </div>
  );
}
