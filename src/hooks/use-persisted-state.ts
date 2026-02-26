"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Like useState but persists to localStorage.
 * Hydrates from storage on mount, writes on every change.
 * SSR-safe: returns initialValue during SSR, hydrates client-side.
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(initialValue);
  const hydrated = useRef(false);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors / quota errors
    }
    hydrated.current = true;
  }, [key]);

  // Persist to localStorage on every change (after hydration)
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (
        (Array.isArray(value) && value.length === 0) ||
        value === initialValue
      ) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // Quota exceeded — silently fail
    }
  }, [key, value, initialValue]);

  // Clear helper (removes from storage and resets state)
  const clear = useCallback(() => {
    setValue(initialValue);
    try {
      localStorage.removeItem(key);
    } catch {}
  }, [key, initialValue]);

  return [value, setValue, clear];
}
