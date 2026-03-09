import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ImportView } from "@/components/collection/import-view";
import { ImportSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "Import Collection — Sorcery Companion",
};

export default function ImportPage() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold font-serif text-amber-100 mb-6">
        Import Cards
      </h1>
      <Suspense fallback={<ImportSkeleton />}>
        <ImportContent />
      </Suspense>
    </main>
  );
}

async function ImportContent() {
  await requireUser();
  return <ImportView />;
}
