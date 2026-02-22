"use client";

import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface FilterBarProps {
  types: string[];
  elements: string[];
  rarities: string[];
  currentType?: string;
  currentElement?: string;
  currentRarity?: string;
}

export function FilterBar({
  types,
  elements,
  rarities,
  currentType,
  currentElement,
  currentRarity,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const toggleFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get(key) === value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-1">Type:</span>
        {types.map((type) => (
          <Badge
            key={type}
            variant={currentType === type ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleFilter("type", type)}
          >
            {type}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-1">Element:</span>
        {elements.map((element) => (
          <Badge
            key={element}
            variant={currentElement === element ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleFilter("element", element)}
          >
            {element}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-1">Rarity:</span>
        {rarities.map((rarity) => (
          <Badge
            key={rarity}
            variant={currentRarity === rarity ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleFilter("rarity", rarity)}
          >
            {rarity}
          </Badge>
        ))}
      </div>
    </div>
  );
}
