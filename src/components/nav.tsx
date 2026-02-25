import Link from "next/link";
import { getUser } from "@/lib/auth";
import { UserMenu } from "@/components/user-menu";
import { MobileNav } from "@/components/mobile-nav";

export async function Nav() {
  const user = await getUser();

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

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
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
            {user ? (
              <>
                <Link
                  href="/collection"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Collection
                </Link>
                <Link
                  href="/decks"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Decks
                </Link>
                <Link
                  href="/scan"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Scan
                </Link>
                <UserMenu
                  name={user.name || "User"}
                  avatarUrl={user.avatarUrl}
                />
              </>
            ) : (
              <Link
                href="/login"
                className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
              >
                Sign in
              </Link>
            )}
          </div>

          {/* Mobile nav */}
          <div className="sm:hidden">
            <MobileNav
              isLoggedIn={!!user}
              userName={user?.name || "User"}
              avatarUrl={user?.avatarUrl ?? null}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
