import { SettingsSkeleton } from "@/components/skeletons";

export default function SettingsLoading() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-lg">
      <SettingsSkeleton />
    </main>
  );
}
