"use client";

import { useEffect, useRef } from "react";
import { Check, Undo2 } from "lucide-react";
import { CardImage } from "@/components/card-image";

interface CardResultToastProps {
  name: string;
  slug: string | null;
  setName?: string;
  /** Auto-dismiss after this many ms. Default: 3000 */
  durationMs?: number;
  onDismiss: () => void;
  onUndo: () => void;
}

export function CardResultToast({
  name,
  slug,
  setName,
  durationMs = 3000,
  onDismiss,
  onUndo,
}: CardResultToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, durationMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDismiss, durationMs]);

  const handleUndo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onUndo();
  };

  return (
    <div
      className="animate-in slide-in-from-top-2 fade-in duration-200 flex items-center gap-3 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl px-3 py-2.5 max-w-[280px]"
      role="status"
      aria-live="polite"
    >
      {/* Card thumbnail */}
      {slug ? (
        <CardImage
          slug={slug}
          name={name}
          width={32}
          height={45}
          className="rounded-sm shrink-0"
        />
      ) : (
        <div className="w-8 h-[45px] rounded-sm bg-muted/40 shrink-0 flex items-center justify-center">
          <Check className="h-3 w-3 text-green-400" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-green-400 flex items-center gap-1">
          <Check className="h-3 w-3 shrink-0" />
          Added
        </p>
        <p className="text-sm font-semibold truncate leading-tight">{name}</p>
        {setName && (
          <p className="text-[10px] text-muted-foreground truncate">{setName}</p>
        )}
      </div>

      {/* Undo */}
      <button
        onClick={handleUndo}
        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs transition-colors cursor-pointer min-h-[36px] min-w-[44px] justify-center"
        aria-label="Undo"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
