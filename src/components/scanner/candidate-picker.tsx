"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CardImage } from "@/components/card-image";
import { SkipForward } from "lucide-react";
import type { ScanCandidate } from "@/lib/actions/scan";

interface CandidatePickerProps {
  candidates: ScanCandidate[];
  open: boolean;
  onPick: (candidate: ScanCandidate) => void;
  onSkip: () => void;
}

export function CandidatePicker({
  candidates,
  open,
  onPick,
  onSkip,
}: CandidatePickerProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onSkip()}>
      <SheetContent
        side="bottom"
        className="max-h-[60vh] flex flex-col rounded-t-xl"
      >
        <SheetHeader className="shrink-0 pb-3 border-b border-border/60">
          <SheetTitle className="text-sm font-medium text-muted-foreground">
            Low confidence — which card is this?
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-1.5">
          {candidates.map((c) => (
            <button
              key={c.cardId}
              onClick={() => onPick(c)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 active:bg-muted/60 transition-colors text-left cursor-pointer min-h-[56px]"
            >
              {c.slug ? (
                <CardImage
                  slug={c.slug}
                  name={c.name}
                  width={36}
                  height={50}
                  className="rounded-sm shrink-0"
                />
              ) : (
                <div className="w-9 h-[50px] rounded-sm bg-muted/30 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{c.name}</p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    c.confidence >= 0.7
                      ? "text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {Math.round(c.confidence * 100)}%
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="shrink-0 pt-3 border-t border-border/60">
          <button
            onClick={onSkip}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer min-h-[44px]"
          >
            <SkipForward className="h-4 w-4" />
            Skip this card
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
