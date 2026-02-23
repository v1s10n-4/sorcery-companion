// Shared types for card browsing

export interface BrowserCard {
  id: string;
  name: string;
  type: string;
  rarity: string | null;
  cost: number | null;
  attack: number | null;
  defence: number | null;
  life: number | null;
  elements: string[];
  rulesText: string | null;
  variantSlug: string | null;
  setSlugs: string[];
}

export interface SetInfo {
  name: string;
  slug: string;
  cardCount: number;
}

export interface Filters {
  type: string;
  element: string;
  rarity: string;
  set: string;
}

export type SortKey =
  | "name"
  | "cost-asc"
  | "cost-desc"
  | "attack"
  | "defence";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "cost-asc", label: "Cost ↑" },
  { value: "cost-desc", label: "Cost ↓" },
  { value: "attack", label: "Attack ↓" },
  { value: "defence", label: "Defence ↓" },
];

export const ELEMENTS = ["Fire", "Water", "Earth", "Air"] as const;

// Canonical order: most common → rarest
export const RARITY_ORDER = ["Ordinary", "Exceptional", "Elite", "Unique"] as const;

export const RARITY_COLORS: Record<string, string> = {
  Ordinary: "border-zinc-500 text-zinc-400",
  Exceptional: "border-sky-500 text-sky-400",
  Elite: "border-purple-500 text-purple-400",
  Unique: "border-amber-500 text-amber-400",
};

export const RARITY_ACTIVE: Record<string, string> = {
  Ordinary: "bg-zinc-700 border-zinc-500 text-zinc-100",
  Exceptional: "bg-sky-900/60 border-sky-500 text-sky-100",
  Elite: "bg-purple-900/60 border-purple-500 text-purple-100",
  Unique: "bg-amber-900/60 border-amber-500 text-amber-100",
};
