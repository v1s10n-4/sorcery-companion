import { ImportSkeleton } from "@/components/skeletons";

export default function ImportLoading() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-2xl">
      <ImportSkeleton />
    </main>
  );
}
