import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { SetsListSkeleton } from "@/components/skeletons";

export default function SetsLoading() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-5xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        All cards
      </Link>
      <div className="h-9 w-32 bg-muted rounded animate-pulse mb-8" />
      <SetsListSkeleton />
    </main>
  );
}
