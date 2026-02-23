"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(data: { name: string }) {
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: { name: data.name },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteAccount() {
  const user = await requireUser();
  const supabase = await createClient();

  // Delete from our DB (cascades collections, decks, etc.)
  await prisma.user.delete({ where: { id: user.id } });

  // Sign out
  await supabase.auth.signOut();

  return { success: true };
}
