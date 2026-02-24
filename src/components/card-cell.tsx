"use client";

import { useRef, useCallback, memo } from "react";
import Link from "next/link";
import { useSelectionStore } from "@/stores/selection-store";
import { CardImage } from "@/components/card-image";
import { cn } from "@/lib/utils";
import type { BrowserCard } from "@/lib/types";

const LONG_PRESS_MS = 400;
const MOVE_THRESHOLD = 8; // px — cancel long-press if pointer moves more than this

interface OverlayData {
  qty: number;
  market: number;
  cost: number;
}

interface CardCellProps {
  card: BrowserCard;
  overlayData?: OverlayData | null;
  hasOverlay: boolean;
}

export const CardCell = memo(function CardCell({
  card,
  overlayData,
  hasOverlay,
}: CardCellProps) {
  const active = useSelectionStore((s) => s.active);
  const selectedQty = useSelectionStore((s) => s.items.get(card.id) ?? 0);
  const add = useSelectionStore((s) => s.add);
  const remove = useSelectionStore((s) => s.remove);

  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressTriggered = useRef(false);
  const pointerStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      pointerStart.current = { x: e.clientX, y: e.clientY };
      longPressTriggered.current = false;
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        // Haptic feedback
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50);
        }
        add(card.id);
      }, LONG_PRESS_MS);
    },
    [add, card.id]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!longPressTimer.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = undefined;
  }, []);

  const handleSelectClick = useCallback(
    (e: React.MouseEvent) => {
      if (!active) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (y < rect.height / 2) {
        add(card.id);
      } else {
        remove(card.id);
      }
    },
    [active, add, remove, card.id]
  );

  const handleQuickSelect = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      add(card.id);
    },
    [add, card.id]
  );

  // Price calculations
  const priceDiff =
    card.marketPrice != null &&
    card.previousPrice != null &&
    card.previousPrice > 0
      ? ((card.marketPrice - card.previousPrice) / card.previousPrice) * 100
      : null;
  const perfPct =
    overlayData && overlayData.cost > 0
      ? ((overlayData.market - overlayData.cost) / overlayData.cost) * 100
      : null;
  const perfAbs =
    overlayData && overlayData.cost > 0
      ? overlayData.market - overlayData.cost
      : null;

  const imageContent = (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/30",
        selectedQty > 0 && "ring-2 ring-amber-500"
      )}
    >
      {card.variantSlug ? (
        <CardImage
          slug={card.variantSlug}
          name={card.name}
          width={260}
          height={364}
          blurDataUrl={card.blurDataUrl}
          className={cn(
            "w-full h-auto",
            !active && "transition-transform duration-200 group-hover:scale-105",
            hasOverlay && !overlayData && "opacity-40"
          )}
        />
      ) : (
        <div className="aspect-[5/7] flex items-center justify-center text-xs text-muted-foreground">
          No image
        </div>
      )}

      {/* Top/bottom half indicators (select mode only, desktop) */}
      {active && (
        <div className="absolute inset-0 flex flex-col pointer-events-none">
          <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-green-500/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
              +1
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-red-500/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
              −1
            </span>
          </div>
        </div>
      )}

      {/* Collection overlay badges */}
      {overlayData && (
        <>
          <div className="absolute bottom-1.5 left-1.5 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[20px] text-center">
            {overlayData.qty}
          </div>
          {overlayData.market > 0 && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/75 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
              ${overlayData.market.toFixed(2)}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div
      className={cn("group relative", active && "select-none")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Desktop hover checkbox (only when NOT in select mode) */}
      {!active && (
        <button
          onClick={handleQuickSelect}
          className="absolute top-1.5 left-1.5 z-10 h-5 w-5 rounded border-2 border-white/40 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        >
          <svg
            className="h-3 w-3 text-white"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 3v6M3 6h6" />
          </svg>
        </button>
      )}

      {/* Selection quantity badge */}
      {selectedQty > 0 && (
        <div className="absolute top-1.5 left-1.5 z-10 bg-amber-500 text-black text-[11px] font-bold h-6 min-w-[24px] px-1 rounded flex items-center justify-center">
          {selectedQty}
        </div>
      )}

      {/* Card image — in select mode, click is intercepted */}
      {active ? (
        <div onClick={handleSelectClick} className="cursor-pointer">
          {imageContent}
        </div>
      ) : (
        <Link href={`/cards/${card.id}`} prefetch={false}>
          {imageContent}
        </Link>
      )}

      {/* Info below image */}
      <div className="mt-1 px-0.5 flex items-center justify-between gap-1">
        <p className="text-[11px] truncate text-muted-foreground group-hover:text-foreground transition-colors flex-1 min-w-0">
          {card.name}
        </p>
        {hasOverlay && overlayData && perfPct !== null ? (
          <span
            className={cn(
              "text-[10px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-0.5",
              perfPct >= 0 ? "text-green-400" : "text-red-400"
            )}
          >
            {perfPct >= 0 ? "+" : ""}
            {perfAbs!.toFixed(2)}
            <span className="text-[9px] opacity-75">
              ({perfPct >= 0 ? "+" : ""}
              {perfPct.toFixed(0)}%)
            </span>
          </span>
        ) : card.marketPrice != null ? (
          <span className="text-[10px] whitespace-nowrap shrink-0 flex items-center gap-1">
            <span className="text-amber-300">
              ${card.marketPrice.toFixed(2)}
            </span>
            {priceDiff !== null && priceDiff !== 0 ? (
              <span
                className={cn(
                  "font-semibold",
                  priceDiff > 0 ? "text-green-400" : "text-red-400"
                )}
              >
                {priceDiff > 0 ? "+" : ""}
                {priceDiff.toFixed(1)}%
              </span>
            ) : (
              <span className="text-muted-foreground/50">0%</span>
            )}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40 whitespace-nowrap shrink-0">
            N/A
          </span>
        )}
      </div>
    </div>
  );
});
