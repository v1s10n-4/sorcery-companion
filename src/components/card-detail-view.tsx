"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CardImage } from "@/components/card-image";
import { PriceDisplay } from "@/components/price-display";
import { AddToCollectionButton } from "@/components/add-to-collection-button";
import { ElementBadges, StatIcon, Thresholds } from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Paintbrush, Check } from "lucide-react";
import { RARITY_COLORS } from "@/lib/types";
import type { CardDetail, Printing, DetailVariant } from "@/lib/types";
import { cn } from "@/lib/utils";

// Tooltip descriptions
const RARITY_DESCRIPTIONS: Record<string, string> = {
  Ordinary: "Common card — up to 4 copies per deck",
  Exceptional: "Uncommon card — up to 4 copies per deck",
  Elite: "Rare card — up to 2 copies per deck",
  Unique: "Legendary card — 1 copy per deck",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  Avatar: "Your hero — determines starting life and special ability",
  Site: "Placed in the Atlas (20-card grid) — generates mana and holds minions",
  Minion: "Creatures that fight for you in the Spellbook",
  Magic: "One-time spell effects in the Spellbook",
  Artifact: "Persistent items that provide ongoing effects in the Spellbook",
  Aura: "Enchantments that modify sites or minions in the Spellbook",
};

const STAT_DESCRIPTIONS: Record<string, string> = {
  cost: "Mana cost to play this card",
  attack: "Damage dealt in combat",
  defence: "Damage absorbed before destruction",
  life: "Starting life points (Avatar only)",
};

interface VariantWithPrinting extends DetailVariant {
  printing: Printing;
}

export function CardDetailView({ card, isLoggedIn = false }: { card: CardDetail; isLoggedIn?: boolean }) {
  const allVariants = useMemo(
    () =>
      card.printings.flatMap((p) =>
        p.variants.map((v) => ({ ...v, printing: p }))
      ),
    [card.printings]
  );

  // Default to Standard/non-foil variant
  const defaultVariant = useMemo(
    () =>
      allVariants.find((v) => v.finish === "Standard") ?? allVariants[0],
    [allVariants]
  );

  const [selectedId, setSelectedId] = useState(defaultVariant?.id ?? null);

  const selected: VariantWithPrinting | undefined = useMemo(
    () => allVariants.find((v) => v.id === selectedId) ?? allVariants[0],
    [allVariants, selectedId]
  );

  if (!selected) return null;

  const printing = selected.printing;

  // Printing-specific overrides → card defaults
  const rulesText = printing.rulesText ?? card.rulesText;
  const rarity = printing.rarity ?? card.rarity;
  const cost = printing.cost ?? card.cost;
  const attack = printing.attack ?? card.attack;
  const defence = printing.defence ?? card.defence;
  const life = printing.life ?? card.life;
  const thresholdAir = printing.thresholdAir ?? card.thresholdAir;
  const thresholdEarth = printing.thresholdEarth ?? card.thresholdEarth;
  const thresholdFire = printing.thresholdFire ?? card.thresholdFire;
  const thresholdWater = printing.thresholdWater ?? card.thresholdWater;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
      {/* ── Left: Image + Actions ── */}
      <div className="space-y-4">
        <CardImage
          key={selected.slug}
          slug={selected.slug}
          name={card.name}
          width={300}
          height={420}
          blurDataUrl={selected.blurDataUrl}
        />

        {/* Variant info */}
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground text-sm">
            {printing.setName}
            {printing.releasedAt && (
              <span className="text-muted-foreground ml-2 font-normal">
                {new Date(printing.releasedAt).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[10px]">
                  {selected.finish}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Card finish variant</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[10px]">
                  {selected.product.replace(/_/g, " ")}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Product type (e.g. booster, precon)</TooltipContent>
            </Tooltip>
          </div>
          {selected.artist && (
            <p className="flex items-center gap-1">
              <Paintbrush className="h-3 w-3" />
              {selected.artist}
            </p>
          )}
          {selected.flavorText && (
            <p className="italic text-muted-foreground/80">
              &quot;{selected.flavorText}&quot;
            </p>
          )}
        </div>

        {/* Prices */}
        {selected.prices.length > 0 && (
          <PriceDisplay prices={selected.prices} />
        )}

        {/* Add to collection */}
        <AddToCollectionButton
          variantId={selected.id}
          isLoggedIn={isLoggedIn}
          marketPrice={selected.prices[0]?.marketPrice}
        />
      </div>

      {/* ── Right: Details ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-serif text-amber-100 mb-2">
          {card.name}
        </h1>

        <div className="flex flex-wrap gap-2 mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary">{printing.type ?? card.type}</Badge>
            </TooltipTrigger>
            <TooltipContent>
              {TYPE_DESCRIPTIONS[printing.type ?? card.type] ?? "Card type"}
            </TooltipContent>
          </Tooltip>
          {rarity && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={RARITY_COLORS[rarity] || ""}
                >
                  {rarity}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {RARITY_DESCRIPTIONS[rarity] ?? rarity}
              </TooltipContent>
            </Tooltip>
          )}
          {card.subTypes.map((st) => (
            <Tooltip key={st}>
              <TooltipTrigger asChild>
                <Badge variant="outline">{st}</Badge>
              </TooltipTrigger>
              <TooltipContent>Subtype</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {card.elements.length > 0 && (
          <div className="mb-4">
            <ElementBadges elements={card.elements} size="md" />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {cost !== null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 bg-card rounded-lg p-3 border border-border/50">
                  <StatIcon stat="cost" size="md" />
                  <span className="font-bold text-amber-200 ml-auto text-lg">
                    {cost}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{STAT_DESCRIPTIONS.cost}</TooltipContent>
            </Tooltip>
          )}
          {attack !== null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 bg-card rounded-lg p-3 border border-border/50">
                  <StatIcon stat="attack" size="md" />
                  <span className="font-bold ml-auto text-lg">{attack}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{STAT_DESCRIPTIONS.attack}</TooltipContent>
            </Tooltip>
          )}
          {defence !== null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 bg-card rounded-lg p-3 border border-border/50">
                  <StatIcon stat="defence" size="md" />
                  <span className="font-bold ml-auto text-lg">{defence}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{STAT_DESCRIPTIONS.defence}</TooltipContent>
            </Tooltip>
          )}
          {life !== null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 bg-card rounded-lg p-3 border border-border/50">
                  <StatIcon stat="life" size="md" />
                  <span className="font-bold text-rose-400 ml-auto text-lg">
                    {life}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{STAT_DESCRIPTIONS.life}</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="mb-6">
          <Thresholds
            air={thresholdAir}
            earth={thresholdEarth}
            fire={thresholdFire}
            water={thresholdWater}
            size="md"
          />
        </div>

        {card.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {card.keywords.map((kw) => (
              <Tooltip key={kw}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="border-amber-700/50 text-amber-300 text-xs"
                  >
                    {kw}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Keyword ability</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {rulesText && (
          <div className="mb-6 bg-card rounded-lg p-4 border border-border/50">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Rules
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {rulesText}
            </p>
          </div>
        )}

        {/* ── Printings selector ── */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Printings
          </h2>
          <div className="flex flex-col gap-3">
            {card.printings.map((p) => (
              <Card key={p.id} className="border-border/50">
                <CardContent className="py-3 px-4">
                  <p className="text-sm font-serif font-medium mb-2">
                    {p.setName}
                    {p.releasedAt && (
                      <span className="text-xs text-muted-foreground ml-2 font-sans font-normal">
                        {new Date(p.releasedAt).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {p.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedId(v.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg p-2 text-left transition-all cursor-pointer",
                          "border",
                          v.id === selectedId
                            ? "border-amber-500/70 bg-amber-950/30"
                            : "border-border/30 hover:border-border hover:bg-muted/30"
                        )}
                      >
                        <CardImage
                          slug={v.slug}
                          name={card.name}
                          width={40}
                          height={56}
                          blurDataUrl={v.blurDataUrl}
                          className="rounded-sm flex-shrink-0"
                        />
                        <div className="min-w-0 text-xs space-y-0.5">
                          <p className="font-medium truncate">
                            {v.finish}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {v.product.replace(/_/g, " ")}
                          </p>
                          {v.artist && (
                            <p className="text-muted-foreground/70 truncate flex items-center gap-1">
                              <Paintbrush className="h-2.5 w-2.5 flex-shrink-0" />
                              {v.artist}
                            </p>
                          )}
                        </div>
                        {v.id === selectedId && (
                          <Check className="h-4 w-4 text-amber-500 ml-auto flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
