import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ExportView } from "@/components/collection/export-view";
import { ExportSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "Export Collection — Sorcery Companion",
};

export default function ExportPage() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-lg">
      <h1 className="text-2xl font-bold font-serif text-amber-100 mb-6">
        Export Collection
      </h1>
      <Suspense fallback={<ExportSkeleton />}>
        <ExportContent />
      </Suspense>
    </main>
  );
}

async function ExportContent() {
  await requireUser();
  return <ExportView />;
}
