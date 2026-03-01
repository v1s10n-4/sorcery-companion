import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign Up — Sorcery Companion",
};

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function SignupPage({ searchParams }: PageProps) {
  const { redirect } = await searchParams;

  return (
    <main className="container mx-auto px-4 py-12 max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold font-serif text-amber-100 mb-2">
          Create account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start tracking your Sorcery collection
        </p>
      </div>

      <SignupForm redirect={redirect} />

      <p className="text-center text-xs text-muted-foreground mt-6">
        Already have an account?{" "}
        <a
          href={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
          className="text-amber-400 hover:text-amber-300"
        >
          Sign in
        </a>
      </p>
    </main>
  );
}
