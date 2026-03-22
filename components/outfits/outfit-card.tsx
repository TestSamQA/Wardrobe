import Link from "next/link";
import Image from "next/image";
import { buildImageUrl, BUCKET_IMAGES } from "@/lib/minio";

interface Props {
  id: string;
  name: string;
  occasion?: string | null;
  flatlayImagePath?: string | null;
  itemCount: number;
  priority?: boolean;
}

export function OutfitCard({ id, name, occasion, flatlayImagePath, itemCount, priority }: Props) {
  const imageUrl = flatlayImagePath
    ? buildImageUrl(BUCKET_IMAGES, flatlayImagePath)
    : null;

  return (
    <Link href={`/outfits/${id}`} className="group flex flex-col gap-2">
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-900">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            unoptimized
            priority={priority}
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-700">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="px-0.5">
        <p className="text-sm font-medium text-neutral-100 truncate leading-tight">{name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-neutral-500 truncate">
            {occasion ?? `${itemCount} item${itemCount !== 1 ? "s" : ""}`}
          </span>
          {occasion && (
            <span className="text-xs text-neutral-600 ml-2 flex-shrink-0">{itemCount} items</span>
          )}
        </div>
      </div>
    </Link>
  );
}
