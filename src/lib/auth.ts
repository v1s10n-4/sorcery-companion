import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Get the current authenticated user, syncing to Prisma on first login.
 * Returns null if not authenticated.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) return null;

  // Upsert into our User table
  const user = await prisma.user.upsert({
    where: { id: supabaseUser.id },
    create: {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name:
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        supabaseUser.email?.split("@")[0] ||
        "User",
      avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
    },
    update: {
      email: supabaseUser.email!,
      name:
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        undefined,
      avatarUrl: supabaseUser.user_metadata?.avatar_url || undefined,
    },
  });

  return user;
});

/**
 * Require authentication — throws redirect if not logged in.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
