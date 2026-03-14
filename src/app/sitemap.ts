import type { MetadataRoute } from "next";
import { getAllCardIds, getAllSetSlugs } from "@/lib/data";

const BASE_URL = "https://sorcery-companion.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cards, sets] = await Promise.all([getAllCardIds(), getAllSetSlugs()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/sets`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const setRoutes: MetadataRoute.Sitemap = sets.map((set) => ({
    url: `${BASE_URL}/sets/${set.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const cardRoutes: MetadataRoute.Sitemap = cards.map((card) => ({
    url: `${BASE_URL}/cards/${card.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...setRoutes, ...cardRoutes];
}
