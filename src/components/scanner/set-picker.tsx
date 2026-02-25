"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Check, Layers } from "lucide-react";
import type { ScanSet } from "@/lib/actions/scan";

const STORAGE_KEY = "sc-scan-set";

interface SetPickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedSetSlug: string | null;
  onSelect: (slug: string | null) => void;
}

export function SetPicker({
  open,
  onOpenChange,
  selectedSetSlug,
  onSelect,
}: SetPickerProps) {
  const [sets, setSets] = useState<ScanSet[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || sets.length > 0) return;
    setLoading(true);
    import("@/lib/actions/scan").then(({ getScanSets }) => {
      getScanSets().then((data) => {
        setSets(data);
        setLoading(false);
      });
    });
  }, [open, sets.length]);

  const handleSelect = (slug: string | null) => {
    onSelect(slug);
    try {
      if (slug) sessionStorage.setItem(STORAGE_KEY, slug);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[65vh] flex flex-col rounded-t-xl">
        <SheetHeader className="shrink-0 pb-3 border-b border-border/60">
          <SheetTitle>Select Printing Set</SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cards will be added from this set when available.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-1">
          {/* "Any / Default" option */}
          <SetRow
            name="Any (use default variant)"
            cardCount={null}
            selected={selectedSetSlug === null}
            onSelect={() => handleSelect(null)}
            icon={<Layers className="h-4 w-4 text-muted-foreground" />}
          />

          {loading && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Loading sets…
            </div>
          )}

          {sets.map((s) => (
            <SetRow
              key={s.slug}
              name={s.name}
              cardCount={s.cardCount}
              selected={selectedSetSlug === s.slug}
              onSelect={() => handleSelect(s.slug)}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SetRow({
  name,
  cardCount,
  selected,
  onSelect,
  icon,
}: {
  name: string;
  cardCount: number | null;
  selected: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer min-h-[48px] ${
        selected
          ? "bg-amber-500/15 border border-amber-500/30 text-amber-100"
          : "hover:bg-muted/40 text-foreground"
      }`}
    >
      {icon ?? (
        <div className="h-4 w-4 rounded-full border border-border bg-muted/30 shrink-0" />
      )}
      <span className="flex-1 text-sm font-medium">{name}</span>
      {cardCount !== null && (
        <span className="text-[10px] text-muted-foreground tabular-nums">{cardCount} cards</span>
      )}
      {selected && <Check className="h-4 w-4 text-amber-400 shrink-0" />}
    </button>
  );
}

/** Rehydrate the set from sessionStorage on component mount */
export function getStoredScanSet(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}
