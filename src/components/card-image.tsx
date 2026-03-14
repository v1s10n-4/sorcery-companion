"use client";

import Image from "next/image";
import { useState } from "react";

const CARD_IMAGE_BASE = "https://pub-fbad7d695b084411b42bdff03adbffd5.r2.dev";

const DEFAULT_SIZES =
  "(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 17vw, 14vw";

interface CardImageProps {
  slug: string;
  name: string;
  className?: string;
  width?: number;
  height?: number;
  blurDataUrl?: string | null;
  sizes?: string;
  priority?: boolean;
}

export function CardImage({
  slug,
  name,
  className = "",
  width = 300,
  height = 420,
  blurDataUrl,
  sizes = DEFAULT_SIZES,
  priority = false,
}: CardImageProps) {
  const [error, setError] = useState(false);
  const src = `${CARD_IMAGE_BASE}/cards/${slug}.png`;

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
    <Image
      src={src}
      alt={name}
      width={width}
      height={height}
      className={`rounded-lg shadow-lg ${className}`}
      sizes={sizes}
      priority={priority}
      onError={() => setError(true)}
      {...(blurDataUrl
        ? { placeholder: "blur", blurDataURL: blurDataUrl }
        : {})}
    />
  );
}
