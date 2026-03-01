import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In — Sorcery Companion",
};

interface PageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { redirect, error } = await searchParams;

  return (
    <main className="container mx-auto px-4 py-12 max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold font-serif text-amber-100 mb-2">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your collection and decks
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-300">
          Authentication failed. Please try again.
        </div>
      )}

      <LoginForm redirect={redirect} />

      <p className="text-center text-xs text-muted-foreground mt-6">
        Don&apos;t have an account?{" "}
        <a
          href={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
          className="text-amber-400 hover:text-amber-300"
        >
          Sign up
        </a>
      </p>
    </main>
  );
}
