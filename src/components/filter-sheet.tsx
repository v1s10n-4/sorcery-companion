"use client";

import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { ElementIcon } from "@/components/icons";
import {
  toggleFieldValue,
  setFieldRange,
  setFieldNumeric,
  clearAllFields,
  type ActiveFilters,
} from "@/lib/search";
import {
  type SetInfo,
  ELEMENTS,
  RARITY_COLORS,
  RARITY_ACTIVE,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface FacetCounts {
  types: Record<string, number>;
  elements: Record<string, number>;
  rarities: Record<string, number>;
  sets: Record<string, number>;
  subtypes: Record<string, number>;
  keywords: Record<string, number>;
}

interface FilterSheetProps {
  query: string;
  onQueryChange: (q: string) => void;
  activeFilters: ActiveFilters;
  activeCount: number;
  types: string[];
  rarities: string[];
  sets: SetInfo[];
  subtypes: string[];
  keywords: string[];
  facetCounts: FacetCounts;
}

export function FilterSheet({
  query,
  onQueryChange,
  activeFilters,
  activeCount,
  types,
  rarities,
  sets,
  subtypes,
  keywords,
  facetCounts,
}: FilterSheetProps) {
  const toggle = useCallback(
    (field: string, value: string) => {
      onQueryChange(toggleFieldValue(query, field, value));
    },
    [query, onQueryChange]
  );

  const setRange = useCallback(
    (field: string, min?: number, max?: number) => {
      onQueryChange(setFieldRange(query, field, min, max));
    },
    [query, onQueryChange]
  );

  const setThreshold = useCallback(
    (field: string, value: number | null) => {
      onQueryChange(
        value != null
          ? setFieldNumeric(query, field, "gte", value)
          : setFieldNumeric(query, field, "gte", null)
      );
    },
    [query, onQueryChange]
  );

  const clearAll = useCallback(() => {
    onQueryChange(clearAllFields(query));
  }, [query, onQueryChange]);

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
              onClick={clearAll}
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
              {ELEMENTS.map((el) => {
                const active = activeFilters.elements.includes(
                  el.toLowerCase()
                );
                const count = facetCounts.elements[el] ?? 0;
                return (
                  <ToggleChip
                    key={el}
                    active={active}
                    count={count}
                    onClick={() => toggle("element", el)}
                  >
                    <ElementIcon
                      element={el}
                      size="sm"
                      className={!active && count === 0 ? "opacity-30" : ""}
                    />
                    {el}
                  </ToggleChip>
                );
              })}
            </div>
          </FilterGroup>

          {/* Types */}
          <FilterGroup label="Type">
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <ToggleChip
                  key={t}
                  active={activeFilters.types.includes(t.toLowerCase())}
                  count={facetCounts.types[t] ?? 0}
                  onClick={() => toggle("type", t)}
                >
                  {t}
                </ToggleChip>
              ))}
            </div>
          </FilterGroup>

          {/* Rarity */}
          <FilterGroup label="Rarity">
            <div className="flex flex-wrap gap-2">
              {rarities.map((r) => {
                const active = activeFilters.rarities.includes(r.toLowerCase());
                const count = facetCounts.rarities[r] ?? 0;
                return (
                  <button
                    key={r}
                    onClick={() => toggle("rarity", r)}
                    disabled={count === 0 && !active}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-sm transition-all",
                      active
                        ? RARITY_ACTIVE[r] ||
                            "border-amber-500 bg-amber-900/30 text-amber-100"
                        : count === 0
                          ? "border-border/50 text-muted-foreground/40 cursor-not-allowed"
                          : cn(
                              RARITY_COLORS[r] ||
                                "border-border text-muted-foreground",
                              "hover:opacity-80"
                            )
                    )}
                  >
                    {r}
                    <span className="ml-1 text-[10px] opacity-50">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          {/* Sets */}
          <FilterGroup label="Set">
            <div className="flex flex-col gap-1.5">
              {sets.map((s) => {
                const active = activeFilters.sets.includes(
                  s.slug.toLowerCase()
                );
                const count = facetCounts.sets[s.slug] ?? 0;
                return (
                  <button
                    key={s.slug}
                    onClick={() => toggle("set", s.slug)}
                    disabled={count === 0 && !active}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all text-left",
                      active
                        ? "border-amber-500 bg-amber-900/30 text-amber-100"
                        : count === 0
                          ? "border-border/50 text-muted-foreground/40 cursor-not-allowed"
                          : "border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{s.name}</span>
                    <span className="text-[10px] opacity-50">{count}</span>
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          {/* Cost range */}
          <RangeFilter
            label="Cost"
            range={activeFilters.cost}
            onChange={(min, max) => setRange("cost", min, max)}
          />

          {/* Attack range */}
          <RangeFilter
            label="Attack"
            range={activeFilters.attack}
            onChange={(min, max) => setRange("attack", min, max)}
          />

          {/* Defence range */}
          <RangeFilter
            label="Defence"
            range={activeFilters.defence}
            onChange={(min, max) => setRange("defence", min, max)}
          />

          {/* Subtypes */}
          <CollapsibleList
            label="Subtype"
            items={subtypes}
            activeValues={activeFilters.subtypes}
            counts={facetCounts.subtypes}
            onToggle={(v) => toggle("subtype", v)}
            initialShow={8}
          />

          {/* Keywords */}
          <CollapsibleList
            label="Keyword"
            items={keywords}
            activeValues={activeFilters.keywords}
            counts={facetCounts.keywords}
            onToggle={(v) => toggle("keyword", v)}
            initialShow={8}
          />

          {/* Thresholds */}
          <FilterGroup label="Threshold">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["Fire", "threshold_fire", activeFilters.thresholdFire],
                  ["Water", "threshold_water", activeFilters.thresholdWater],
                  ["Earth", "threshold_earth", activeFilters.thresholdEarth],
                  ["Air", "threshold_air", activeFilters.thresholdAir],
                ] as const
              ).map(([label, field, val]) => (
                <div key={field} className="flex items-center gap-2">
                  <ElementIcon element={label} size="sm" />
                  <span className="text-xs text-muted-foreground">≥</span>
                  <Input
                    type="number"
                    min={0}
                    max={4}
                    value={val ?? ""}
                    onChange={(e) => {
                      const n = e.target.value
                        ? parseInt(e.target.value, 10)
                        : null;
                      setThreshold(field, n);
                    }}
                    className="h-7 w-14 text-xs text-center px-1"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </FilterGroup>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Sub-components ──

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

function ToggleChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={count === 0 && !active}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all",
        active
          ? "border-amber-500 bg-amber-900/30 text-amber-100"
          : count === 0
            ? "border-border/50 text-muted-foreground/40 cursor-not-allowed"
            : "border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      <span className="text-[10px] opacity-50">{count}</span>
    </button>
  );
}

function RangeFilter({
  label,
  range,
  onChange,
}: {
  label: string;
  range: { min?: number; max?: number; exact?: number } | null;
  onChange: (min?: number, max?: number) => void;
}) {
  const min = range?.exact ?? range?.min;
  const max = range?.exact ?? range?.max;

  return (
    <FilterGroup label={label}>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={min ?? ""}
          onChange={(e) => {
            const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
            onChange(v, max);
          }}
          className="h-8 w-16 text-xs text-center"
          placeholder="min"
        />
        <span className="text-xs text-muted-foreground">—</span>
        <Input
          type="number"
          min={0}
          value={max ?? ""}
          onChange={(e) => {
            const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
            onChange(min, v);
          }}
          className="h-8 w-16 text-xs text-center"
          placeholder="max"
        />
      </div>
    </FilterGroup>
  );
}

function CollapsibleList({
  label,
  items,
  activeValues,
  counts,
  onToggle,
  initialShow = 8,
}: {
  label: string;
  items: string[];
  activeValues: string[];
  counts: Record<string, number>;
  onToggle: (value: string) => void;
  initialShow?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initialShow);
  const hasMore = items.length > initialShow;

  if (items.length === 0) return null;

  return (
    <FilterGroup label={label}>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((item) => {
          const active = activeValues.includes(item.toLowerCase());
          const count = counts[item] ?? 0;
          return (
            <ToggleChip
              key={item}
              active={active}
              count={count}
              onClick={() => onToggle(item)}
            >
              {item}
            </ToggleChip>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show {items.length - initialShow} more{" "}
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </FilterGroup>
  );
}
