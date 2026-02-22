import Image from "next/image";

type IconSize = "xs" | "sm" | "md" | "lg";

const SIZES: Record<IconSize, number> = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
};

interface ElementIconProps {
  element: string;
  size?: IconSize;
  className?: string;
}

export function ElementIcon({ element, size = "sm", className = "" }: ElementIconProps) {
  const px = SIZES[size];
  const name = element.toLowerCase();
  return (
    <Image
      src={`/icons/${name}.svg`}
      alt={element}
      width={px}
      height={px}
      className={`inline-block ${className}`}
    />
  );
}

interface StatIconProps {
  stat: "attack" | "defence";
  size?: IconSize;
  className?: string;
}

export function StatIcon({ stat, size = "sm", className = "" }: StatIconProps) {
  const px = SIZES[size];
  return (
    <Image
      src={`/icons/${stat}.svg`}
      alt={stat}
      width={px}
      height={px}
      className={`inline-block ${className}`}
    />
  );
}

// Element threshold display with icon + count
interface ThresholdProps {
  air?: number;
  earth?: number;
  fire?: number;
  water?: number;
  size?: IconSize;
}

export function Thresholds({ air = 0, earth = 0, fire = 0, water = 0, size = "sm" }: ThresholdProps) {
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
          {count > 1 && <span className="text-xs text-muted-foreground">{count}</span>}
        </span>
      ))}
    </div>
  );
}

// Element badge list
export function ElementBadges({ elements, size = "sm" }: { elements: string[]; size?: IconSize }) {
  if (elements.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {elements.map((el) => (
        <ElementIcon key={el} element={el} size={size} />
      ))}
    </div>
  );
}
