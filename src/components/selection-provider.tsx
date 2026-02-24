"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useSelectionStore } from "@/stores/selection-store";

const SelectionActionBar = dynamic(
  () =>
    import("@/components/selection-action-bar").then(
      (m) => m.SelectionActionBar
    ),
  { ssr: false }
);

/**
 * Global selection provider — mount once in root layout.
 * Hydrates Zustand from sessionStorage, renders floating action bar.
 */
export function SelectionProvider() {
  const itemCount = useSelectionStore((s) => s.items.size);
  const hydrated = useSelectionStore((s) => s.hydrated);
  const _hydrate = useSelectionStore((s) => s._hydrate);

  useEffect(() => {
    _hydrate();
  }, [_hydrate]);

  if (!hydrated || itemCount === 0) return null;

  return <SelectionActionBar />;
}
