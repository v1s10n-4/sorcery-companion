import { Swords, Shield, Heart, Sparkles } from "lucide-react";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Element Icons (official Sorcery: Contested Realm alchemical symbols) ──

type IconSize = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
};

interface SvgIconProps {
  size: number;
  className?: string;
}

function FireIcon({ size, className }: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={0.65}
        d="M43.6,43.62H4.4c-.97,0-1.89-.52-2.39-1.36-.5-.84-.53-1.9-.06-2.77L21.86,3.82c.49-.89,1.42-1.44,2.43-1.44h0c1.03,0,1.96.57,2.45,1.47l19.3,35.65c.47.88.44,1.94-.06,2.78-.5.83-1.41,1.35-2.38,1.35ZM8.27,38.57h31.53l-15.53-28.68-16,28.68Z"
      />
    </svg>
  );
}

function WaterIcon({ size, className }: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={0.65}
        d="M4.4,4.38h39.19c.97,0,1.89.52,2.39,1.36.5.84.53,1.9.06,2.77l-19.9,35.68c-.49.89-1.42,1.44-2.43,1.44h0c-1.03,0-1.96-.57-2.45-1.47L1.96,8.5c-.47-.88-.44-1.94.06-2.78.5-.83,1.41-1.35,2.38-1.35ZM39.73,9.43H8.21l15.53,28.68,16-28.68Z"
      />
    </svg>
  );
}

function AirIcon({ size, className }: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={0.65}
        d="M46.04,39.5l-4.32-7.99h3.77c.39.01.7-.3.7-.69v-3.66c0-.39-.3-.7-.69-.7l-6.52-.02L26.75,3.85c-.49-.91-1.42-1.47-2.45-1.47h0c-1.01,0-1.94.55-2.43,1.44l-12.58,22.55-6.62-.02c-.39,0-.7.31-.7.7v3.66c-.01.39.3.7.69.7h3.82s-4.51,8.09-4.51,8.09c-.47.86-.44,1.92.06,2.77.5.84,1.41,1.36,2.39,1.36h39.19c.97,0,1.88-.52,2.38-1.35.5-.84.53-1.9.06-2.78ZM24.26,9.88l8.96,16.55-18.16-.05,9.2-16.5ZM8.27,38.57l3.98-7.14,23.72.06,3.83,7.07H8.27Z"
      />
    </svg>
  );
}

function EarthIcon({ size, className }: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={0.65}
        d="M1.96,8.5l4.32,7.99h-3.77c-.39-.01-.7.3-.7.69v3.66c0,.39.3.7.69.7l6.52.02,12.23,22.59c.49.91,1.42,1.47,2.45,1.47h0c1.01,0,1.94-.55,2.43-1.44l12.58-22.55,6.62.02c.39,0,.7-.31.7-.7v-3.66c.01-.39-.3-.7-.69-.7h-3.82s4.51-8.09,4.51-8.09c.47-.86.44-1.92-.06-2.77-.5-.84-1.41-1.36-2.39-1.36H4.4c-.97,0-1.88.52-2.38,1.35-.5.84-.53,1.9-.06,2.78ZM23.74,38.12l-8.96-16.55,18.16.05-9.2,16.5ZM39.73,9.43l-3.98,7.14-23.72-.06-3.83-7.07h31.53Z"
      />
    </svg>
  );
}

const ELEMENT_CONFIG: Record<
  string,
  { icon: React.FC<SvgIconProps>; className: string }
> = {
  Fire: { icon: FireIcon, className: "text-[#f15d24]" },
  Water: { icon: WaterIcon, className: "text-[#64bfdd]" },
  Earth: { icon: EarthIcon, className: "text-[#aa9f7d]" },
  Air: { icon: AirIcon, className: "text-[#a9b4d8]" },
};

interface ElementIconProps {
  element: string;
  size?: IconSize;
  className?: string;
}

export function ElementIcon({
  element,
  size = "sm",
  className,
}: ElementIconProps) {
  const config = ELEMENT_CONFIG[element];
  if (!config) return null;
  const Icon = config.icon;
  const px = SIZE_MAP[size];
  return <Icon size={px} className={cn(config.className, className)} />;
}

// ── Stat Icons (Lucide) ──

interface StatIconProps {
  stat: "attack" | "defence" | "life" | "cost";
  size?: IconSize;
  className?: string;
}

const STAT_CONFIG: Record<
  string,
  { icon: React.FC<LucideProps>; className: string }
> = {
  attack: { icon: Swords, className: "text-red-400" },
  defence: { icon: Shield, className: "text-blue-300" },
  life: { icon: Heart, className: "text-rose-400" },
  cost: { icon: Sparkles, className: "text-amber-300" },
};

export function StatIcon({ stat, size = "sm", className }: StatIconProps) {
  const config = STAT_CONFIG[stat];
  if (!config) return null;
  const Icon = config.icon;
  const px = SIZE_MAP[size];
  return (
    <Icon
      width={px}
      height={px}
      className={cn(config.className, className)}
      strokeWidth={2.5}
    />
  );
}

// ── Element threshold display ──

interface ThresholdProps {
  air?: number;
  earth?: number;
  fire?: number;
  water?: number;
  size?: IconSize;
}

export function Thresholds({
  air = 0,
  earth = 0,
  fire = 0,
  water = 0,
  size = "sm",
}: ThresholdProps) {
  const thresholds = [
    { element: "Fire", count: fire },
    { element: "Water", count: water },
    { element: "Earth", count: earth },
    { element: "Air", count: air },
  ].filter((t) => t.count > 0);

  if (thresholds.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {thresholds.map(({ element, count }) => (
        <span key={element} className="flex items-center gap-0.5">
          <ElementIcon element={element} size={size} />
          {count > 1 && (
            <span className="text-xs text-muted-foreground">{count}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ── Element badge list ──

export function ElementBadges({
  elements,
  size = "sm",
}: {
  elements: string[];
  size?: IconSize;
}) {
  if (elements.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {elements.map((el) => (
        <ElementIcon key={el} element={el} size={size} />
      ))}
    </div>
  );
}
