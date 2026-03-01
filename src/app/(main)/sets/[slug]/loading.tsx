import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { SetDetailSkeleton } from "@/components/skeletons";

export default function SetDetailLoading() {
  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1400px]">
      <Link
        href="/sets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        All sets
      </Link>
      <SetDetailSkeleton />
    </main>
  );
}
