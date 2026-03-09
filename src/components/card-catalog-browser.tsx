import { getAllCards, getAllSets } from "@/lib/data";
import { CardBrowser, type CardBrowserProps } from "@/components/card-browser";
import type { SetInfo } from "@/lib/types";

/**
 * Async server component that owns the catalog data fetch.
 * Accepts all CardBrowser props except `cards` and `sets` — those are
 * fetched internally via the cached data layer.
 *
 * Pair with `preloadCatalog()` in the parent page to avoid sequential
 * fetching on cold cache.
 */
type Props = Omit<CardBrowserProps, "cards" | "sets">;

export async function CardCatalogBrowser(props: Props) {
  const [cards, sets] = await Promise.all([getAllCards(), getAllSets()]);
  return <CardBrowser {...props} cards={cards} sets={sets as SetInfo[]} />;
}
