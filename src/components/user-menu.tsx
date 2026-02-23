"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, Settings, LogOut, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserMenuProps {
  name: string;
  avatarUrl: string | null;
}

export function UserMenu({ name, avatarUrl }: UserMenuProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity cursor-pointer">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-7 w-7 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-amber-900/50 border border-amber-700/50 flex items-center justify-center text-xs font-medium text-amber-200">
              {name[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{name}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/collection")}>
          <BookOpen className="mr-2 h-4 w-4" />
          Collection
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/decks")}>
          <Crown className="mr-2 h-4 w-4" />
          Decks
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
