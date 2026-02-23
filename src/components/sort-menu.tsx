"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Check } from "lucide-react";
import { type SortKey, SORT_OPTIONS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SortMenuProps {
  sort: SortKey;
  onSort: (key: SortKey) => void;
}

export function SortMenu({ sort, onSort }: SortMenuProps) {
  const current = SORT_OPTIONS.find((o) => o.value === sort);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
          <ArrowUpDown className="h-4 w-4" />
          <span className="hidden sm:inline">{current?.label ?? "Sort"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {SORT_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onSort(opt.value)}
            className={cn(
              "flex items-center justify-between",
              sort === opt.value && "font-medium"
            )}
          >
            {opt.label}
            {sort === opt.value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
