"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { ElementIcon } from "@/components/icons";
import {
  toggleFieldValue,
  setFieldRange,
  setFieldNumeric,
  setFieldMode,
  clearAllFields,
  type ActiveFilters,
  type FilterMode,
  type NumOp,
} from "@/lib/search";
import {
  type SetInfo,
  ELEMENTS,
  RARITY_COLORS,
  RARITY_ACTIVE,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Types ──

interface FacetCounts {
  types: Record<string, number>;
  elements: Record<string, number>;
  rarities: Record<string, number>;
  sets: Record<string, number>;
  subtypes: Record<string, number>;
  keywords: Record<string, number>;
}

interface StatRange {
  min: number;
  max: number;
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
  statRanges: {
    cost: StatRange;
    attack: StatRange;
    defence: StatRange;
  };
}

// ── Mode option configs ──

const MULTI_MODE_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "all", label: "All" },
  { value: "none", label: "None" },
];

const BINARY_MODE_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "any", label: "Is" },
  { value: "none", label: "Is not" },
];

const THRESHOLD_OPS: { value: NumOp; label: string }[] = [
  { value: "gte", label: "≥" },
  { value: "eq", label: "=" },
  { value: "lte", label: "≤" },
];

// ── Main component ──

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
  statRanges,
}: FilterSheetProps) {
  const toggle = useCallback(
    (field: string, value: string, mode: FilterMode) => {
      onQueryChange(toggleFieldValue(query, field, value, mode));
    },
    [query, onQueryChange]
  );

  const changeMode = useCallback(
    (field: string, mode: FilterMode) => {
      onQueryChange(setFieldMode(query, field, mode));
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
    (field: string, op: NumOp, value: number | null) => {
      onQueryChange(setFieldNumeric(query, field, op, value));
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
      <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto px-5">
        <SheetHeader className="pb-4">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6">
          {/* ── Element ── */}
          <FilterGroup
            label="Element"
            mode={activeFilters.elements.mode}
            onModeChange={(m) => changeMode("element", m)}
            modeOptions={MULTI_MODE_OPTIONS}
            showMode={activeFilters.elements.values.length > 0}
          >
            <div className="flex flex-wrap gap-2">
              {ELEMENTS.map((el) => {
                const active = activeFilters.elements.values.includes(
                  el.toLowerCase()
                );
                const count = facetCounts.elements[el] ?? 0;
                return (
                  <ToggleChip
                    key={el}
                    active={active}
                    count={count}
                    onClick={() =>
                      toggle("element", el, activeFilters.elements.mode)
                    }
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

          {/* ── Type ── */}
          <FilterGroup
            label="Type"
            mode={activeFilters.types.mode}
            onModeChange={(m) => changeMode("type", m)}
            modeOptions={BINARY_MODE_OPTIONS}
            showMode={activeFilters.types.values.length > 0}
          >
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <ToggleChip
                  key={t}
                  active={activeFilters.types.values.includes(t.toLowerCase())}
                  count={facetCounts.types[t] ?? 0}
                  onClick={() =>
                    toggle("type", t, activeFilters.types.mode)
                  }
                >
                  {t}
                </ToggleChip>
              ))}
            </div>
          </FilterGroup>

          {/* ── Rarity ── */}
          <FilterGroup
            label="Rarity"
            mode={activeFilters.rarities.mode}
            onModeChange={(m) => changeMode("rarity", m)}
            modeOptions={BINARY_MODE_OPTIONS}
            showMode={activeFilters.rarities.values.length > 0}
          >
            <div className="flex flex-wrap gap-2">
              {rarities.map((r) => {
                const active = activeFilters.rarities.values.includes(
                  r.toLowerCase()
                );
                const count = facetCounts.rarities[r] ?? 0;
                return (
                  <button
                    key={r}
                    onClick={() =>
                      toggle("rarity", r, activeFilters.rarities.mode)
                    }
                    disabled={count === 0 && !active}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-sm transition-all cursor-pointer",
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

          {/* ── Set ── */}
          <FilterGroup
            label="Set"
            mode={activeFilters.sets.mode}
            onModeChange={(m) => changeMode("set", m)}
            modeOptions={BINARY_MODE_OPTIONS}
            showMode={activeFilters.sets.values.length > 0}
          >
            <div className="flex flex-col gap-1.5">
              {sets.map((s) => {
                const active = activeFilters.sets.values.includes(
                  s.slug.toLowerCase()
                );
                const count = facetCounts.sets[s.slug] ?? 0;
                return (
                  <button
                    key={s.slug}
                    onClick={() =>
                      toggle("set", s.slug, activeFilters.sets.mode)
                    }
                    disabled={count === 0 && !active}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all text-left cursor-pointer",
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

          {/* ── Cost slider ── */}
          <RangeSliderFilter
            label="Cost"
            range={activeFilters.cost}
            bounds={statRanges.cost}
            onChange={(min, max) => setRange("cost", min, max)}
          />

          {/* ── Attack slider ── */}
          <RangeSliderFilter
            label="Attack"
            range={activeFilters.attack}
            bounds={statRanges.attack}
            onChange={(min, max) => setRange("attack", min, max)}
          />

          {/* ── Defence slider ── */}
          <RangeSliderFilter
            label="Defence"
            range={activeFilters.defence}
            bounds={statRanges.defence}
            onChange={(min, max) => setRange("defence", min, max)}
          />

          {/* ── Subtypes ── */}
          <SearchableChipList
            label="Subtype"
            field="subtype"
            items={subtypes}
            state={activeFilters.subtypes}
            counts={facetCounts.subtypes}
            onToggle={(v) =>
              toggle("subtype", v, activeFilters.subtypes.mode)
            }
            onModeChange={(m) => changeMode("subtype", m)}
            initialShow={10}
          />

          {/* ── Keywords ── */}
          <SearchableChipList
            label="Keyword"
            field="keyword"
            items={keywords}
            state={activeFilters.keywords}
            counts={facetCounts.keywords}
            onToggle={(v) =>
              toggle("keyword", v, activeFilters.keywords.mode)
            }
            onModeChange={(m) => changeMode("keyword", m)}
            initialShow={10}
          />

          {/* ── Thresholds ── */}
          <FilterGroupSimple label="Threshold">
            <div className="flex flex-col gap-3">
              {(
                [
                  ["Fire", "threshold_fire", activeFilters.thresholdFire],
                  ["Water", "threshold_water", activeFilters.thresholdWater],
                  ["Earth", "threshold_earth", activeFilters.thresholdEarth],
                  ["Air", "threshold_air", activeFilters.thresholdAir],
                ] as const
              ).map(([label, field, state]) => (
                <ThresholdRow
                  key={field}
                  element={label}
                  field={field}
                  state={state}
                  onChange={(op, val) => setThreshold(field, op, val)}
                />
              ))}
            </div>
          </FilterGroupSimple>
        </div>

        {activeCount > 0 && (
          <div className="sticky bottom-0 pt-4 pb-2 mt-4 border-t border-border bg-background">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={clearAll}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Sub-components ──

function FilterGroupSimple({
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

function FilterGroup({
  label,
  mode,
  onModeChange,
  modeOptions,
  showMode,
  children,
}: {
  label: string;
  mode: FilterMode;
  onModeChange: (m: FilterMode) => void;
  modeOptions: { value: FilterMode; label: string }[];
  showMode: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </h3>
        {showMode && (
          <ModeToggle value={mode} onChange={onModeChange} options={modeOptions} />
        )}
      </div>
      {children}
    </div>
  );
}

function ModeToggle({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: FilterMode) => void;
  options: { value: FilterMode; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer",
            value === opt.value
              ? "bg-amber-600 text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
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
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all cursor-pointer",
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

// ── Range Slider Filter ──

function RangeSliderFilter({
  label,
  range,
  bounds,
  onChange,
}: {
  label: string;
  range: { min?: number; max?: number; exact?: number } | null;
  bounds: StatRange;
  onChange: (min?: number, max?: number) => void;
}) {
  const currentMin = range?.exact ?? range?.min ?? bounds.min;
  const currentMax = range?.exact ?? range?.max ?? bounds.max;
  const isActive =
    range != null &&
    (currentMin > bounds.min || currentMax < bounds.max);

  return (
    <FilterGroupSimple label={label}>
      <div className="px-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span
            className={cn(
              "tabular-nums font-medium min-w-[2ch] text-center",
              isActive && "text-amber-300"
            )}
          >
            {currentMin}
          </span>
          <span className="text-[10px] opacity-50">
            {bounds.min}–{bounds.max}
          </span>
          <span
            className={cn(
              "tabular-nums font-medium min-w-[2ch] text-center",
              isActive && "text-amber-300"
            )}
          >
            {currentMax}
          </span>
        </div>
        <Slider
          min={bounds.min}
          max={bounds.max}
          step={1}
          value={[currentMin, currentMax]}
          onValueChange={([newMin, newMax]) => {
            const min = newMin > bounds.min ? newMin : undefined;
            const max = newMax < bounds.max ? newMax : undefined;
            onChange(min, max);
          }}
        />
      </div>
    </FilterGroupSimple>
  );
}

// ── Threshold Row ──

function ThresholdRow({
  element,
  field,
  state,
  onChange,
}: {
  element: string;
  field: string;
  state: { op: NumOp; val: number } | null;
  onChange: (op: NumOp, val: number | null) => void;
}) {
  const op = state?.op ?? "gte";
  const val = state?.val ?? null;

  return (
    <div className="flex items-center gap-2">
      <ElementIcon element={element} size="sm" />
      <Select
        value={op}
        onValueChange={(v) => {
          if (val != null) onChange(v as NumOp, val);
        }}
      >
        <SelectTrigger className="h-7 w-14 text-xs px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {THRESHOLD_OPS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => onChange(op, val === n ? null : n)}
            className={cn(
              "h-7 w-7 rounded text-xs font-medium transition-all cursor-pointer",
              "border",
              val === n
                ? "border-amber-500 bg-amber-900/30 text-amber-100"
                : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Searchable Collapsible Chip List ──

function SearchableChipList({
  label,
  field,
  items,
  state,
  counts,
  onToggle,
  onModeChange,
  initialShow = 10,
}: {
  label: string;
  field: string;
  items: string[];
  state: { values: string[]; mode: FilterMode };
  counts: Record<string, number>;
  onToggle: (value: string) => void;
  onModeChange: (mode: FilterMode) => void;
  initialShow?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter((item) => item.toLowerCase().includes(s));
  }, [items, search]);

  const visible = expanded ? filtered : filtered.slice(0, initialShow);
  const hasMore = filtered.length > initialShow;

  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </h3>
        {state.values.length > 0 && (
          <ModeToggle
            value={state.mode}
            onChange={onModeChange}
            options={MULTI_MODE_OPTIONS}
          />
        )}
      </div>

      {items.length > initialShow && (
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={`Filter ${label.toLowerCase()}s...`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setExpanded(true);
            }}
            className="h-7 pl-7 text-xs"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {visible.map((item) => {
          const active = state.values.includes(item.toLowerCase());
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

      {hasMore && !search && (
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
              Show {filtered.length - initialShow} more{" "}
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
