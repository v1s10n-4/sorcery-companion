import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-20 max-w-4xl text-center">
      <h1 className="text-6xl font-bold font-serif text-amber-100 mb-4">
        404
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        This card doesn&apos;t exist in any realm.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to cards
      </Link>
    </main>
  );
}
