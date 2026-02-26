"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Layers, Camera, BookOpen, Swords, type LucideIcon } from "lucide-react";

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
  primary?: boolean;
}

const TABS: Tab[] = [
  { href: "/", label: "Cards", icon: Search, exact: true },
  { href: "/sets", label: "Sets", icon: Layers, exact: false },
  { href: "/scan", label: "Scan", icon: Camera, exact: true, primary: true },
  { href: "/collection", label: "Collection", icon: BookOpen, exact: false },
  { href: "/decks", label: "Decks", icon: Swords, exact: false },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Spacer so page content isn't hidden behind the bar */}
      <div className="h-16 sm:hidden" aria-hidden />

      <nav
        className="
          sm:hidden fixed bottom-0 left-0 right-0 z-40
          bg-card/95 backdrop-blur-md border-t border-border/50
          flex items-end justify-around
          pb-[env(safe-area-inset-bottom,0px)]
        "
        aria-label="Mobile navigation"
      >
        {TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          if (tab.primary) {
            // Centre scan button — elevated amber circle
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-end pb-2 -mt-3 group"
                aria-label={tab.label}
              >
                <span
                  className={`
                    flex items-center justify-center
                    h-14 w-14 rounded-full shadow-lg
                    transition-all duration-150
                    ${isActive
                      ? "bg-amber-500 shadow-amber-500/40"
                      : "bg-amber-600/90 group-active:bg-amber-500"
                    }
                  `}
                >
                  <tab.icon className="h-6 w-6 text-white" strokeWidth={1.75} />
                </span>
                <span
                  className={`text-[9px] mt-1 font-medium tracking-wide ${
                    isActive ? "text-amber-400" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-end pb-2 pt-2 flex-1 group min-w-0"
              aria-label={tab.label}
            >
              <tab.icon
                className={`h-[22px] w-[22px] transition-colors duration-150 ${
                  isActive
                    ? "text-amber-400"
                    : "text-muted-foreground group-active:text-foreground"
                }`}
                strokeWidth={isActive ? 2 : 1.75}
              />
              <span
                className={`text-[9px] mt-1 font-medium tracking-wide truncate max-w-full px-1 ${
                  isActive ? "text-amber-400" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
