"use client";

import { useState } from "react";

const CARD_IMAGE_BASE = "https://d27a44hjr9gen3.cloudfront.net";

interface CardImageProps {
  slug: string;
  name: string;
  className?: string;
  width?: number;
  height?: number;
}

export function CardImage({
  slug,
  name,
  className = "",
  width = 300,
  height = 420,
}: CardImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={`bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm ${className}`}
        style={{ width: "100%", aspectRatio: `${width}/${height}` }}
      >
        {name}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${CARD_IMAGE_BASE}/cards/${slug}.png`}
      alt={name}
      width={width}
      height={height}
      className={`rounded-lg shadow-lg ${className}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
