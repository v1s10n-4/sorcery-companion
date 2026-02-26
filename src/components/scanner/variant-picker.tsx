"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CardImage } from "@/components/card-image";
import { Check, DollarSign } from "lucide-react";
import type { CardVariantOption } from "@/lib/actions/scan";

interface VariantPickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  variants: CardVariantOption[];
  selectedVariantId: string | null;
  onSelect: (variant: CardVariantOption) => void;
}

export function VariantPicker({
  open,
  onOpenChange,
  variants,
  selectedVariantId,
  onSelect,
}: VariantPickerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[65vh] flex flex-col rounded-t-xl"
      >
        <SheetHeader className="shrink-0 pb-3 border-b border-border/60">
          <SheetTitle>Select Printing</SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose the set and finish for this card.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-1.5">
          {variants.map((v) => {
            const isSelected = v.variantId === selectedVariantId;
            return (
              <button
                key={v.variantId}
                onClick={() => onSelect(v)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left cursor-pointer min-h-[56px] ${
                  isSelected
                    ? "bg-amber-500/15 border border-amber-500/30"
                    : "hover:bg-muted/40 border border-transparent"
                }`}
              >
                {v.slug ? (
                  <CardImage
                    slug={v.slug}
                    name={`${v.setName} ${v.finish}`}
                    width={36}
                    height={50}
                    className="rounded-sm shrink-0"
                  />
                ) : (
                  <div className="w-9 h-[50px] rounded-sm bg-muted/30 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{v.setName}</p>
                  <p className="text-[10px] text-muted-foreground">{v.finish}</p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {v.price != null && (
                    <span className="flex items-center gap-0.5 text-xs text-green-400 tabular-nums">
                      <DollarSign className="h-3 w-3" />
                      {v.price.toFixed(2)}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
