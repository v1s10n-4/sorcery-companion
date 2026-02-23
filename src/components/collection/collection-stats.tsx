import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectionStatsProps {
  uniqueCards: number;
  totalCards: number;
  totalMarketValue: number;
  totalCostBasis: number;
}

export function CollectionStats({
  uniqueCards,
  totalCards,
  totalMarketValue,
  totalCostBasis,
}: CollectionStatsProps) {
  const roi =
    totalCostBasis > 0
      ? ((totalMarketValue - totalCostBasis) / totalCostBasis) * 100
      : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon={<Layers className="h-4 w-4" />}
        label="Cards"
        value={`${totalCards}`}
        sub={`${uniqueCards} unique`}
      />
      <StatCard
        icon={<DollarSign className="h-4 w-4" />}
        label="Market Value"
        value={`$${totalMarketValue.toFixed(2)}`}
      />
      <StatCard
        icon={<Package className="h-4 w-4" />}
        label="Cost Basis"
        value={totalCostBasis > 0 ? `$${totalCostBasis.toFixed(2)}` : "—"}
      />
      <StatCard
        icon={
          roi !== null && roi >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-400" />
          ) : roi !== null ? (
            <TrendingDown className="h-4 w-4 text-red-400" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )
        }
        label="ROI"
        value={roi !== null ? `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%` : "—"}
        valueClass={roi !== null ? (roi >= 0 ? "text-green-400" : "text-red-400") : ""}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={cn("text-lg font-bold tabular-nums", valueClass)}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
