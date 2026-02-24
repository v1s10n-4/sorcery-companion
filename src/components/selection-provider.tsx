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
 * Hydrates Zustand from sessionStorage, syncs store ↔ nuqs `?select=1`.
 */
export function SelectionProvider() {
  const active = useSelectionStore((s) => s.active);
  const itemCount = useSelectionStore((s) => s.items.size);
  const hydrated = useSelectionStore((s) => s.hydrated);
  const _hydrate = useSelectionStore((s) => s._hydrate);
  const deactivate = useSelectionStore((s) => s.deactivate);

  const [selectParam, setSelectParam] = useQueryState(
    "select",
    parseAsBoolean
      .withDefault(false)
      .withOptions({ shallow: true, clearOnDefault: true, throttleMs: 100 })
  );

  // Hydrate store from sessionStorage on first mount
  useEffect(() => {
    _hydrate();
  }, [_hydrate]);

  // Sync store → URL
  useEffect(() => {
    if (!hydrated) return;
    if (active && !selectParam) setSelectParam(true);
    else if (!active && selectParam) setSelectParam(null);
  }, [active, selectParam, setSelectParam, hydrated]);

  // Sync URL → store on load (e.g. shared link with ?select=1)
  // If URL says select but store has no items after hydration, clean up
  useEffect(() => {
    if (!hydrated) return;
    if (selectParam && itemCount === 0) {
      // URL says select mode but nothing to select — clean up
      setSelectParam(null);
    }
  }, [hydrated, selectParam, itemCount, setSelectParam]);

  // Don't render action bar until hydrated and we have items
  if (!hydrated || itemCount === 0) return null;

  return <SelectionActionBar />;
}
