"use client";

// global-error.tsx catches errors thrown inside the Root Layout itself.
// It must include <html> and <body> since it replaces the entire layout.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-white font-sans flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-4xl font-bold text-amber-100 mb-4">
            Something went wrong
          </h1>
          <p className="text-white/60 mb-8 text-sm">
            An unexpected error occurred.{" "}
            {error.digest && (
              <span className="font-mono text-xs text-white/30">
                ({error.digest})
              </span>
            )}
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-amber-500 text-black rounded-lg font-semibold text-sm hover:bg-amber-400 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
