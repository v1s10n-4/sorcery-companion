"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Search,
  Layers,
  BookOpen,
  Swords,
  Camera,
  Settings,
  LogOut,
  LogIn,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MobileNavProps {
  isLoggedIn: boolean;
  userName: string;
  avatarUrl: string | null;
}

export function MobileNav({ isLoggedIn, userName, avatarUrl }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  const navItems = [
    { href: "/", label: "Cards", icon: Search },
    { href: "/sets", label: "Sets", icon: Layers },
    ...(isLoggedIn
      ? [
          { href: "/collection", label: "Collection", icon: BookOpen },
          { href: "/decks", label: "Decks", icon: Swords },
          { href: "/scan", label: "Scan Cards", icon: Camera },
          { href: "/settings", label: "Settings", icon: Settings },
        ]
      : []),
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64 px-5">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-serif text-amber-100">Menu</SheetTitle>
        </SheetHeader>

        {isLoggedIn && (
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border/50">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="h-8 w-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-amber-900/50 border border-amber-700/50 flex items-center justify-center text-sm font-medium text-amber-200">
                {userName[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium truncate">{userName}</span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}

          {isLoggedIn ? (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors mt-2 border-t border-border/50 pt-4 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-amber-400 hover:text-amber-300 font-medium mt-2 border-t border-border/50 pt-4"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
