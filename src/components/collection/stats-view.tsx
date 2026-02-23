"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CompletionData {
  uniqueCards: number;
  totalCards: number;
  uniqueVariants: number;
  totalVariants: number;
}

interface SetData {
  name: string;
  owned: number;
  total: number;
}

interface CollectionStatsViewProps {
  completion: CompletionData;
  byType: Record<string, number>;
  byElement: Record<string, number>;
  byRarity: Record<string, number>;
  byCost: Record<number, number>;
  bySet: SetData[];
}

const ELEMENT_COLORS: Record<string, string> = {
  Air: "bg-sky-500",
  Earth: "bg-amber-700",
  Fire: "bg-red-500",
  Water: "bg-blue-500",
};

const RARITY_COLORS: Record<string, string> = {
  Ordinary: "bg-zinc-500",
  Exceptional: "bg-emerald-600",
  Elite: "bg-purple-600",
  Unique: "bg-amber-500",
};

export function CollectionStatsView({
  completion,
  byType,
  byElement,
  byRarity,
  byCost,
  bySet,
}: CollectionStatsViewProps) {
  const cardPct = completion.totalCards > 0
    ? ((completion.uniqueCards / completion.totalCards) * 100).toFixed(1)
    : "0";

  return (
    <div>
      <h1 className="text-2xl font-bold font-serif text-amber-100 mb-6">
        Collection Stats
      </h1>

      {/* Completion */}
      <Card className="border-border/50 mb-6">
        <CardContent className="p-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Completion
          </h2>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-bold tabular-nums text-amber-200">
              {cardPct}%
            </span>
            <span className="text-sm text-muted-foreground pb-1">
              {completion.uniqueCards} / {completion.totalCards} unique cards
            </span>
          </div>
          <ProgressBar value={parseFloat(cardPct)} />
          <p className="text-xs text-muted-foreground mt-2">
            {completion.uniqueVariants} / {completion.totalVariants} total variants collected
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Mana Curve */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Mana Curve
            </h2>
            <ManaCurve data={byCost} />
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Card Types
            </h2>
            <BarList
              data={Object.entries(byType).sort((a, b) => b[1] - a[1])}
              color="bg-amber-600"
            />
          </CardContent>
        </Card>

        {/* Element Distribution */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Elements
            </h2>
            <BarList
              data={Object.entries(byElement).sort((a, b) => b[1] - a[1])}
              colorMap={ELEMENT_COLORS}
            />
          </CardContent>
        </Card>

        {/* Rarity Distribution */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Rarities
            </h2>
            <BarList
              data={Object.entries(byRarity).sort((a, b) => b[1] - a[1])}
              colorMap={RARITY_COLORS}
            />
          </CardContent>
        </Card>
      </div>

      {/* Set Completion */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Set Completion
          </h2>
          <div className="space-y-3">
            {bySet
              .sort((a, b) => b.owned / (b.total || 1) - a.owned / (a.total || 1))
              .map((s) => {
                const pct = s.total > 0 ? (s.owned / s.total) * 100 : 0;
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {s.owned}/{s.total} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <ProgressBar value={pct} />
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-amber-500 transition-all"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

function ManaCurve({ data }: { data: Record<number, number> }) {
  const maxCost = Math.max(...Object.keys(data).map(Number), 0);
  const entries = Array.from({ length: maxCost + 1 }, (_, i) => [i, data[i] ?? 0] as const);
  const maxCount = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="flex items-end gap-1 h-24">
      {entries.map(([cost, count]) => (
        <div key={cost} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
            <div
              className="w-full max-w-6 rounded-t bg-amber-600/80"
              style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? 4 : 0 }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground tabular-nums">{cost}</span>
        </div>
      ))}
    </div>
  );
}

function BarList({
  data,
  color,
  colorMap,
}: {
  data: [string, number][];
  color?: string;
  colorMap?: Record<string, string>;
}) {
  const max = Math.max(...data.map(([, v]) => v), 1);

  return (
    <div className="space-y-2">
      {data.map(([label, value]) => (
        <div key={label}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span>{label}</span>
            <span className="text-muted-foreground tabular-nums">{value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                colorMap?.[label] ?? color ?? "bg-amber-600"
              )}
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
