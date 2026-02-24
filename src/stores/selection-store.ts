import { create } from "zustand";

export interface SelectionState {
  /** card ID → quantity */
  items: Map<string, number>;
  /** Whether selection mode is active */
  active: boolean;
}

export interface SelectionActions {
  /** Enter selection mode (without selecting anything yet) */
  activate: () => void;
  /** Exit selection mode and clear all selections */
  deactivate: () => void;
  /** Toggle selection mode */
  toggle: () => void;
  /** Add 1 copy of a card (auto-activates mode) */
  add: (cardId: string) => void;
  /** Remove 1 copy of a card (deactivates if empty) */
  remove: (cardId: string) => void;
  /** Set exact quantity for a card */
  setQty: (cardId: string, qty: number) => void;
  /** Remove a card entirely from selection */
  removeCard: (cardId: string) => void;
  /** Clear all selections and deactivate */
  clear: () => void;
  /** Total selected quantity across all cards */
  total: () => number;
}

export type SelectionStore = SelectionState & SelectionActions;

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  items: new Map(),
  active: false,

  activate: () => set({ active: true }),

  deactivate: () => set({ active: false, items: new Map() }),

  toggle: () => {
    const { active } = get();
    if (active) {
      set({ active: false, items: new Map() });
    } else {
      set({ active: true });
    }
  },

  add: (cardId) =>
    set((s) => {
      const next = new Map(s.items);
      next.set(cardId, (next.get(cardId) ?? 0) + 1);
      return { items: next, active: true };
    }),

  remove: (cardId) =>
    set((s) => {
      const next = new Map(s.items);
      const current = next.get(cardId) ?? 0;
      if (current <= 1) next.delete(cardId);
      else next.set(cardId, current - 1);
      const active = next.size > 0 ? true : false;
      return { items: next, active };
    }),

  setQty: (cardId, qty) =>
    set((s) => {
      const next = new Map(s.items);
      if (qty <= 0) next.delete(cardId);
      else next.set(cardId, qty);
      const active = next.size > 0 ? true : s.active;
      return { items: next, active };
    }),

  removeCard: (cardId) =>
    set((s) => {
      const next = new Map(s.items);
      next.delete(cardId);
      const active = next.size > 0 ? true : false;
      return { items: next, active };
    }),

  clear: () => set({ items: new Map(), active: false }),

  total: () => {
    let sum = 0;
    for (const qty of get().items.values()) sum += qty;
    return sum;
  },
}));
