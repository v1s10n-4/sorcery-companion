import { AuthFormSkeleton } from "@/components/skeletons";

export default function LoginLoading() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-md">
      <AuthFormSkeleton />
    </main>
  );
}
