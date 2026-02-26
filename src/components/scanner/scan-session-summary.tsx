"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/card-image";
import {
  Check, FolderPlus, Loader2, Trash2, Minus, Plus,
  DollarSign, ChevronDown, Sparkles,
} from "lucide-react";
import { SetPicker } from "./set-picker";
import type { ScanSessionItem, ResolvedVariant } from "@/lib/actions/scan";

interface ScanSessionSummaryProps {
  open: boolean;
  items: ScanSessionItem[];
  onUpdateItem: (index: number, updates: Partial<ScanSessionItem>) => void;
  onRemoveItem: (index: number) => void;
  onCommit: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function ScanSessionSummary({
  open,
  items,
  onUpdateItem,
  onRemoveItem,
  onCommit,
  onDiscard,
  onClose,
}: ScanSessionSummaryProps) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  // Per-item set picker
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showItemSetPicker, setShowItemSetPicker] = useState(false);

  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = items.reduce(
    (sum, i) => sum + (i.price ?? 0) * i.quantity,
    0,
  );

  const handleCommit = () => {
    startTransition(async () => {
      const { commitScanSession } = await import("@/lib/actions/scan");
      const result = await commitScanSession(items);
      setAddedCount(result.added);
      setDone(true);
    });
  };

  const handleClose = () => {
    setDone(false);
    setAddedCount(0);
    setEditingIdx(null);
    onClose();
  };

  // Change set for a specific item
  const handleItemSetChange = useCallback(
    async (idx: number, setSlug: string | null) => {
      const item = items[idx];
      if (!item) return;
      const { resolveVariantForCard } = await import("@/lib/actions/scan");
      const isFoil = item.finish === "Foil";
      const newVariant = await resolveVariantForCard(item.cardId, setSlug, isFoil);
      if (newVariant) {
        onUpdateItem(idx, {
          variantId: newVariant.variantId,
          slug: newVariant.slug,
          setName: newVariant.setName,
          setSlug: newVariant.setSlug,
          finish: newVariant.finish,
          price: newVariant.price,
        });
      }
    },
    [items, onUpdateItem],
  );

  // Toggle foil for a specific item
  const handleItemFoilToggle = useCallback(
    async (idx: number) => {
      const item = items[idx];
      if (!item) return;
      const { toggleFinish } = await import("@/lib/actions/scan");
      const newVariant = await toggleFinish(item.cardId, item.setSlug, item.finish);
      if (newVariant) {
        onUpdateItem(idx, {
          variantId: newVariant.variantId,
          slug: newVariant.slug,
          setName: newVariant.setName,
          setSlug: newVariant.setSlug,
          finish: newVariant.finish,
          price: newVariant.price,
        });
      }
    },
    [items, onUpdateItem],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
        <SheetContent
          side="bottom"
          className="max-h-[80vh] flex flex-col rounded-t-xl"
        >
          {done ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
              <div className="h-16 w-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold font-serif text-amber-100">
                  {addedCount} card{addedCount !== 1 ? "s" : ""} added
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your collection has been updated.
                </p>
              </div>
              <Button
                className="mt-2"
                onClick={() => {
                  onCommit();
                  handleClose();
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <SheetHeader className="shrink-0 pb-3 border-b border-border/60">
                <SheetTitle>Scanned Cards</SheetTitle>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    {items.length} card{items.length !== 1 ? "s" : ""}
                    {totalQty !== items.length ? ` · ${totalQty} total` : ""}
                  </p>
                  {totalValue > 0 && (
                    <p className="flex items-center gap-0.5 text-xs text-green-400 font-semibold tabular-nums">
                      <DollarSign className="h-3 w-3" />
                      {totalValue.toFixed(2)}
                    </p>
                  )}
                </div>
              </SheetHeader>

              {items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    No cards scanned yet.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto py-3 space-y-2">
                  {items.map((item, i) => (
                    <div
                      key={`${item.cardId}-${item.variantId}-${i}`}
                      className="px-3 py-2.5 rounded-xl border border-border/40 bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {item.slug ? (
                          <CardImage
                            slug={item.slug}
                            name={item.name}
                            width={40}
                            height={56}
                            className="rounded-sm shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-[56px] rounded-sm bg-muted/30 shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {item.name}
                          </p>

                          {/* Set picker + foil toggle row */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <button
                              onClick={() => {
                                setEditingIdx(i);
                                setShowItemSetPicker(true);
                              }}
                              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              <span className="truncate max-w-[100px]">
                                {item.setName}
                              </span>
                              <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                            </button>

                            <button
                              onClick={() => handleItemFoilToggle(i)}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold transition-colors cursor-pointer ${
                                item.finish === "Foil"
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                              }`}
                            >
                              <Sparkles className="h-2 w-2" />
                              Foil
                            </button>
                          </div>

                          {item.price != null && (
                            <p className="flex items-center gap-0.5 text-[10px] text-green-400 tabular-nums mt-0.5">
                              <DollarSign className="h-2.5 w-2.5" />
                              {item.price.toFixed(2)}
                            </p>
                          )}
                        </div>

                        {/* Quantity controls */}
                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (item.quantity <= 1) {
                                onRemoveItem(i);
                              } else {
                                onUpdateItem(i, {
                                  quantity: item.quantity - 1,
                                });
                              }
                            }}
                            className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            {item.quantity <= 1 ? (
                              <Trash2 className="h-3 w-3 text-red-400" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                          </button>

                          <span className="text-sm font-bold tabular-nums text-amber-300 w-6 text-center">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              onUpdateItem(i, { quantity: item.quantity + 1 })
                            }
                            className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="shrink-0 pt-3 border-t border-border/60 space-y-2">
                <Button
                  className="w-full gap-1.5"
                  onClick={handleCommit}
                  disabled={isPending || items.length === 0}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FolderPlus className="h-4 w-4" />
                  )}
                  Add {totalQty} card{totalQty !== 1 ? "s" : ""} to collection
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground gap-1.5"
                  onClick={() => {
                    onDiscard();
                    handleClose();
                  }}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  Discard all
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Per-item set picker */}
      <SetPicker
        open={showItemSetPicker}
        onOpenChange={(v) => {
          setShowItemSetPicker(v);
          if (!v) setEditingIdx(null);
        }}
        selectedSetSlug={
          editingIdx !== null ? items[editingIdx]?.setSlug ?? null : null
        }
        onSelect={(slug) => {
          if (editingIdx !== null) {
            handleItemSetChange(editingIdx, slug);
          }
          setShowItemSetPicker(false);
          setEditingIdx(null);
        }}
      />
    </>
  );
}
