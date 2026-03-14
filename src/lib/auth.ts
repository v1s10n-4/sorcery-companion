import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Get the current authenticated user, syncing to Prisma on first login.
 * Returns null if not authenticated.
 *
 * Optimized: uses findUnique (read) on the fast path instead of upsert (write).
 * Writes only occur on first login or when OAuth metadata changes.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) return null;

  // Fast path: user already exists (99.9% of requests)
  const existingUser = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
  });

  if (existingUser) {
    // Only update name/avatar if they changed (from OAuth provider metadata)
    const newName =
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      undefined;
    const newAvatar = supabaseUser.user_metadata?.avatar_url || undefined;

    // Only write if something actually changed
    if (
      (newName && newName !== existingUser.name) ||
      (newAvatar && newAvatar !== existingUser.avatarUrl)
    ) {
      return prisma.user.update({
        where: { id: supabaseUser.id },
        data: {
          email: supabaseUser.email!,
          ...(newName !== existingUser.name ? { name: newName } : {}),
          ...(newAvatar !== existingUser.avatarUrl ? { avatarUrl: newAvatar } : {}),
        },
      });
    }

    return existingUser;
  }

  // Slow path: first login — create the user
  return prisma.user.create({
    data: {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name:
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        supabaseUser.email?.split("@")[0] ||
        "User",
      avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
    },
  });
});

/**
 * Require authentication — throws redirect if not logged in.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
