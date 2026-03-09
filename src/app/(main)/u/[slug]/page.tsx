import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicCollection, getPublicCollectionMeta } from "@/lib/data-user";
import { PublicCollectionView } from "@/components/collection/public-collection-view";
import { PublicCollectionSkeleton } from "@/components/skeletons";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getPublicCollectionMeta(slug);

  if (!meta || !meta.isPublic) {
    return { title: "Collection Not Found" };
  }

  return {
    title: `${meta.user.name}'s Collection — Sorcery Companion`,
    description: meta.description || `${meta.name} on Sorcery Companion`,
    openGraph: {
      title: `${meta.user.name}'s Sorcery Collection`,
      description: meta.description || `${meta.name} — Browse their cards on Sorcery Companion`,
    },
  };
}

export default async function PublicCollectionPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <main className="container mx-auto px-4 py-6 max-w-5xl">
      <Suspense fallback={<PublicCollectionSkeleton />}>
        <PublicCollectionContent slug={slug} />
      </Suspense>
    </main>
  );
}

async function PublicCollectionContent({ slug }: { slug: string }) {
  const data = await getPublicCollection(slug);
  if (!data) notFound();

  return (
    <PublicCollectionView
      ownerName={data.ownerName}
      ownerAvatar={data.ownerAvatar}
      collectionName={data.collectionName}
      description={data.description}
      cards={data.cards}
      totalCards={data.totalCards}
      totalValue={data.totalValue}
    />
  );
}
