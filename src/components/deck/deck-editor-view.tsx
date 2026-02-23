"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/card-image";
import { ElementBadges, StatIcon } from "@/components/icons";
import {
  ChevronLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Map,
  BookOpen,
} from "lucide-react";
import {
  addCardToDeck,
  removeCardFromDeck,
  searchCardsForDeck,
} from "@/lib/actions/deck";
import { cn } from "@/lib/utils";

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

interface SearchResult {
  id: string;
  name: string;
  type: string;
  rarity: string | null;
  cost: number | null;
  attack: number | null;
  defence: number | null;
  life: number | null;
  elements: string[];
  slug: string;
}

type Section = "avatar" | "atlas" | "spellbook";

interface DeckEditorViewProps {
  deckId: string;
  deckName: string;
  avatar: DeckCardData | null;
  atlas: DeckCardData[];
  spellbook: DeckCardData[];
}

export function DeckEditorView({
  deckId,
  deckName,
  avatar,
  atlas,
  spellbook,
}: DeckEditorViewProps) {
  const [activeSection, setActiveSection] = useState<Section>("spellbook");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const atlasTotal = atlas.reduce((s, c) => s + c.quantity, 0);
  const spellbookTotal = spellbook.reduce((s, c) => s + c.quantity, 0);

  // Debounced auto-search
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const data = await searchCardsForDeck(query, activeSection);
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [query, activeSection]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const data = await searchCardsForDeck(query, activeSection);
      setResults(data);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = (cardId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await addCardToDeck(deckId, cardId, activeSection);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const handleRemove = (deckCardId: string) => {
    startTransition(async () => {
      await removeCardFromDeck(deckCardId);
    });
  };

  const sections: { key: Section; label: string; icon: React.ReactNode; count: string }[] = [
    { key: "avatar", label: "Avatar", icon: <User className="h-3.5 w-3.5" />, count: avatar ? "1/1" : "0/1" },
    { key: "atlas", label: "Atlas", icon: <Map className="h-3.5 w-3.5" />, count: `${atlasTotal}/20` },
    { key: "spellbook", label: "Spellbook", icon: <BookOpen className="h-3.5 w-3.5" />, count: `${spellbookTotal}/40` },
  ];

  const currentCards =
    activeSection === "avatar"
      ? avatar
        ? [avatar]
        : []
      : activeSection === "atlas"
        ? atlas
        : spellbook;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/decks"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold font-serif text-amber-100">
          {deckName}
        </h1>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-4">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              setActiveSection(s.key);
              setResults([]);
              setQuery("");
              setError(null);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer",
              activeSection === s.key
                ? "bg-amber-900/40 text-amber-200 border border-amber-700/50"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            )}
          >
            {s.icon}
            {s.label}
            <span className="text-xs opacity-70">{s.count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: Current cards in section */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            {activeSection === "avatar" ? "Avatar" : activeSection === "atlas" ? "Atlas (Sites)" : "Spellbook (Spells)"}
          </h2>

          {currentCards.length === 0 ? (
            <p className="text-sm text-muted-foreground/50 py-8 text-center">
              Search and add cards →
            </p>
          ) : (
            <div className="space-y-1">
              {currentCards.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border border-border/30 bg-card p-2 hover:border-border/60 transition-colors"
                >
                  <CardImage
                    slug={c.slug}
                    name={c.cardName}
                    width={32}
                    height={45}
                    className="rounded-sm flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">
                        {c.cardName}
                      </span>
                      {c.rarity && (
                        <Badge variant="outline" className="text-[9px] px-1">
                          {c.rarity}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {c.cost != null && <span>Cost {c.cost}</span>}
                      {c.attack != null && <span>A{c.attack}</span>}
                      {c.defence != null && <span>D{c.defence}</span>}
                      {c.elements.length > 0 && (
                        <ElementBadges elements={c.elements} size="xs" />
                      )}
                    </div>
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground w-6 text-center">
                    ×{c.quantity}
                  </span>
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

          {/* Deck stats bar */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground border-t border-border/30 pt-3">
            <span>Avatar: {avatar ? "✓" : "—"}</span>
            <span className={atlasTotal === 20 ? "text-green-400" : ""}>
              Atlas: {atlasTotal}/20
            </span>
            <span className={spellbookTotal === 40 ? "text-green-400" : ""}>
              Spellbook: {spellbookTotal}/40
            </span>
            {atlasTotal === 20 && spellbookTotal === 40 && avatar && (
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-[10px]">
                Complete
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Card search */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={
                  activeSection === "avatar"
                    ? "Search avatars..."
                    : activeSection === "atlas"
                      ? "Search sites..."
                      : "Search spells..."
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="h-8"
            >
              {searching ? "..." : "Search"}
            </Button>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/20 rounded p-2">
              {error}
            </p>
          )}

          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleAdd(r.id)}
                disabled={isPending}
                className="flex items-center gap-2 w-full rounded-lg border border-border/30 bg-card p-2 hover:border-amber-700/50 transition-colors text-left cursor-pointer"
              >
                <CardImage
                  slug={r.slug}
                  name={r.name}
                  width={28}
                  height={39}
                  className="rounded-sm flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{r.name}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {r.rarity && <span>{r.rarity}</span>}
                    {r.cost != null && <span>· Cost {r.cost}</span>}
                  </div>
                </div>
                <Plus className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              </button>
            ))}
            {results.length === 0 && query && !searching && (
              <p className="text-xs text-muted-foreground/50 text-center py-4">
                No results
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
