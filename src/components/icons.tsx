import {
  Flame,
  Droplets,
  Mountain,
  Wind,
  Swords,
  Shield,
  Heart,
  Sparkles,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Element Icons (Lucide placeholders — swap for official SVGs later) ──

type IconSize = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
};

const ELEMENT_CONFIG: Record<
  string,
  { icon: React.FC<LucideProps>; className: string }
> = {
  Fire: { icon: Flame, className: "text-orange-400" },
  Water: { icon: Droplets, className: "text-blue-400" },
  Earth: { icon: Mountain, className: "text-emerald-400" },
  Air: { icon: Wind, className: "text-sky-300" },
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
  return (
    <Icon
      width={px}
      height={px}
      className={cn(config.className, className)}
      strokeWidth={2.5}
    />
  );
}

// ── Stat Icons ──

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
    { element: "Air", count: air },
    { element: "Earth", count: earth },
    { element: "Fire", count: fire },
    { element: "Water", count: water },
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
