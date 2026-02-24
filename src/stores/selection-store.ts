import { create } from "zustand";

const STORAGE_KEY = "sc-selection";

/** Serialize Map to sessionStorage */
function persist(items: Map<string, number>, active: boolean) {
  try {
    if (items.size === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ active, items: [...items.entries()] })
      );
    }
  } catch {
    // quota exceeded or SSR — ignore
  }
}

/** Restore from sessionStorage */
function hydrate(): { items: Map<string, number>; active: boolean } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: new Map(), active: false };
    const parsed = JSON.parse(raw);
    return {
      items: new Map(parsed.items ?? []),
      active: parsed.active ?? false,
    };
  } catch {
    return { items: new Map(), active: false };
  }
}

export interface SelectionState {
  /** card ID → quantity */
  items: Map<string, number>;
  /** Whether selection mode is active */
  active: boolean;
  /** Whether the store has hydrated from sessionStorage */
  hydrated: boolean;
}

export interface SelectionActions {
  /** Hydrate from sessionStorage (call once on mount) */
  _hydrate: () => void;
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
  add: (cardId: string) => void;
  remove: (cardId: string) => void;
  setQty: (cardId: string, qty: number) => void;
  removeCard: (cardId: string) => void;
  clear: () => void;
  total: () => number;
}

export type SelectionStore = SelectionState & SelectionActions;

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  items: new Map(),
  active: false,
  hydrated: false,

  _hydrate: () => {
    if (get().hydrated) return;
    const restored = hydrate();
    set({ ...restored, hydrated: true });
  },

  activate: () => {
    set({ active: true });
    persist(get().items, true);
  },

  deactivate: () => {
    set({ active: false, items: new Map() });
    persist(new Map(), false);
  },

  toggle: () => {
    const { active, items } = get();
    if (active) {
      set({ active: false, items: new Map() });
      persist(new Map(), false);
    } else {
      set({ active: true });
      persist(items, true);
    }
  },

  add: (cardId) =>
    set((s) => {
      const next = new Map(s.items);
      next.set(cardId, (next.get(cardId) ?? 0) + 1);
      persist(next, true);
      return { items: next, active: true };
    }),

  remove: (cardId) =>
    set((s) => {
      const next = new Map(s.items);
      const current = next.get(cardId) ?? 0;
      if (current <= 1) next.delete(cardId);
      else next.set(cardId, current - 1);
      const active = next.size > 0;
      persist(next, active);
      return { items: next, active };
    }),

  setQty: (cardId, qty) =>
    set((s) => {
      const next = new Map(s.items);
      if (qty <= 0) next.delete(cardId);
      else next.set(cardId, qty);
      const active = next.size > 0 ? true : s.active;
      persist(next, active);
      return { items: next, active };
    }),

  removeCard: (cardId) =>
    set((s) => {
      const next = new Map(s.items);
      next.delete(cardId);
      const active = next.size > 0;
      persist(next, active);
      return { items: next, active };
    }),

  clear: () => {
    set({ items: new Map(), active: false });
    persist(new Map(), false);
  },

  total: () => {
    let sum = 0;
    for (const qty of get().items.values()) sum += qty;
    return sum;
  },
}));
