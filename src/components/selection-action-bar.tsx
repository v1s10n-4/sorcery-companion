"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardImage } from "@/components/card-image";
import {
  X,
  ChevronUp,
  FolderPlus,
  BookmarkPlus,
  Loader2,
  Check,
  Minus,
  Plus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import type { BrowserCard } from "@/lib/types";
import type { BrowserContext } from "@/components/card-browser";
import { cn } from "@/lib/utils";

interface VariantInfo {
  id: string;
  slug: string;
  finish: string;
  product: string;
  artist: string | null;
  setName: string;
  marketPrice: number | null;
}

export interface SelectionItem {
  cardId: string;
  quantity: number;
  variantId?: string; // selected variant override
}

interface SelectionActionBarProps {
  selection: Map<string, number>;
  cards: BrowserCard[];
  userDecks: { id: string; name: string }[];
  context: BrowserContext;
  deckId?: string;
  onClear: () => void;
  onUpdateQty?: (cardId: string, qty: number) => void;
  onRemoveCard?: (cardId: string) => void;
}

export function SelectionActionBar({
  selection,
  cards,
  userDecks,
  context,
  deckId,
  onClear,
  onUpdateQty,
  onRemoveCard,
}: SelectionActionBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [targetDeckId, setTargetDeckId] = useState<string>(deckId ?? "");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);
  // Per-card variant overrides: cardId → variantId
  const [variantOverrides, setVariantOverrides] = useState<Map<string, string>>(new Map());
  // Cached variant data: cardId → VariantInfo[]
  const [variantCache, setVariantCache] = useState<Map<string, VariantInfo[]>>(new Map());
  const [loadingVariants, setLoadingVariants] = useState<Set<string>>(new Set());

  const totalCards = Array.from(selection.values()).reduce((s, q) => s + q, 0);
  const uniqueCards = selection.size;

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => { setSuccess(null); onClear(); }, 1500);
  };

  // Fetch variants for cards when drawer opens
  useEffect(() => {
    if (!drawerOpen) return;
    const toFetch = [...selection.keys()].filter((id) => !variantCache.has(id) && !loadingVariants.has(id));
    if (toFetch.length === 0) return;

    setLoadingVariants((prev) => {
      const next = new Set(prev);
      toFetch.forEach((id) => next.add(id));
      return next;
    });

    (async () => {
      const { getCardVariants } = await import("@/lib/actions/collection");
      const results = await Promise.all(
        toFetch.map(async (cardId) => {
          const variants = await getCardVariants(cardId);
          return { cardId, variants };
        })
      );
      setVariantCache((prev) => {
        const next = new Map(prev);
        results.forEach(({ cardId, variants }) => next.set(cardId, variants));
        return next;
      });
      setLoadingVariants((prev) => {
        const next = new Set(prev);
        toFetch.forEach((id) => next.delete(id));
        return next;
      });
    })();
  }, [drawerOpen, selection, variantCache, loadingVariants]);

  const handleAddToCollection = () => {
    startTransition(async () => {
      const { addToCollection, addToCollectionByCard } = await import("@/lib/actions/collection");
      let added = 0;
      for (const [cardId, qty] of selection) {
        try {
          const variantId = variantOverrides.get(cardId);
          if (variantId) {
            await addToCollection({ variantId, quantity: qty });
          } else {
            for (let i = 0; i < qty; i++) await addToCollectionByCard(cardId);
          }
          added += qty;
        } catch {}
      }
      showSuccess(`+${added} to collection`);
    });
  };

  const handleRemoveFromCollection = () => {
    startTransition(async () => {
      const { removeFromCollectionByCardId } = await import("@/lib/actions/collection");
      let removed = 0;
      for (const [cardId, qty] of selection) {
        try {
          await removeFromCollectionByCardId(cardId, qty);
          removed += qty;
        } catch {}
      }
      showSuccess(`−${removed} from collection`);
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
          for (let i = 0; i < qty; i++) await addCardToDeck(dId, cardId, section);
          added += qty;
        } catch {}
      }
      showSuccess(`+${added} to deck`);
    });
  };

  // Selected cards for the drawer list
  const selectedCards = [...selection.entries()].map(([cardId, qty]) => {
    const card = cards.find((c) => c.id === cardId);
    return { cardId, qty, card };
  }).filter((x) => x.card);

  return (
    <>
      {/* ── Compact floating bar ── */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-full shadow-2xl px-3 py-2 flex items-center gap-2">
          {success ? (
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium px-2">
              <Check className="h-4 w-4" />
              {success}
            </div>
          ) : (
            <>
              {/* Drawer toggle with count */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 text-amber-200 text-sm font-medium cursor-pointer hover:bg-amber-500/30 transition-colors"
              >
                <span className="tabular-nums">{totalCards}</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </button>

              <div className="h-4 w-px bg-border" />

              {/* Collection action — add when browsing, remove when on collection page */}
              {context === "browse" && (
                <Tooltip label="Add to collection">
                  <button
                    onClick={handleAddToCollection}
                    disabled={isPending}
                    className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                  </button>
                </Tooltip>
              )}
              {context === "collection" && (
                <Tooltip label="Remove from collection">
                  <button
                    onClick={handleRemoveFromCollection}
                    disabled={isPending}
                    className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 text-red-400"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </Tooltip>
              )}

              {/* Deck action */}
              {(context === "browse" || context === "collection" || context === "deck") && userDecks.length > 0 && (
                <>
                  {!deckId && (
                    <Select value={targetDeckId} onValueChange={setTargetDeckId}>
                      <SelectTrigger className="h-7 w-20 text-[10px] rounded-full border-0 bg-muted">
                        <SelectValue placeholder="Deck" />
                      </SelectTrigger>
                      <SelectContent>
                        {userDecks.map((d) => (
                          <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Tooltip label="Add to deck">
                    <button
                      onClick={handleAddToDeck}
                      disabled={isPending || !targetDeckId}
                      className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </>
              )}

              <div className="h-4 w-px bg-border" />

              {/* Clear */}
              <button onClick={onClear} className="p-1.5 rounded-full hover:bg-muted transition-colors cursor-pointer">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom drawer for editing selection ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="max-h-[70vh] flex flex-col rounded-t-xl">
          <SheetHeader className="shrink-0 pb-3 border-b border-border">
            <SheetTitle className="flex items-center justify-between">
              <span>Selection ({totalCards} card{totalCards !== 1 ? "s" : ""})</span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {selectedCards.map(({ cardId, qty, card }) => {
              const variants = variantCache.get(cardId);
              const selectedVariant = variantOverrides.get(cardId);
              const isLoading = loadingVariants.has(cardId);

              return (
                <div key={cardId} className="flex items-start gap-3 p-2 rounded-lg border border-border/40 bg-card">
                  <CardImage
                    slug={card!.variantSlug!}
                    name={card!.name}
                    width={48}
                    height={67}
                    className="rounded-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{card!.name}</p>
                    <p className="text-[10px] text-muted-foreground">{card!.type} · {card!.rarity ?? "—"}</p>

                    {/* Variant picker */}
                    {isLoading ? (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading variants...
                      </div>
                    ) : variants && variants.length > 1 ? (
                      <Select
                        value={selectedVariant ?? "default"}
                        onValueChange={(v) => {
                          setVariantOverrides((prev) => {
                            const next = new Map(prev);
                            if (v === "default") next.delete(cardId);
                            else next.set(cardId, v);
                            return next;
                          });
                        }}
                      >
                        <SelectTrigger className="h-6 mt-1 text-[10px] w-full">
                          <SelectValue placeholder="Default variant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default" className="text-xs">Default (Standard)</SelectItem>
                          {variants.map((v) => (
                            <SelectItem key={v.id} value={v.id} className="text-xs">
                              {v.setName} · {v.finish} · {v.product.replace(/_/g, " ")}
                              {v.marketPrice != null && ` · $${v.marketPrice.toFixed(2)}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        if (qty <= 1 && onRemoveCard) onRemoveCard(cardId);
                        else if (onUpdateQty) onUpdateQty(cardId, qty - 1);
                      }}
                      className="h-7 w-7 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                    >
                      {qty <= 1 ? <Trash2 className="h-3 w-3 text-red-400" /> : <Minus className="h-3 w-3" />}
                    </button>
                    <span className="text-sm font-bold tabular-nums w-6 text-center">{qty}</span>
                    <button
                      onClick={() => onUpdateQty?.(cardId, qty + 1)}
                      className="h-7 w-7 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drawer actions */}
          <div className="shrink-0 pt-3 border-t border-border flex gap-2">
            {context === "browse" && (
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => { setDrawerOpen(false); handleAddToCollection(); }}
                disabled={isPending}
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Add to Collection
              </Button>
            )}
            {context === "collection" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5 text-red-400 hover:text-red-300"
                onClick={() => { setDrawerOpen(false); handleRemoveFromCollection(); }}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove from Collection
              </Button>
            )}
            {(context === "browse" || context === "collection" || context === "deck") && targetDeckId && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => { setDrawerOpen(false); handleAddToDeck(); }}
                disabled={isPending}
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                Add to Deck
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-red-400 hover:text-red-300"
              onClick={() => { setDrawerOpen(false); onClear(); }}
            >
              Clear
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// Simple inline tooltip for icon buttons
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-popover text-popover-foreground text-[10px] whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none border border-border shadow-md">
        {label}
      </div>
    </div>
  );
}
