"use client";

import { useEffect } from "react";
import { useQueryState, parseAsBoolean } from "nuqs";
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
 * Syncs Zustand store ↔ nuqs `?select=1` URL param.
 * Renders the floating action bar when items are selected.
 */
export function SelectionProvider() {
  const active = useSelectionStore((s) => s.active);
  const itemCount = useSelectionStore((s) => s.items.size);

  const [selectParam, setSelectParam] = useQueryState(
    "select",
    parseAsBoolean
      .withDefault(false)
      .withOptions({ shallow: true, clearOnDefault: true, throttleMs: 100 })
  );

  // Sync store → URL
  useEffect(() => {
    if (active && !selectParam) setSelectParam(true);
    else if (!active && selectParam) setSelectParam(null);
  }, [active, selectParam, setSelectParam]);

  // Sync URL → store (e.g. user navigates to ?select=1)
  useEffect(() => {
    const store = useSelectionStore.getState();
    if (selectParam && !store.active) store.activate();
    else if (!selectParam && store.active) store.deactivate();
    // Only run on selectParam change, not store changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectParam]);

  // Render action bar when items are selected
  if (itemCount === 0) return null;

  return <SelectionActionBar />;
}
