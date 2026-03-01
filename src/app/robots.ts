import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/collection/",
          "/decks/",
          "/settings/",
          "/scan/",
        ],
      },
    ],
    sitemap: "https://sorcery-companion.vercel.app/sitemap.xml",
  };
}
