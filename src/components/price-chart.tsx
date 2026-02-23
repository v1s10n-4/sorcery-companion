"use client";

import { useMemo } from "react";

interface PriceChartProps {
  history: { date: string; price: number }[];
  className?: string;
}

/**
 * Minimal SVG sparkline chart for price history.
 * No dependencies — just an SVG path.
 */
export function PriceChart({ history, className }: PriceChartProps) {
  const { path, minPrice, maxPrice, lastPrice, change } = useMemo(() => {
    if (history.length < 2)
      return { path: "", minPrice: 0, maxPrice: 0, lastPrice: 0, change: 0 };

    const sorted = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const prices = sorted.map((h) => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const W = 200;
    const H = 48;
    const PAD = 2;

    const points = sorted.map((_, i) => {
      const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
      const y = PAD + (1 - (prices[i] - min) / range) * (H - PAD * 2);
      return { x, y };
    });

    const d = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    const first = prices[0];
    const last = prices[prices.length - 1];
    const pctChange = first > 0 ? ((last - first) / first) * 100 : 0;

    return {
      path: d,
      minPrice: min,
      maxPrice: max,
      lastPrice: last,
      change: pctChange,
    };
  }, [history]);

  if (history.length < 2) return null;

  const isUp = change >= 0;

  return (
    <div className={className}>
      <svg
        viewBox="0 0 200 48"
        className="w-full h-12"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={isUp ? "rgb(34 197 94)" : "rgb(239 68 68)"}
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor={isUp ? "rgb(34 197 94)" : "rgb(239 68 68)"}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {/* Fill area */}
        <path
          d={`${path} L 198 46 L 2 46 Z`}
          fill="url(#priceGrad)"
        />
        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={isUp ? "rgb(34 197 94)" : "rgb(239 68 68)"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
        <span>${minPrice.toFixed(2)}</span>
        <span
          className={isUp ? "text-green-400" : "text-red-400"}
        >
          {isUp ? "+" : ""}
          {change.toFixed(1)}%
        </span>
        <span>${maxPrice.toFixed(2)}</span>
      </div>
    </div>
  );
}
