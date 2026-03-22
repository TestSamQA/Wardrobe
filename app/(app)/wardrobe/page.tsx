import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/top-bar";
import { FilterBar } from "@/components/wardrobe/filter-bar";
import { ItemGrid } from "@/components/wardrobe/item-grid";
import type { ItemCategory } from "@/app/generated/prisma/client";

const VALID_CATEGORIES = ["HEADWEAR", "OUTERWEAR", "TOPS", "BOTTOMS", "FOOTWEAR", "ACCESSORIES", "BAGS", "FULL_OUTFIT"];

export default async function WardrobePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { category } = await searchParams;
  const activeCategory = category && VALID_CATEGORIES.includes(category) ? category : "";

  const items = await prisma.wardrobeItem.findMany({
    where: {
      userId: session.user.id,
      archivedAt: null,
      ...(activeCategory && { category: activeCategory as ItemCategory }),
    },
    select: {
      id: true,
      name: true,
      customName: true,
      category: true,
      thumbnailPath: true,
      imagePath: true,
      colorHexes: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <TopBar title="Wardrobe" />
      {/* FilterBar uses useSearchParams — requires Suspense boundary */}
      <Suspense fallback={<div className="h-12" />}>
        <FilterBar activeCategory={activeCategory} />
      </Suspense>
      <ItemGrid items={items} />
      {/* FAB — sits above the bottom nav (h-16 = 64px) with extra breathing room */}
      <Link
        href="/wardrobe/add"
        aria-label="Add item"
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-neutral-50 text-neutral-950 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </div>
  );
}
