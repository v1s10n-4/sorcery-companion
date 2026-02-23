"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CardImage } from "@/components/card-image";
import { ElementBadges, StatIcon, Thresholds } from "@/components/icons";
import { Paintbrush, Check } from "lucide-react";
import { RARITY_COLORS } from "@/lib/types";
import type { CardDetail, Printing, DetailVariant } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VariantWithPrinting extends DetailVariant {
  printing: Printing;
}

export function CardDetailView({ card }: { card: CardDetail }) {
  const allVariants = useMemo(
    () =>
      card.printings.flatMap((p) =>
        p.variants.map((v) => ({ ...v, printing: p }))
      ),
    [card.printings]
  );

  const [selectedId, setSelectedId] = useState(allVariants[0]?.id ?? null);

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
      {/* ── Left: Image ── */}
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
            <Badge variant="outline" className="text-[10px]">
              {selected.finish}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {selected.product.replace(/_/g, " ")}
            </Badge>
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
      </div>

      {/* ── Right: Details ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-serif text-amber-100 mb-2">
          {card.name}
        </h1>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary">{printing.type ?? card.type}</Badge>
          {rarity && (
            <Badge
              variant="outline"
              className={RARITY_COLORS[rarity] || ""}
            >
              {rarity}
            </Badge>
          )}
          {card.subTypes.map((st) => (
            <Badge key={st} variant="outline">
              {st}
            </Badge>
          ))}
        </div>

        {card.elements.length > 0 && (
          <div className="mb-4">
            <ElementBadges elements={card.elements} size="md" />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {cost !== null && (
            <StatBlock>
              <StatIcon stat="cost" size="md" />
              <span className="font-bold text-amber-200 ml-auto text-lg">
                {cost}
              </span>
            </StatBlock>
          )}
          {attack !== null && (
            <StatBlock>
              <StatIcon stat="attack" size="md" />
              <span className="font-bold ml-auto text-lg">{attack}</span>
            </StatBlock>
          )}
          {defence !== null && (
            <StatBlock>
              <StatIcon stat="defence" size="md" />
              <span className="font-bold ml-auto text-lg">{defence}</span>
            </StatBlock>
          )}
          {life !== null && (
            <StatBlock>
              <StatIcon stat="life" size="md" />
              <span className="font-bold text-rose-400 ml-auto text-lg">
                {life}
              </span>
            </StatBlock>
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
              <Badge
                key={kw}
                variant="outline"
                className="border-amber-700/50 text-amber-300 text-xs"
              >
                {kw}
              </Badge>
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

function StatBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 bg-card rounded-lg p-3 border border-border/50">
      {children}
    </div>
  );
}
