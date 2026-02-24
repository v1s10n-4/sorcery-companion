"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CardImage } from "@/components/card-image";
import {
  X,
  ChevronUp,
  FolderPlus,
  Loader2,
  Check,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { useSelectionStore } from "@/stores/selection-store";

type RouteContext = "browse" | "collection" | "deck";

function getRouteContext(pathname: string): RouteContext {
  if (pathname.startsWith("/collection")) return "collection";
  if (pathname.startsWith("/decks/")) return "deck";
  return "browse";
}

function getDeckId(pathname: string): string | null {
  const match = pathname.match(/^\/decks\/([^/]+)/);
  return match?.[1] ?? null;
}

export function SelectionActionBar() {
  const items = useSelectionStore((s) => s.items);
  const clear = useSelectionStore((s) => s.clear);
  const setQty = useSelectionStore((s) => s.setQty);
  const removeCard = useSelectionStore((s) => s.removeCard);
  const total = useSelectionStore((s) => s.total());

  const pathname = usePathname();
  const context = getRouteContext(pathname);
  const deckId = getDeckId(pathname);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);
  const [cardMeta, setCardMeta] = useState<
    Map<
      string,
      { name: string; type: string; rarity: string | null; slug: string | null }
    >
  >(new Map());
  const [loadingMeta, setLoadingMeta] = useState(false);

  const uniqueCards = items.size;
  const selectedIds = useMemo(() => [...items.keys()], [items]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => {
      setSuccess(null);
      clear();
    }, 1200);
  };

  // Fetch card metadata when drawer opens
  useEffect(() => {
    if (!drawerOpen) return;
    const toFetch = selectedIds.filter((id) => !cardMeta.has(id));
    if (toFetch.length === 0) return;

    setLoadingMeta(true);
    (async () => {
      const { getCardMetaBatch } = await import("@/lib/actions/cards");
      const results = await getCardMetaBatch(toFetch);
      setCardMeta((prev) => {
        const next = new Map(prev);
        for (const r of results) next.set(r.id, r);
        return next;
      });
      setLoadingMeta(false);
    })();
  }, [drawerOpen, selectedIds, cardMeta]);

  // Actions — no try/catch wrapping (let Next.js handle redirects naturally)
  const handleAddToCollection = () => {
    startTransition(async () => {
      const { batchAddToCollection } = await import("@/lib/actions/collection");
      const batch = [...items.entries()].map(([cardId, quantity]) => ({
        cardId,
        quantity,
      }));
      const result = await batchAddToCollection(batch);
      showSuccess(`+${result.added} to collection`);
    });
  };

  const handleRemoveFromCollection = () => {
    startTransition(async () => {
      const { batchRemoveFromCollection } = await import(
        "@/lib/actions/collection"
      );
      const batch = [...items.entries()].map(([cardId, quantity]) => ({
        cardId,
        quantity,
      }));
      const result = await batchRemoveFromCollection(batch);
      showSuccess(`−${result.removed} from collection`);
    });
  };

  const handleAddToDeck = () => {
    if (!deckId) return;
    startTransition(async () => {
      const { batchAddToDeck } = await import("@/lib/actions/deck");
      // Don't pass section — let the server auto-detect from card type
      const batch = [...items.entries()].map(([cardId, quantity]) => ({
        cardId,
        quantity,
      }));
      const result = await batchAddToDeck(deckId!, batch);
      showSuccess(`+${result.added} to deck`);
    });
  };

  return (
    <>
      {/* Compact floating pill */}
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
                <span className="tabular-nums">{total}</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </button>

              <div className="h-4 w-px bg-border" />

              {/* Context-aware quick actions */}
              {(context === "browse" || context === "collection") && (
                <Tip label="Add to collection">
                  <button
                    onClick={handleAddToCollection}
                    disabled={isPending}
                    className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FolderPlus className="h-4 w-4" />
                    )}
                  </button>
                </Tip>
              )}

              {context === "collection" && (
                <Tip label="Remove from collection">
                  <button
                    onClick={handleRemoveFromCollection}
                    disabled={isPending}
                    className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 text-red-400"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </Tip>
              )}

              {context === "deck" && deckId && (
                <Tip label="Add to deck">
                  <button
                    onClick={handleAddToDeck}
                    disabled={isPending}
                    className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FolderPlus className="h-4 w-4" />
                    )}
                  </button>
                </Tip>
              )}

              <div className="h-4 w-px bg-border" />

              <button
                onClick={clear}
                className="p-1.5 rounded-full hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bottom drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[70vh] flex flex-col rounded-t-xl"
        >
          <SheetHeader className="shrink-0 pb-3 border-b border-border">
            <SheetTitle>
              Selection ({uniqueCards} card{uniqueCards !== 1 ? "s" : ""},{" "}
              {total} total)
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {selectedIds.map((cardId) => {
              const qty = items.get(cardId) ?? 0;
              const meta = cardMeta.get(cardId);

              return (
                <div
                  key={cardId}
                  className="flex items-start gap-3 p-2 rounded-lg border border-border/40 bg-card"
                >
                  {meta?.slug ? (
                    <CardImage
                      slug={meta.slug}
                      name={meta.name}
                      width={48}
                      height={67}
                      className="rounded-sm shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-[67px] rounded-sm bg-muted/30 shrink-0 flex items-center justify-center">
                      {loadingMeta && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {meta?.name ?? "Loading..."}
                    </p>
                    {meta && (
                      <p className="text-[10px] text-muted-foreground">
                        {meta.type} · {meta.rarity ?? "—"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        qty <= 1 ? removeCard(cardId) : setQty(cardId, qty - 1)
                      }
                      className="h-7 w-7 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                    >
                      {qty <= 1 ? (
                        <Trash2 className="h-3 w-3 text-red-400" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                    </button>
                    <span className="text-sm font-bold tabular-nums w-6 text-center">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(cardId, qty + 1)}
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
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => {
                setDrawerOpen(false);
                handleAddToCollection();
              }}
              disabled={isPending}
            >
              <FolderPlus className="h-3.5 w-3.5" /> Collection
            </Button>
            {context === "collection" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5 text-red-400"
                onClick={() => {
                  setDrawerOpen(false);
                  handleRemoveFromCollection();
                }}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
            {context === "deck" && deckId && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => {
                  setDrawerOpen(false);
                  handleAddToDeck();
                }}
                disabled={isPending}
              >
                <FolderPlus className="h-3.5 w-3.5" /> Deck
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => {
                setDrawerOpen(false);
                clear();
              }}
            >
              Clear
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Tip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-popover text-popover-foreground text-[10px] whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none border border-border shadow-md">
        {label}
      </div>
    </div>
  );
}
