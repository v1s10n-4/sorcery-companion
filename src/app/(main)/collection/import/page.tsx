import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ImportView } from "@/components/collection/import-view";

export const metadata: Metadata = {
  title: "Import Collection — Sorcery Companion",
};

export default async function ImportPage() {
  await requireUser();

  return (
    <main className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold font-serif text-amber-100 mb-6">
        Import Cards
      </h1>
      <ImportView />
    </main>
  );
}
