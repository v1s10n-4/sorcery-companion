import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { CardDetailSkeleton } from "@/components/skeletons";

export default function CardDetailLoading() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to cards
      </Link>
      <CardDetailSkeleton />
    </main>
  );
}
