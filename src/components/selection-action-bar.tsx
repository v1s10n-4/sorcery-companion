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
  Library,
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
  const [variantOverrides, setVariantOverrides] = useState<Map<string, string>>(new Map());
  const [variantCache, setVariantCache] = useState<Map<string, VariantInfo[]>>(new Map());
  const [loadingVariants, setLoadingVariants] = useState<Set<string>>(new Set());

  const totalCards = Array.from(selection.values()).reduce((s, q) => s + q, 0);
  const uniqueCards = selection.size;

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => { setSuccess(null); onClear(); }, 1200);
  };

  // Lazy fetch variants when drawer opens
  useEffect(() => {
    if (!drawerOpen) return;
    const toFetch = [...selection.keys()].filter((id) => !variantCache.has(id) && !loadingVariants.has(id));
    if (toFetch.length === 0) return;

    setLoadingVariants((prev) => { const next = new Set(prev); toFetch.forEach((id) => next.add(id)); return next; });

    (async () => {
      const { getCardVariants } = await import("@/lib/actions/collection");
      const results = await Promise.all(toFetch.map(async (cardId) => ({ cardId, variants: await getCardVariants(cardId) })));
      setVariantCache((prev) => { const next = new Map(prev); results.forEach(({ cardId, variants }) => next.set(cardId, variants)); return next; });
      setLoadingVariants((prev) => { const next = new Set(prev); toFetch.forEach((id) => next.delete(id)); return next; });
    })();
  }, [drawerOpen, selection, variantCache, loadingVariants]);

  // Build batch items from selection
  const buildItems = () =>
    [...selection.entries()].map(([cardId, quantity]) => ({
      cardId,
      quantity,
      variantId: variantOverrides.get(cardId),
    }));

  const handleAddToCollection = () => {
    startTransition(async () => {
      const { batchAddToCollection } = await import("@/lib/actions/collection");
      const result = await batchAddToCollection(buildItems());
      showSuccess(`+${result.added} to collection`);
    });
  };

  const handleRemoveFromCollection = () => {
    startTransition(async () => {
      const { batchRemoveFromCollection } = await import("@/lib/actions/collection");
      const items = [...selection.entries()].map(([cardId, quantity]) => ({ cardId, quantity }));
      const result = await batchRemoveFromCollection(items);
      showSuccess(`−${result.removed} from collection`);
    });
  };

  const handleAddToDeck = () => {
    const dId = targetDeckId;
    if (!dId) return;
    startTransition(async () => {
      const { batchAddToDeck } = await import("@/lib/actions/deck");
      const items = [...selection.entries()].map(([cardId, quantity]) => {
        const card = cards.find((c) => c.id === cardId);
        const section = card?.type === "Avatar" ? "avatar" as const
          : card?.type === "Site" ? "atlas" as const
          : "spellbook" as const;
        return { cardId, quantity, section };
      });
      const result = await batchAddToDeck(dId, items);
      showSuccess(`+${result.added} to deck`);
    });
  };

  const handleAddToDeckCollection = () => {
    const dId = targetDeckId;
    if (!dId) return;
    startTransition(async () => {
      const { batchAddToDeck } = await import("@/lib/actions/deck");
      const items = [...selection.entries()].map(([cardId, quantity]) => ({
        cardId,
        quantity,
        section: "collection" as const,
      }));
      const result = await batchAddToDeck(dId, items);
      showSuccess(`+${result.added} to deck collection`);
    });
  };

  const selectedCards = [...selection.entries()]
    .map(([cardId, qty]) => ({ cardId, qty, card: cards.find((c) => c.id === cardId) }))
    .filter((x) => x.card);

  return (
    <>
      {/* ── Compact floating pill ── */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-full shadow-2xl px-3 py-2 flex items-center gap-2">
          {success ? (
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium px-2">
              <Check className="h-4 w-4" />
              {success}
            </div>
          ) : (
            <>
              {/* Drawer toggle */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 text-amber-200 text-sm font-medium cursor-pointer hover:bg-amber-500/30 transition-colors"
              >
                <span className="tabular-nums">{totalCards}</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </button>

              <div className="h-4 w-px bg-border" />

              {/* Context-aware actions */}
              {context === "browse" && (
                <Tip label="Add to collection">
                  <button onClick={handleAddToCollection} disabled={isPending}
                    className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer disabled:opacity-50">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                  </button>
                </Tip>
              )}

              {context === "collection" && (
                <Tip label="Remove from collection">
                  <button onClick={handleRemoveFromCollection} disabled={isPending}
                    className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 text-red-400">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </Tip>
              )}

              {/* Deck actions — available in all contexts */}
              {userDecks.length > 0 && (
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
                  <Tip label="Add to deck spellbook">
                    <button onClick={handleAddToDeck} disabled={isPending || !targetDeckId}
                      className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer disabled:opacity-50">
                      <BookmarkPlus className="h-4 w-4" />
                    </button>
                  </Tip>
                  <Tip label="Add to deck collection (sideboard)">
                    <button onClick={handleAddToDeckCollection} disabled={isPending || !targetDeckId}
                      className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer disabled:opacity-50">
                      <Library className="h-4 w-4" />
                    </button>
                  </Tip>
                </>
              )}

              <div className="h-4 w-px bg-border" />

              <button onClick={onClear} className="p-1.5 rounded-full hover:bg-muted transition-colors cursor-pointer">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom drawer ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="max-h-[70vh] flex flex-col rounded-t-xl">
          <SheetHeader className="shrink-0 pb-3 border-b border-border">
            <SheetTitle>
              Selection ({uniqueCards} card{uniqueCards !== 1 ? "s" : ""}, {totalCards} total)
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {selectedCards.map(({ cardId, qty, card }) => {
              const variants = variantCache.get(cardId);
              const selectedVariant = variantOverrides.get(cardId);
              const isLoading = loadingVariants.has(cardId);

              return (
                <div key={cardId} className="flex items-start gap-3 p-2 rounded-lg border border-border/40 bg-card">
                  <CardImage slug={card!.variantSlug!} name={card!.name} width={48} height={67} className="rounded-sm shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{card!.name}</p>
                    <p className="text-[10px] text-muted-foreground">{card!.type} · {card!.rarity ?? "—"}</p>
                    {isLoading ? (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                      </div>
                    ) : variants && variants.length > 1 ? (
                      <Select
                        value={selectedVariant ?? "default"}
                        onValueChange={(v) => {
                          setVariantOverrides((prev) => {
                            const next = new Map(prev);
                            if (v === "default") next.delete(cardId); else next.set(cardId, v);
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
                              {v.setName} · {v.finish}
                              {v.marketPrice != null && ` · $${v.marketPrice.toFixed(2)}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => qty <= 1 && onRemoveCard ? onRemoveCard(cardId) : onUpdateQty?.(cardId, qty - 1)}
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
          <div className="shrink-0 pt-3 border-t border-border flex flex-wrap gap-2">
            {context === "browse" && (
              <Button size="sm" className="flex-1 gap-1.5"
                onClick={() => { setDrawerOpen(false); handleAddToCollection(); }} disabled={isPending}>
                <FolderPlus className="h-3.5 w-3.5" /> Collection
              </Button>
            )}
            {context === "collection" && (
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-red-400"
                onClick={() => { setDrawerOpen(false); handleRemoveFromCollection(); }} disabled={isPending}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
            {targetDeckId && (
              <>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                  onClick={() => { setDrawerOpen(false); handleAddToDeck(); }} disabled={isPending}>
                  <BookmarkPlus className="h-3.5 w-3.5" /> Deck
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                  onClick={() => { setDrawerOpen(false); handleAddToDeckCollection(); }} disabled={isPending}>
                  <Library className="h-3.5 w-3.5" /> Deck Collection
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" className="text-muted-foreground"
              onClick={() => { setDrawerOpen(false); onClear(); }}>
              Clear
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-popover text-popover-foreground text-[10px] whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none border border-border shadow-md">
        {label}
      </div>
    </div>
  );
}
