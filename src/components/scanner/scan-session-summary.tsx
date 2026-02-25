"use client";

import { useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/card-image";
import { Check, FolderPlus, Loader2, Trash2 } from "lucide-react";
import type { ScanSessionItem } from "@/lib/actions/scan";

interface ScanSessionSummaryProps {
  open: boolean;
  items: ScanSessionItem[];
  onCommit: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function ScanSessionSummary({
  open,
  items,
  onCommit,
  onDiscard,
  onClose,
}: ScanSessionSummaryProps) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

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
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="max-h-[75vh] flex flex-col rounded-t-xl">
        {done ? (
          /* ── Success state ── */
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
            <Button className="mt-2" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <SheetHeader className="shrink-0 pb-3 border-b border-border/60">
              <SheetTitle>
                Session Summary
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {items.length} card{items.length !== 1 ? "s" : ""} scanned
                {totalQty !== items.length ? ` (${totalQty} total)` : ""}
              </p>
            </SheetHeader>

            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No cards scanned yet.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-3 space-y-2">
                {items.map((item, i) => (
                  <div
                    key={`${item.cardId}-${i}`}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg border border-border/40 bg-card"
                  >
                    {item.slug ? (
                      <CardImage
                        slug={item.slug}
                        name={item.name}
                        width={36}
                        height={50}
                        className="rounded-sm shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-[50px] rounded-sm bg-muted/30 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-amber-300 shrink-0">
                      ×{item.quantity}
                    </span>
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
                onClick={() => { onDiscard(); handleClose(); }}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
                Discard session
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
