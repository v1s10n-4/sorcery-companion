import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-12">
          <Link
            href="/"
            className="font-serif font-bold text-amber-100 hover:text-amber-50 transition-colors"
          >
            Sorcery Companion
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Cards
            </Link>
            <Link
              href="/sets"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sets
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
