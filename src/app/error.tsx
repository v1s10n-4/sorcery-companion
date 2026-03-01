"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Root-level error boundary — catches errors in any route group.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container mx-auto px-4 py-20 max-w-4xl text-center">
      <h1 className="text-4xl font-bold font-serif text-amber-100 mb-4">
        Something went wrong
      </h1>
      <p className="text-muted-foreground mb-8">
        An unexpected error occurred. Try refreshing the page.
        {error.digest && (
          <span className="block font-mono text-xs text-muted-foreground/40 mt-2">
            {error.digest}
          </span>
        )}
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
