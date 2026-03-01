import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { SettingsView } from "@/components/settings-view";

export const metadata: Metadata = {
  title: "Settings — Sorcery Companion",
};

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <main className="container mx-auto px-4 py-6 max-w-lg">
      <h1 className="text-2xl font-bold font-serif text-amber-100 mb-6">
        Settings
      </h1>
      <SettingsView
        user={{
          id: user.id,
          name: user.name ?? "",
          email: user.email,
          avatarUrl: user.avatarUrl,
          plan: user.plan,
        }}
      />
    </main>
  );
}
