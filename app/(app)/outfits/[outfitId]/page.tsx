import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { TopBar } from "@/components/layout/top-bar";
import { OutfitDetailActions } from "@/components/outfits/outfit-detail-actions";
import { buildImageUrl, BUCKET_IMAGES, BUCKET_THUMBNAILS } from "@/lib/minio";

const CATEGORY_LABELS: Record<string, string> = {
  HEADWEAR: "Headwear",
  OUTERWEAR: "Outerwear",
  TOPS: "Tops",
  BOTTOMS: "Bottoms",
  FOOTWEAR: "Footwear",
  ACCESSORIES: "Accessories",
  BAGS: "Bags",
  FULL_OUTFIT: "Full Outfit",
};

export default async function OutfitDetailPage({
  params,
}: {
  params: Promise<{ outfitId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { outfitId } = await params;

  const outfit = await prisma.outfit.findFirst({
    where: { id: outfitId, userId: session.user.id, archivedAt: null },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          wardrobeItem: {
            select: {
              id: true,
              name: true,
              customName: true,
              category: true,
              thumbnailPath: true,
              imagePath: true,
              colorHexes: true,
            },
          },
        },
      },
    },
  });

  if (!outfit) notFound();

  const flatlayUrl = outfit.flatlayImagePath
    ? buildImageUrl(BUCKET_IMAGES, outfit.flatlayImagePath)
    : null;

  return (
    <div>
      <TopBar title={outfit.name} back={{ href: "/outfits" }} />

      {/* Flatlay image */}
      {flatlayUrl ? (
        <div className="relative w-full aspect-square bg-neutral-900">
          <Image
            src={flatlayUrl}
            alt={outfit.name}
            fill
            unoptimized
            className="object-cover"
            priority
          />
        </div>
      ) : (
        <div className="w-full aspect-square bg-neutral-900 flex items-center justify-center text-neutral-700">
          <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      <div className="px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Name + meta */}
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">{outfit.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {outfit.occasion && (
              <span className="text-xs bg-neutral-800 text-neutral-300 rounded-full px-3 py-1">
                {outfit.occasion}
              </span>
            )}
            {outfit.season && (
              <span className="text-xs bg-neutral-800 text-neutral-300 rounded-full px-3 py-1">
                {outfit.season}
              </span>
            )}
            <span className="text-xs bg-neutral-800 text-neutral-500 rounded-full px-3 py-1">
              {outfit.createdBy === "AI_GENERATED" ? "AI generated" : "Manual"}
            </span>
          </div>
        </div>

        {/* Description */}
        {outfit.description && (
          <p className="text-sm text-neutral-300 leading-relaxed">{outfit.description}</p>
        )}

        {/* AI rationale */}
        {outfit.aiRationale && (
          <div className="bg-neutral-900 rounded-xl p-4">
            <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Style rationale</p>
            <p className="text-sm text-neutral-300 leading-relaxed">{outfit.aiRationale}</p>
          </div>
        )}

        {/* Items in outfit */}
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500 mb-3">
            Items ({outfit.items.length})
          </p>
          <div className="flex flex-col gap-3">
            {outfit.items.map(({ wardrobeItem }) => {
              const thumbUrl = wardrobeItem.thumbnailPath
                ? buildImageUrl(BUCKET_THUMBNAILS, wardrobeItem.thumbnailPath)
                : buildImageUrl(BUCKET_IMAGES, wardrobeItem.imagePath);
              const displayName = wardrobeItem.customName ?? wardrobeItem.name;
              const hexes = wardrobeItem.colorHexes as string[];

              return (
                <a
                  key={wardrobeItem.id}
                  href={`/wardrobe/${wardrobeItem.id}`}
                  className="flex items-center gap-3 bg-neutral-900 rounded-xl p-3 hover:bg-neutral-800 transition"
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
                    <Image
                      src={thumbUrl}
                      alt={displayName}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-100 truncate">{displayName}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {CATEGORY_LABELS[wardrobeItem.category] ?? wardrobeItem.category}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {hexes.slice(0, 3).map((hex) => (
                      <div
                        key={hex}
                        className="w-3 h-3 rounded-full border border-neutral-700"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Delete action (client) */}
        <OutfitDetailActions outfitId={outfit.id} />

      </div>
    </div>
  );
}
