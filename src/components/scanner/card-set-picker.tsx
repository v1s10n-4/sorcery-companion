"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Check, Loader2 } from "lucide-react";
import type { ScanSet } from "@/lib/actions/scan";

interface CardSetPickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** The card whose available sets to load */
  cardId: string | null;
  cardName?: string;
  selectedSetSlug: string | null;
  onSelect: (slug: string) => void;
}

/**
 * Shows only the sets where a specific card exists.
 * Different from SetPicker (set locker) which shows ALL sets.
 */
export function CardSetPicker({
  open,
  onOpenChange,
  cardId,
  cardName,
  selectedSetSlug,
  onSelect,
}: CardSetPickerProps) {
  const [sets, setSets] = useState<ScanSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedCardId, setLoadedCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !cardId || cardId === loadedCardId) return;
    setLoading(true);
    import("@/lib/actions/scan").then(({ getSetsForCard }) => {
      getSetsForCard(cardId).then((data) => {
        setSets(data);
        setLoading(false);
        setLoadedCardId(cardId);
      });
    });
  }, [open, cardId, loadedCardId]);

  // Reset when cardId changes
  useEffect(() => {
    if (cardId !== loadedCardId) {
      setSets([]);
      setLoadedCardId(null);
    }
  }, [cardId, loadedCardId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[60vh] flex flex-col rounded-t-xl"
      >
        <SheetHeader className="shrink-0 pb-3 border-b border-border/60">
          <SheetTitle>Select Printing</SheetTitle>
          {cardName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Available sets for {cardName}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}

          {!loading && sets.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No sets found.
            </div>
          )}

          {sets.map((s) => {
            const isSelected = selectedSetSlug === s.slug;
            return (
              <button
                key={s.slug}
                onClick={() => {
                  onSelect(s.slug);
                  onOpenChange(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer min-h-[48px] ${
                  isSelected
                    ? "bg-amber-500/15 border border-amber-500/30 text-amber-100"
                    : "hover:bg-muted/40 text-foreground border border-transparent"
                }`}
              >
                <div className="h-4 w-4 rounded-full border border-border bg-muted/30 shrink-0" />
                <span className="flex-1 text-sm font-medium">{s.name}</span>
                {isSelected && (
                  <Check className="h-4 w-4 text-amber-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
