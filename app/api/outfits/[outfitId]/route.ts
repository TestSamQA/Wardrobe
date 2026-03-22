import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/outfits/[outfitId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ outfitId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  if (!outfit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(outfit);
}

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  occasion: z.string().max(200).nullable().optional(),
  season: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

// PATCH /api/outfits/[outfitId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ outfitId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { outfitId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const existing = await prisma.outfit.findFirst({
    where: { id: outfitId, userId: session.user.id, archivedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.outfit.update({
    where: { id: outfitId },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}

// DELETE /api/outfits/[outfitId] — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ outfitId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { outfitId } = await params;

  const existing = await prisma.outfit.findFirst({
    where: { id: outfitId, userId: session.user.id, archivedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.outfit.update({
    where: { id: outfitId },
    data: { archivedAt: new Date() },
  });
  return NextResponse.json({ success: true });
}
