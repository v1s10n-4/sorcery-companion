"use client";

import { ExternalLink } from "lucide-react";
import { PriceChart } from "@/components/price-chart";
import type { VariantPrice } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  prices: VariantPrice[];
  className?: string;
}

export function PriceDisplay({ prices, className }: PriceDisplayProps) {
  if (prices.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Market Prices
      </h2>
      {prices.map((p) => (
        <div
          key={p.tcgplayerProductId}
          className="rounded-lg border border-border/50 bg-card p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {p.printing}
            </span>
            <a
              href={p.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
            >
              Buy on TCGplayer
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <PricePill label="Market" value={p.marketPrice} primary />
            <PricePill label="Low" value={p.lowPrice} />
            <PricePill label="Median" value={p.medianPrice} />
          </div>

          {/* Chart */}
          {p.history.length >= 2 && (
            <PriceChart history={p.history} />
          )}

          {p.history.length < 2 && p.marketPrice != null && (
            <p className="text-[10px] text-muted-foreground/50 text-center mt-1">
              Price history will appear after more data is collected
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function PricePill({
  label,
  value,
  primary,
}: {
  label: string;
  value: number | null;
  primary?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground/70">{label}</p>
      <p
        className={cn(
          "text-sm tabular-nums font-medium",
          primary ? "text-amber-200" : "text-muted-foreground"
        )}
      >
        {value != null ? `$${value.toFixed(2)}` : "—"}
      </p>
    </div>
  );
}
