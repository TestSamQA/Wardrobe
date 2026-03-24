export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST /api/wardrobe/[itemId]/duplicate
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const source = await prisma.wardrobeItem.findFirst({
    where: { id: itemId, userId: session.user.id, archivedAt: null },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const duplicate = await prisma.wardrobeItem.create({
    data: {
      userId: source.userId,
      imagePath: source.imagePath,
      thumbnailPath: source.thumbnailPath,
      name: source.name,
      category: source.category,
      subcategory: source.subcategory,
      colors: source.colors ?? [],
      colorHexes: source.colorHexes ?? [],
      pattern: source.pattern,
      material: source.material,
      formality: source.formality,
      seasons: source.seasons ?? [],
      brand: source.brand,
      notes: source.notes,
    },
  });

  return NextResponse.json({ id: duplicate.id });
}
