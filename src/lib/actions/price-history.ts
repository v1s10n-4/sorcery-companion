"use server";

import { getPriceHistory } from "@/lib/data";

export async function fetchPriceHistory(
  tcgplayerProductId: number
): Promise<{ date: string; price: number }[]> {
  const snapshots = await getPriceHistory(tcgplayerProductId);
  const byDate = new Map<string, number>();
  for (const snap of [...snapshots].reverse()) {
    if (snap.marketPrice != null) {
      const date = String(snap.recordedAt).slice(0, 10);
      byDate.set(date, snap.marketPrice);
    }
  }
  return Array.from(byDate, ([date, price]) => ({ date, price }));
}
