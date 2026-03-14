import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Nav } from "@/components/nav";
import { SelectionProvider } from "@/components/selection-provider";

// PPR requires all dynamic data access to be inside <Suspense>.
// - Nav is an async server component (calls getUser → Supabase auth + Prisma)
// - NuqsAdapter calls useSearchParams() (dynamic hook)
// - SelectionProvider is pure client state (no dynamic data, safe outside Suspense)
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<NavSkeleton />}>
        <Nav />
      </Suspense>
      <NuqsAdapter>
        {children}
      </NuqsAdapter>
      <SelectionProvider />
    </>
  );
}

// Minimal skeleton matching Nav's height to prevent layout shift
function NavSkeleton() {
  return (
    <nav className="hidden sm:block border-b border-border/50 bg-card/50 h-12" />
  );
}
