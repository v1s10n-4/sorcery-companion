"use client";

/**
 * SVG card-shape viewfinder with a stability ring indicator.
 *
 * Props:
 *   phase — current scan phase to drive the ring animation
 *   progress — 0..1 stabilizing progress
 */

type Phase =
  | "idle"
  | "stabilizing"
  | "scanning"
  | "matched"
  | "uncertain"
  | "no-detection"
  | "error"
  | "permission-denied";

interface CardGuideOverlayProps {
  phase: Phase;
  progress?: number; // 0..1, used during "stabilizing"
}

// Card aspect ratio: 63mm × 88mm = ~0.716
// Fill ~88% of viewport width so users are encouraged to fill the frame
export const SVG_W = 390;
export const SVG_H = 844; // taller viewport (modern phone aspect ~9:19.5)
export const CARD_W = Math.round(SVG_W * 0.88); // ~343
export const CARD_H = Math.round(CARD_W / 0.716); // ~479

const cx = SVG_W / 2;
const cy = SVG_H / 2;
const cardX = cx - CARD_W / 2;
const cardY = cy - CARD_H / 2;
const R = 8; // corner radius

// Ring params (drawn just outside the card frame)
const RING_PAD = 6;
const ringX = cardX - RING_PAD;
const ringY = cardY - RING_PAD;
const ringW = CARD_W + RING_PAD * 2;
const ringH = CARD_H + RING_PAD * 2;
// Approximate perimeter of the rounded rect for stroke-dasharray
const ringPerim = 2 * (ringW + ringH) - (8 - 2 * Math.PI) * (R + RING_PAD);

const phaseColors: Record<string, string> = {
  idle: "rgba(255,255,255,0.35)",
  stabilizing: "#f59e0b",          // amber-400
  scanning: "#60a5fa",             // blue-400
  matched: "#4ade80",              // green-400
  uncertain: "#fbbf24",            // amber-300 — softer than stabilizing
  "no-detection": "rgba(255,255,255,0.25)", // very muted — don't alarm
  error: "#f87171",                // red-400
  "permission-denied": "#f87171",
};

export function CardGuideOverlay({ phase, progress = 0 }: CardGuideOverlayProps) {
  const color = phaseColors[phase] ?? phaseColors.idle;

  // Dash offset animates the ring fill during stabilizing
  const dashOffset =
    phase === "stabilizing"
      ? ringPerim * (1 - progress)
      : phase === "scanning" || phase === "matched" || phase === "uncertain"
      ? 0
      : ringPerim;

  const ringOpacity =
    phase === "idle"
      ? 0
      : phase === "no-detection"
      ? 0.35
      : phase === "error" || phase === "permission-denied"
      ? 0.6
      : 1;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dark scrim with card-shaped cutout */}
      <defs>
        <mask id="card-cutout">
          <rect width={SVG_W} height={SVG_H} fill="white" />
          <rect
            x={cardX}
            y={cardY}
            width={CARD_W}
            height={CARD_H}
            rx={R}
            ry={R}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        width={SVG_W}
        height={SVG_H}
        fill="rgba(0,0,0,0.55)"
        mask="url(#card-cutout)"
      />

      {/* Card outline */}
      <rect
        x={cardX}
        y={cardY}
        width={CARD_W}
        height={CARD_H}
        rx={R}
        ry={R}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        opacity={0.7}
      />

      {/* Stability / progress ring */}
      <rect
        x={ringX}
        y={ringY}
        width={ringW}
        height={ringH}
        rx={R + RING_PAD}
        ry={R + RING_PAD}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeDasharray={ringPerim}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        opacity={ringOpacity}
        style={{
          transition:
            phase === "stabilizing"
              ? "stroke-dashoffset 0.1s linear"
              : "stroke-dashoffset 0.2s ease, opacity 0.2s ease",
          transformOrigin: "center",
        }}
      />

      {/* Corner accent marks (idle state) */}
      {phase === "idle" && (
        <g stroke="rgba(255,255,255,0.6)" strokeWidth={2} fill="none">
          {/* TL */}
          <path d={`M${cardX + 20},${cardY} H${cardX + R} Q${cardX},${cardY} ${cardX},${cardY + R} V${cardY + 20}`} />
          {/* TR */}
          <path d={`M${cardX + CARD_W - 20},${cardY} H${cardX + CARD_W - R} Q${cardX + CARD_W},${cardY} ${cardX + CARD_W},${cardY + R} V${cardY + 20}`} />
          {/* BL */}
          <path d={`M${cardX + 20},${cardY + CARD_H} H${cardX + R} Q${cardX},${cardY + CARD_H} ${cardX},${cardY + CARD_H - R} V${cardY + CARD_H - 20}`} />
          {/* BR */}
          <path d={`M${cardX + CARD_W - 20},${cardY + CARD_H} H${cardX + CARD_W - R} Q${cardX + CARD_W},${cardY + CARD_H} ${cardX + CARD_W},${cardY + CARD_H - R} V${cardY + CARD_H - 20}`} />
        </g>
      )}
    </svg>
  );
}
