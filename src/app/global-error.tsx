"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en" className="dark">
      <body style={{ minHeight: "100vh", backgroundColor: "#09090b", color: "#fafafa", fontFamily: "sans-serif" }}>
        <main style={{ maxWidth: "32rem", margin: "0 auto", padding: "5rem 1rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#fef3c7", marginBottom: "1rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#a1a1aa", marginBottom: "2rem" }}>
            An unexpected error occurred. Try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#27272a",
              color: "#fafafa",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
