"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateCollectionSharing(data: {
  collectionId: string;
  isPublic: boolean;
  slug?: string;
  description?: string;
}) {
  const user = await requireUser();

  const collection = await prisma.collection.findUnique({
    where: { id: data.collectionId },
  });

  if (!collection || collection.userId !== user.id) {
    throw new Error("Not found");
  }

  // Generate slug if going public and no slug set
  let slug = data.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || null;
  if (data.isPublic && !slug) {
    const baseName = user.name?.toLowerCase().replace(/[^a-z0-9]/g, "-") || "user";
    slug = `${baseName}-${Date.now().toString(36)}`;
  }

  // Check slug uniqueness
  if (slug) {
    const existing = await prisma.collection.findUnique({
      where: { slug },
    });
    if (existing && existing.id !== data.collectionId) {
      throw new Error("This URL is already taken");
    }
  }

  await prisma.collection.update({
    where: { id: data.collectionId },
    data: {
      isPublic: data.isPublic,
      slug: data.isPublic ? slug : collection.slug,
      description: data.description,
    },
  });

  revalidatePath("/collection");
  return { success: true, slug };
}
