"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── CSV Export ──

export async function exportCollectionCsv() {
  const user = await requireUser();

  const collection = await prisma.collection.findFirst({
    where: { userId: user.id },
    include: {
      cards: {
        include: {
          card: true,
          variant: {
            include: {
              set: { include: { set: true } },
            },
          },
        },
      },
    },
  });

  if (!collection) return { csv: "", filename: "collection.csv" };

  const header = "Card Name,Set,Finish,Product,Quantity,Condition,Purchase Price";
  const rows = collection.cards.map((cc) => {
    const fields = [
      `"${cc.card.name.replace(/"/g, '""')}"`,
      `"${cc.variant.set.set.name}"`,
      cc.variant.finish,
      cc.variant.product,
      cc.quantity,
      cc.condition,
      cc.purchasePrice ?? "",
    ];
    return fields.join(",");
  });

  return {
    csv: [header, ...rows].join("\n"),
    filename: `sorcery-collection-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

// ── Decklist Export ──

export async function exportCollectionDecklist() {
  const user = await requireUser();

  const collection = await prisma.collection.findFirst({
    where: { userId: user.id },
    include: {
      cards: {
        include: {
          card: true,
          variant: {
            include: { set: { include: { set: true } } },
          },
        },
      },
    },
  });

  if (!collection) return { text: "", filename: "decklist.txt" };

  const lines = collection.cards.map(
    (cc) => `${cc.quantity}x ${cc.card.name} (${cc.variant.set.set.name})`
  );

  return {
    text: lines.join("\n"),
    filename: `sorcery-collection-${new Date().toISOString().slice(0, 10)}.txt`,
  };
}

// ── CSV Import ──

interface ImportPreviewRow {
  cardName: string;
  setName: string;
  finish: string;
  quantity: number;
  condition: string;
  purchasePrice: number | null;
  matched: boolean;
  variantId: string | null;
}

export async function previewCsvImport(
  csvContent: string
): Promise<{ rows: ImportPreviewRow[]; matchedCount: number; totalCount: number }> {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return { rows: [], matchedCount: 0, totalCount: 0 };

  // Skip header
  const dataLines = lines.slice(1);
  const rows: ImportPreviewRow[] = [];

  for (const line of dataLines) {
    const fields = parseCsvLine(line);
    if (fields.length < 3) continue;

    const cardName = fields[0]?.trim() ?? "";
    const setName = fields[1]?.trim() ?? "";
    const finish = fields[2]?.trim() || "Standard";
    const quantity = parseInt(fields[4] ?? "1") || 1;
    const condition = fields[5]?.trim() || "NM";
    const purchasePrice = fields[6] ? parseFloat(fields[6]) : null;

    // Try to match variant
    const variant = await prisma.cardVariant.findFirst({
      where: {
        card: { name: { equals: cardName, mode: "insensitive" } },
        set: { set: { name: { equals: setName, mode: "insensitive" } } },
        finish: { equals: finish, mode: "insensitive" },
      },
      select: { id: true },
    });

    rows.push({
      cardName,
      setName,
      finish,
      quantity,
      condition,
      purchasePrice: purchasePrice && !isNaN(purchasePrice) ? purchasePrice : null,
      matched: !!variant,
      variantId: variant?.id ?? null,
    });
  }

  return {
    rows,
    matchedCount: rows.filter((r) => r.matched).length,
    totalCount: rows.length,
  };
}

export async function executeCsvImport(rows: ImportPreviewRow[]) {
  const user = await requireUser();

  let collection = await prisma.collection.findFirst({
    where: { userId: user.id },
  });

  if (!collection) {
    collection = await prisma.collection.create({
      data: { name: "My Collection", userId: user.id },
    });
  }

  let imported = 0;

  for (const row of rows) {
    if (!row.variantId) continue;

    const variant = await prisma.cardVariant.findUnique({
      where: { id: row.variantId },
      select: { cardId: true },
    });
    if (!variant) continue;

    const existing = await prisma.collectionCard.findUnique({
      where: {
        collectionId_variantId: {
          collectionId: collection.id,
          variantId: row.variantId,
        },
      },
    });

    if (existing) {
      await prisma.collectionCard.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + row.quantity },
      });
    } else {
      await prisma.collectionCard.create({
        data: {
          collectionId: collection.id,
          cardId: variant.cardId,
          variantId: row.variantId,
          quantity: row.quantity,
          condition: row.condition,
          purchasePrice: row.purchasePrice,
          purchasedAt: row.purchasePrice ? new Date() : null,
        },
      });
    }

    imported++;
  }

  revalidatePath("/collection");
  return { imported };
}

// ── Decklist Import ──

export async function previewDecklistImport(text: string) {
  const lines = text
    .trim()
    .split("\n")
    .filter((l) => l.trim());
  const rows: ImportPreviewRow[] = [];

  for (const line of lines) {
    // Parse: "4x Card Name (Set)" or "4 Card Name"
    const match = line.match(
      /^(\d+)x?\s+(.+?)(?:\s*\(([^)]+)\))?\s*$/i
    );
    if (!match) continue;

    const quantity = parseInt(match[1]) || 1;
    const cardName = match[2].trim();
    const setName = match[3]?.trim() ?? "";

    const whereClause: any = {
      card: { name: { equals: cardName, mode: "insensitive" } },
    };
    if (setName) {
      whereClause.set = {
        set: { name: { equals: setName, mode: "insensitive" } },
      };
    }

    const variant = await prisma.cardVariant.findFirst({
      where: whereClause,
      select: {
        id: true,
        set: { select: { set: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    rows.push({
      cardName,
      setName: setName || variant?.set.set.name || "Unknown",
      finish: "Standard",
      quantity,
      condition: "NM",
      purchasePrice: null,
      matched: !!variant,
      variantId: variant?.id ?? null,
    });
  }

  return {
    rows,
    matchedCount: rows.filter((r) => r.matched).length,
    totalCount: rows.length,
  };
}

// ── CSV Parser (handles quoted fields) ──

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}
