"use client";

/**
 * ViewTransitionHandler
 *
 * Handles browser back/forward (popstate) navigation with view transitions.
 * Must be inside <Suspense> — calls usePathname() which is dynamic.
 *
 * Reads the pathname change to know when the new page has mounted, then
 * resolves the pending view transition so the browser can complete the morph.
 */

import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, use } from "react";

type PendingTransition = [
  startPromise: Promise<void>,
  resolve: () => void,
];

export function ViewTransitionHandler() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [pending, setPending] = useState<PendingTransition | null>(null);
  const pendingRef = useRef(pending);

  // Keep ref in sync for the effect cleanup
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    if (!("startViewTransition" in document)) return;

    const onPopState = () => {
      let resolve!: () => void;
      const startPromise = new Promise<void>((r) => {
        document.startViewTransition(() => {
          r();
          return new Promise<void>((done) => {
            resolve = done;
          });
        });
      });
      setPending([startPromise, resolve]);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Block rendering of the incoming page until the transition screenshot is ready
  if (pending && prevPathname.current !== pathname) {
    use(pending[0]);
  }

  // Once the new page renders (pathname changed), finish the transition
  useEffect(() => {
    prevPathname.current = pathname;
    if (pendingRef.current) {
      pendingRef.current[1]();
      setPending(null);
    }
  }, [pathname]);

  return null;
}
