export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PatchSchema = z.object({
  preferredBrands: z.array(z.string().min(1).max(80)).max(30),
});

// PATCH /api/profile — updates mutable style profile fields
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const existing = await prisma.styleProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const updated = await prisma.styleProfile.update({
    where: { userId: session.user.id },
    data: { preferredBrands: parsed.data.preferredBrands },
  });

  return NextResponse.json({ preferredBrands: updated.preferredBrands });
}
