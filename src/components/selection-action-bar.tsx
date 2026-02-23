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
  Plus,
  X,
  BookOpen,
  Layers,
  Loader2,
  Check,
} from "lucide-react";
import { addToCollection } from "@/lib/actions/collection";
import { addCardToDeck } from "@/lib/actions/deck";
import type { BrowserCard } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SelectionActionBarProps {
  selectedCardIds: Set<string>;
  cards: BrowserCard[];
  userDecks: { id: string; name: string }[];
  onClear: () => void;
}

export function SelectionActionBar({
  selectedCardIds,
  cards,
  userDecks,
  onClear,
}: SelectionActionBarProps) {
  const [targetDeckId, setTargetDeckId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);

  const count = selectedCardIds.size;

  // Find the first variant ID for each selected card
  // We need to resolve card ID → variant ID for collection actions
  // For now, the add action looks up the default variant server-side

  const handleAddToCollection = () => {
    startTransition(async () => {
      let added = 0;
      for (const cardId of selectedCardIds) {
        try {
          // addToCollection expects a variantId — we'll need a bulk action
          // For now, use a server action that accepts cardId
          await addToCollectionByCardId(cardId);
          added++;
        } catch {}
      }
      setSuccess(`Added ${added} card${added !== 1 ? "s" : ""} to collection`);
      setTimeout(() => { setSuccess(null); onClear(); }, 1500);
    });
  };

  const handleAddToDeck = () => {
    if (!targetDeckId) return;
    startTransition(async () => {
      let added = 0;
      for (const cardId of selectedCardIds) {
        try {
          // Determine the section based on card type
          const card = cards.find((c) => c.id === cardId);
          if (!card) continue;
          const section =
            card.type === "Avatar" ? "avatar" :
            card.type === "Site" ? "atlas" :
            "spellbook";
          await addCardToDeck(targetDeckId, cardId, section);
          added++;
        } catch {}
      }
      setSuccess(`Added ${added} card${added !== 1 ? "s" : ""} to deck`);
      setTimeout(() => { setSuccess(null); onClear(); }, 1500);
    });
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 min-w-[320px] max-w-[90vw]">
        {success ? (
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium w-full justify-center">
            <Check className="h-4 w-4" />
            {success}
          </div>
        ) : (
          <>
            <span className="text-sm font-medium text-amber-200 whitespace-nowrap">
              {count} selected
            </span>

            <div className="h-5 w-px bg-border" />

            {/* Add to Collection */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleAddToCollection}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Layers className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Collection</span>
            </Button>

            {/* Add to Deck */}
            {userDecks.length > 0 && (
              <div className="flex items-center gap-1.5">
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
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleAddToDeck}
                  disabled={isPending || !targetDeckId}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </div>
            )}

            <div className="h-5 w-px bg-border" />

            {/* Clear */}
            <button
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Server action to add to collection by card ID (resolves default variant)
async function addToCollectionByCardId(cardId: string) {
  // Import server action that handles card → variant resolution
  const { addToCollectionByCard } = await import("@/lib/actions/collection");
  return addToCollectionByCard(cardId);
}
