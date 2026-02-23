"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { ElementIcon } from "@/components/icons";
import {
  type Filters,
  type SetInfo,
  ELEMENTS,
  RARITY_COLORS,
  RARITY_ACTIVE,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface FilterSheetProps {
  types: string[];
  rarities: string[];
  sets: SetInfo[];
  filters: Filters;
  onToggle: (key: keyof Filters, value: string) => void;
  onClear: () => void;
  activeCount: number;
}

export function FilterSheet({
  types,
  rarities,
  sets,
  filters,
  onToggle,
  onClear,
  activeCount,
}: FilterSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between pb-4">
          <SheetTitle>Filters</SheetTitle>
          {activeCount > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear all
            </button>
          )}
        </SheetHeader>

        <div className="flex flex-col gap-6">
          {/* Elements */}
          <FilterGroup label="Element">
            <div className="flex flex-wrap gap-2">
              {ELEMENTS.map((el) => (
                <button
                  key={el}
                  onClick={() => onToggle("element", el)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all",
                    filters.element === el
                      ? "border-amber-500 bg-amber-900/30 text-amber-100"
                      : "border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ElementIcon element={el} size="sm" />
                  {el}
                </button>
              ))}
            </div>
          </FilterGroup>

          {/* Types */}
          <FilterGroup label="Type">
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => onToggle("type", t)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-sm transition-all",
                    filters.type === t
                      ? "border-amber-500 bg-amber-900/30 text-amber-100"
                      : "border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </FilterGroup>

          {/* Rarity */}
          <FilterGroup label="Rarity">
            <div className="flex flex-wrap gap-2">
              {rarities.map((r) => (
                <button
                  key={r}
                  onClick={() => onToggle("rarity", r)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-sm transition-all",
                    filters.rarity === r
                      ? RARITY_ACTIVE[r] || "border-amber-500 bg-amber-900/30 text-amber-100"
                      : cn(
                          RARITY_COLORS[r] || "border-border text-muted-foreground",
                          "hover:opacity-80"
                        )
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </FilterGroup>

          {/* Sets */}
          <FilterGroup label="Set">
            <div className="flex flex-col gap-1.5">
              {sets.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => onToggle("set", s.slug)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all text-left",
                    filters.set === s.slug
                      ? "border-amber-500 bg-amber-900/30 text-amber-100"
                      : "border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{s.name}</span>
                  <span className="text-xs opacity-50">{s.cardCount}</span>
                </button>
              ))}
            </div>
          </FilterGroup>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </h3>
      {children}
    </div>
  );
}
