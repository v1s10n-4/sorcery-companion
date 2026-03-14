import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { SettingsView } from "@/components/settings-view";
import { SettingsSkeleton } from "@/components/skeletons";

export const experimental_ppr = true;

export const metadata: Metadata = {
  title: "Settings — Sorcery Companion",
};

export default function SettingsPage() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-lg">
      <h1 className="text-2xl font-bold font-serif text-amber-100 mb-6">
        Settings
      </h1>
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </main>
  );
}

async function SettingsContent() {
  const user = await requireUser();

  return (
    <SettingsView
      user={{
        id: user.id,
        name: user.name ?? "",
        email: user.email,
        avatarUrl: user.avatarUrl,
        plan: user.plan,
      }}
    />
  );
}
