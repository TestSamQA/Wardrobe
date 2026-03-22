export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadObject, ensureBucket, BUCKET_IMAGES } from "@/lib/minio";
import { generateAiFlatlay } from "@/lib/flatlay-ai";
import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import type { OutfitCreationMethod } from "@/app/generated/prisma/client";
import { checkRateLimit, HOUR } from "@/lib/rate-limit";

// GET /api/outfits — list outfits for the current user
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const outfits = await prisma.outfit.findMany({
    where: { userId: session.user.id, archivedAt: null },
    select: {
      id: true,
      name: true,
      occasion: true,
      season: true,
      flatlayImagePath: true,
      createdBy: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(outfits);
}

const CreateSchema = z.object({
  itemIds: z.array(z.string()).min(1).max(12),
  name: z.string().min(1).max(100),
  occasion: z.string().max(200).nullable().optional(),
  season: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  createdBy: z.enum(["MANUAL", "AI_GENERATED"]).default("MANUAL"),
  aiRationale: z.string().max(2000).nullable().optional(),
  aiPrompt: z.string().max(500).nullable().optional(),
});

// POST /api/outfits — save outfit then generate AI flatlay (SSE stream)
//
// Steps streamed to client:
//   { step: "saving",     message: "Saving outfit…" }
//   { step: "generating", message: "Creating flatlay image…" }
//   { step: "done",       outfitId: string }
//   { step: "error",      error: string, outfitId?: string }   ← outfitId present if outfit saved
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkRateLimit(session.user.id, "outfit-create", 10, HOUR)) {
    return NextResponse.json({ error: "Rate limit exceeded — 10 outfits per hour" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { itemIds, name, occasion, season, description, createdBy, aiRationale, aiPrompt } =
    parsed.data;
  const userId = session.user.id;

  // Validate item ownership before opening the stream
  const items = await prisma.wardrobeItem.findMany({
    where: { id: { in: itemIds }, userId, archivedAt: null },
    select: {
      id: true,
      name: true,
      customName: true,
      category: true,
      subcategory: true,
      colors: true,
      material: true,
      notes: true,
    },
  });

  if (items.length !== itemIds.length) {
    return NextResponse.json({ error: "One or more items not found" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      let outfitId: string | undefined;

      try {
        // ── 1. Save outfit + items (no flatlay yet) ──────────────────────────
        send({ step: "saving", message: "Saving outfit…" });

        outfitId = createId();

        await prisma.$transaction(async (tx) => {
          await tx.outfit.create({
            data: {
              id: outfitId!,
              userId,
              name,
              occasion: occasion ?? null,
              season: season ?? null,
              description: description ?? null,
              createdBy: createdBy as OutfitCreationMethod,
              aiRationale: aiRationale ?? null,
              aiPrompt: aiPrompt ?? null,
              flatlayImagePath: null,
            },
          });

          await tx.outfitItem.createMany({
            data: itemIds.map((wardrobeItemId, position) => ({
              outfitId: outfitId!,
              wardrobeItemId,
              position,
            })),
          });
        });

        // ── 2. Generate AI flatlay ───────────────────────────────────────────
        send({ step: "generating", message: "Creating flatlay image…" });

        const profile = await prisma.styleProfile.findUnique({
          where: { userId },
          select: { colorSeason: true, styleArchetype: true },
        });

        // Preserve caller-supplied item order for the flatlay
        const orderedItems = itemIds
          .map((id) => items.find((i) => i.id === id)!)
          .map((i) => ({
            name: i.name,
            customName: i.customName,
            category: i.category,
            subcategory: i.subcategory,
            colors: i.colors as string[],
            material: i.material,
            notes: i.notes,
          }));

        const flatlayBuffer = await generateAiFlatlay(orderedItems, profile);

        const flatlayKey = `${userId}/outfits/${outfitId}.jpg`;
        await ensureBucket(BUCKET_IMAGES);
        await uploadObject(BUCKET_IMAGES, flatlayKey, flatlayBuffer, "image/jpeg");

        await prisma.outfit.update({
          where: { id: outfitId },
          data: { flatlayImagePath: flatlayKey },
        });

        send({ step: "done", outfitId });
      } catch (e) {
        console.error("[POST /api/outfits]", e);
        // If the outfit was already saved, include its id so the client can
        // still navigate to it (just without a flatlay image).
        send({
          step: "error",
          error: "Failed to create flatlay image. Your outfit was saved.",
          outfitId,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
