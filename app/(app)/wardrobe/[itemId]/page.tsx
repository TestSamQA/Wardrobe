import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { TopBar } from "@/components/layout/top-bar";
import { ItemDetailActions } from "@/components/wardrobe/item-detail-actions";
import { ItemEditForm } from "@/components/wardrobe/item-edit-form";
import { buildImageUrl, BUCKET_IMAGES } from "@/lib/minio";

const CATEGORY_LABELS: Record<string, string> = {
  HEADWEAR: "Headwear", OUTERWEAR: "Outerwear", TOPS: "Tops", BOTTOMS: "Bottoms",
  FOOTWEAR: "Footwear", ACCESSORIES: "Accessories", BAGS: "Bags", FULL_OUTFIT: "Full Outfit",
};

const FORMALITY_LABELS: Record<string, string> = {
  CASUAL: "Casual", SMART_CASUAL: "Smart Casual", BUSINESS_CASUAL: "Business Casual",
  FORMAL: "Formal", ATHLETIC: "Athletic",
};

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { itemId } = await params;
  const item = await prisma.wardrobeItem.findFirst({
    where: { id: itemId, userId: session.user.id, archivedAt: null },
  });

  if (!item) notFound();

  const imageUrl = buildImageUrl(BUCKET_IMAGES, item.imagePath);
  const colors = item.colors as string[];
  const colorHexes = item.colorHexes as string[];
  const seasons = item.seasons as string[];
  const displayName = item.customName ?? item.name;

  return (
    <div>
      <TopBar title={displayName} back={{ href: "/wardrobe" }} />

      {/* Full image */}
      <div className="relative w-full aspect-square bg-neutral-900">
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          unoptimized
          className="object-contain"
          priority
        />
      </div>

      <div className="px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Name + category */}
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">{displayName}</h1>
          {item.subcategory && (
            <p className="text-sm text-neutral-400 mt-0.5">{item.subcategory}</p>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-xs bg-neutral-800 text-neutral-300 rounded-full px-3 py-1">
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
            <span className="text-xs bg-neutral-800 text-neutral-300 rounded-full px-3 py-1">
              {FORMALITY_LABELS[item.formality] ?? item.formality}
            </span>
          </div>
        </div>

        {/* Colors */}
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Colours</p>
          <div className="flex gap-3 flex-wrap">
            {colors.map((color, i) => (
              <div key={color} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full border border-neutral-700 flex-shrink-0"
                  style={{ backgroundColor: colorHexes[i] ?? "#888" }}
                />
                <span className="text-sm text-neutral-300">{color}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3">
          {item.material && (
            <div className="bg-neutral-900 rounded-xl p-3">
              <p className="text-xs text-neutral-500 mb-1">Material</p>
              <p className="text-sm text-neutral-200">{item.material}</p>
            </div>
          )}
          {item.pattern && (
            <div className="bg-neutral-900 rounded-xl p-3">
              <p className="text-xs text-neutral-500 mb-1">Pattern</p>
              <p className="text-sm text-neutral-200">{item.pattern}</p>
            </div>
          )}
          {seasons.length > 0 && (
            <div className="bg-neutral-900 rounded-xl p-3 col-span-2">
              <p className="text-xs text-neutral-500 mb-1">Seasons</p>
              <p className="text-sm text-neutral-200">{seasons.join(", ")}</p>
            </div>
          )}
        </div>

        {/* AI notes */}
        {item.notes && (
          <div className="bg-neutral-900 rounded-xl p-4">
            <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Style notes</p>
            <p className="text-sm text-neutral-300 leading-relaxed">{item.notes}</p>
          </div>
        )}

        {/* Chat about this item */}
        <Link
          href={`/wardrobe/${item.id}/chat`}
          className="flex items-center gap-3 bg-neutral-900 rounded-xl px-4 py-3.5 text-sm text-neutral-200 active:opacity-70 transition-opacity"
        >
          <span className="text-lg">✨</span>
          <span className="flex-1">Chat about this item</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-neutral-500"
          >
            <path d="M6 12l4-4-4-4" />
          </svg>
        </Link>

        {/* Edit item details (client) */}
        <ItemEditForm
          itemId={item.id}
          initialCustomName={item.customName}
          aiName={item.name}
          initialNotes={item.notes}
          initialColors={colors}
          initialColorHexes={colorHexes}
        />

        {/* Personal notes + delete (client) */}
        <ItemDetailActions itemId={item.id} initialUserNotes={item.userNotes} />

      </div>
    </div>
  );
}
