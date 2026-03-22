export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/wardrobe/[itemId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const item = await prisma.wardrobeItem.findFirst({
    where: { id: itemId, userId: session.user.id, archivedAt: null },
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

const PatchSchema = z.object({
  customName: z.string().max(100).nullable().optional(),
  userNotes: z.string().max(1000).nullable().optional(),
  name: z.string().max(100).optional(),
  notes: z.string().max(2000).nullable().optional(),
  formality: z.enum(["CASUAL", "SMART_CASUAL", "BUSINESS_CASUAL", "FORMAL", "ATHLETIC"]).optional(),
  seasons: z.array(z.enum(["Spring", "Summer", "Autumn", "Winter"])).optional(),
  colors: z.array(z.string().max(50)).max(8).optional(),
  colorHexes: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(8).optional(),
});

// PATCH /api/wardrobe/[itemId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const existing = await prisma.wardrobeItem.findFirst({
    where: { id: itemId, userId: session.user.id, archivedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.wardrobeItem.update({
    where: { id: itemId },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}

// DELETE /api/wardrobe/[itemId] — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const existing = await prisma.wardrobeItem.findFirst({
    where: { id: itemId, userId: session.user.id, archivedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.wardrobeItem.update({
    where: { id: itemId },
    data: { archivedAt: new Date() },
  });
  return NextResponse.json({ success: true });
}
