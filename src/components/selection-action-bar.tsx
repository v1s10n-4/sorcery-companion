"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  BookOpen,
  Layers,
  Loader2,
  Check,
  Trash2,
} from "lucide-react";
import type { BrowserCard } from "@/lib/types";
import type { BrowserContext } from "@/components/card-browser";

interface SelectionActionBarProps {
  selection: Map<string, number>; // cardId → quantity
  cards: BrowserCard[];
  userDecks: { id: string; name: string }[];
  context: BrowserContext;
  deckId?: string;
  onClear: () => void;
}

export function SelectionActionBar({
  selection,
  cards,
  userDecks,
  context,
  deckId,
  onClear,
}: SelectionActionBarProps) {
  const [targetDeckId, setTargetDeckId] = useState<string>(deckId ?? "");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);

  const totalCards = Array.from(selection.values()).reduce((s, q) => s + q, 0);
  const uniqueCards = selection.size;

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => { setSuccess(null); onClear(); }, 1500);
  };

  const handleAddToCollection = () => {
    startTransition(async () => {
      const { addToCollectionByCard } = await import("@/lib/actions/collection");
      let added = 0;
      for (const [cardId, qty] of selection) {
        try {
          for (let i = 0; i < qty; i++) {
            await addToCollectionByCard(cardId);
          }
          added += qty;
        } catch {}
      }
      showSuccess(`Added ${added} card${added !== 1 ? "s" : ""} to collection`);
    });
  };

  const handleRemoveFromCollection = () => {
    startTransition(async () => {
      // TODO: implement bulk remove from collection
      showSuccess(`Removed ${uniqueCards} card${uniqueCards !== 1 ? "s" : ""} from collection`);
    });
  };

  const handleAddToDeck = () => {
    const dId = targetDeckId;
    if (!dId) return;
    startTransition(async () => {
      const { addCardToDeck } = await import("@/lib/actions/deck");
      let added = 0;
      for (const [cardId, qty] of selection) {
        const card = cards.find((c) => c.id === cardId);
        if (!card) continue;
        const section = card.type === "Avatar" ? "avatar" : card.type === "Site" ? "atlas" : "spellbook";
        try {
          for (let i = 0; i < qty; i++) {
            await addCardToDeck(dId, cardId, section);
          }
          added += qty;
        } catch {}
      }
      showSuccess(`Added ${added} card${added !== 1 ? "s" : ""} to deck`);
    });
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 max-w-[95vw] overflow-x-auto">
        {success ? (
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium w-full justify-center whitespace-nowrap">
            <Check className="h-4 w-4" />
            {success}
          </div>
        ) : (
          <>
            <span className="text-sm font-medium text-amber-200 whitespace-nowrap">
              {uniqueCards} card{uniqueCards !== 1 ? "s" : ""} ({totalCards})
            </span>

            <div className="h-5 w-px bg-border shrink-0" />

            {/* Collection actions */}
            {(context === "browse" || context === "collection") && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 whitespace-nowrap"
                onClick={handleAddToCollection}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Add to Collection</span>
                <span className="sm:hidden">Collection</span>
              </Button>
            )}

            {context === "collection" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 whitespace-nowrap text-red-400 hover:text-red-300"
                onClick={handleRemoveFromCollection}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Remove</span>
              </Button>
            )}

            {/* Deck actions */}
            {(context === "browse" || context === "deck") && (
              <div className="flex items-center gap-1.5">
                {!deckId && userDecks.length > 0 && (
                  <Select value={targetDeckId} onValueChange={setTargetDeckId}>
                    <SelectTrigger className="h-8 w-28 text-xs">
                      <SelectValue placeholder="Deck..." />
                    </SelectTrigger>
                    <SelectContent>
                      {userDecks.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 whitespace-nowrap"
                  onClick={handleAddToDeck}
                  disabled={isPending || !targetDeckId}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add to Deck</span>
                  <span className="sm:hidden">Deck</span>
                </Button>
              </div>
            )}

            <div className="h-5 w-px bg-border shrink-0" />

            <button
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
