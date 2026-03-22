import Link from "next/link";
import Image from "next/image";
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

interface Props {
  id: string;
  name: string;
  customName?: string | null;
  category: string;
  thumbnailPath?: string | null;
  imagePath: string;
  colorHexes: string[];
  priority?: boolean;
}

export function ItemCard({ id, name, customName, category, thumbnailPath, imagePath, colorHexes, priority }: Props) {
  const displayName = customName ?? name;
  // Use thumbnail if available, fall back to full image
  const imageUrl = thumbnailPath
    ? buildImageUrl(BUCKET_THUMBNAILS, thumbnailPath)
    : buildImageUrl(BUCKET_IMAGES, imagePath);

  return (
    <Link href={`/wardrobe/${id}`} className="group flex flex-col gap-2">
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-900">
        {/* unoptimized: next/image optimizer is server-side with no session cookie,
            so it would 401 against our auth-gated /api/images proxy */}
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          unoptimized
          priority={priority}
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover transition duration-200 group-hover:scale-105"
        />
      </div>
      <div className="px-0.5">
        <p className="text-sm font-medium text-neutral-100 truncate leading-tight">{displayName}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-neutral-500">{CATEGORY_LABELS[category] ?? category}</span>
          <div className="flex gap-1">
            {colorHexes.slice(0, 3).map((hex) => (
              <div
                key={hex}
                className="w-3 h-3 rounded-full border border-neutral-700 flex-shrink-0"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
