import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/layout/top-bar";
import { OutfitGrid } from "@/components/outfits/outfit-grid";

export default async function OutfitsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const outfits = await prisma.outfit.findMany({
    where: { userId: session.user.id, archivedAt: null },
    select: {
      id: true,
      name: true,
      occasion: true,
      flatlayImagePath: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <TopBar title="Outfits" />
      <OutfitGrid outfits={outfits} />
      <Link
        href="/outfits/create"
        aria-label="Create outfit"
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-accent text-accent-fg flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </div>
  );
}
