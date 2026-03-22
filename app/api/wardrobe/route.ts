export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadObject, ensureBucket, BUCKET_IMAGES, BUCKET_THUMBNAILS } from "@/lib/minio";
import { anthropic, MODELS, parseJsonResponse } from "@/lib/claude";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, HOUR } from "@/lib/rate-limit";
import { createId } from "@paralleldrive/cuid2";
import sharp from "sharp";
import type { ItemCategory, Formality } from "@/app/generated/prisma/client";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const VALID_CATEGORIES = ["HEADWEAR", "OUTERWEAR", "TOPS", "BOTTOMS", "FOOTWEAR", "ACCESSORIES", "BAGS", "FULL_OUTFIT"];
const VALID_FORMALITY = ["CASUAL", "SMART_CASUAL", "BUSINESS_CASUAL", "FORMAL", "ATHLETIC"];
const VALID_SEASONS = ["Spring", "Summer", "Autumn", "Winter"];

// GET /api/wardrobe — list items with optional filters
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const formality = searchParams.get("formality");
  const q = searchParams.get("q");

  const items = await prisma.wardrobeItem.findMany({
    where: {
      userId: session.user.id,
      archivedAt: null,
      ...(category && VALID_CATEGORIES.includes(category) && { category: category as ItemCategory }),
      ...(formality && VALID_FORMALITY.includes(formality) && { formality: formality as Formality }),
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { customName: { contains: q, mode: "insensitive" } },
          { subcategory: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      }),
    },
    select: {
      id: true,
      name: true,
      customName: true,
      category: true,
      subcategory: true,
      colors: true,
      colorHexes: true,
      thumbnailPath: true,
      imagePath: true,
      formality: true,
      seasons: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

// POST /api/wardrobe — upload + analyse item, streamed via SSE
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkRateLimit(session.user.id, "wardrobe-add", 20, HOUR)) {
    return NextResponse.json({ error: "Rate limit exceeded — 20 items per hour" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("photo") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "JPEG, PNG, or WebP required. On iPhone, capture a new photo rather than selecting from your library." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 10MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const itemId = createId();
  // Always stored as JPEG after orientation normalisation
  const objectKey = `${session.user.id}/wardrobe/${itemId}.jpg`;
  const thumbnailKey = `${session.user.id}/wardrobe/${itemId}_thumb.jpg`;
  const userId = session.user.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        // 1 — Normalise orientation (reads EXIF rotation, bakes it into pixels,
        //     strips EXIF so browsers/sharp always see the correct orientation)
        //     then upload full-resolution image
        send({ step: "uploading", message: "Uploading image…" });
        const normalisedBuffer = await sharp(buffer)
          .rotate() // auto-rotate from EXIF, then strip EXIF
          .jpeg({ quality: 92 })
          .toBuffer();
        await ensureBucket(BUCKET_IMAGES);
        // Always store as JPEG after normalisation
        await uploadObject(BUCKET_IMAGES, objectKey, normalisedBuffer, "image/jpeg");

        // 2 — Generate thumbnail from the already-oriented image
        send({ step: "thumbnail", message: "Generating thumbnail…" });
        const thumbBuffer = await sharp(normalisedBuffer)
          .resize(600, 600, { fit: "cover" })
          .jpeg({ quality: 82 })
          .toBuffer();
        await ensureBucket(BUCKET_THUMBNAILS);
        await uploadObject(BUCKET_THUMBNAILS, thumbnailKey, thumbBuffer, "image/jpeg");

        // 3 — Claude Vision analysis (use normalised buffer — correct orientation)
        send({ step: "analysing", message: "Analysing item with AI…" });
        const message = await anthropic.messages.create({
          model: MODELS.default,
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: normalisedBuffer.toString("base64") },
              },
              {
                type: "text",
                text: `You are a wardrobe analyst. Analyse this clothing item photograph and return structured JSON.

Categories (choose one): HEADWEAR, OUTERWEAR, TOPS, BOTTOMS, FOOTWEAR, ACCESSORIES, BAGS, FULL_OUTFIT
Formality (choose one): CASUAL, SMART_CASUAL, BUSINESS_CASUAL, FORMAL, ATHLETIC
Seasons (any subset): ["Spring", "Summer", "Autumn", "Winter"]

Return ONLY valid JSON — no markdown, no text outside the object:
{
  "name": "descriptive name e.g. Navy Slim-Fit Chinos",
  "category": "CATEGORY",
  "subcategory": "specific type e.g. Chinos, Oxford Shirt, Chelsea Boot",
  "colors": ["Primary Color", "Secondary Color"],
  "colorHexes": ["#hexcode1", "#hexcode2"],
  "pattern": "Solid|Striped|Checked|Floral|Geometric|Abstract|Animal Print|null",
  "material": "Cotton|Wool|Linen|Polyester|Leather|Denim|Silk|Cashmere|etc or null",
  "formality": "FORMALITY",
  "seasons": ["Season1"],
  "notes": "brief style notes on cut, fit, or details — or null"
}`,
              },
            ],
          }],
        });

        const text = message.content[0].type === "text" ? message.content[0].text : "";
        let analysed: {
          name: string;
          category: string;
          subcategory?: string;
          colors: string[];
          colorHexes: string[];
          pattern?: string | null;
          material?: string | null;
          formality: string;
          seasons: string[];
          notes?: string | null;
        };

        try {
          analysed = parseJsonResponse(text);
        } catch {
          send({ step: "error", error: "Failed to analyse item. Please try again." });
          controller.close();
          return;
        }

        // Sanitise AI output against valid enum values
        if (!VALID_CATEGORIES.includes(analysed.category)) analysed.category = "TOPS";
        if (!VALID_FORMALITY.includes(analysed.formality)) analysed.formality = "CASUAL";
        analysed.seasons = (analysed.seasons ?? []).filter((s) => VALID_SEASONS.includes(s));
        if (analysed.seasons.length === 0) analysed.seasons = ["Spring", "Summer", "Autumn", "Winter"];

        // 4 — Save to DB
        send({ step: "saving", message: "Saving to your wardrobe…" });
        const item = await prisma.wardrobeItem.create({
          data: {
            id: itemId,
            userId,
            imagePath: objectKey,
            thumbnailPath: thumbnailKey,
            name: analysed.name,
            category: analysed.category as ItemCategory,
            subcategory: analysed.subcategory ?? null,
            colors: analysed.colors,
            colorHexes: analysed.colorHexes,
            pattern: analysed.pattern ?? null,
            material: analysed.material ?? null,
            formality: analysed.formality as Formality,
            seasons: analysed.seasons,
            notes: analysed.notes ?? null,
          },
        });

        send({ step: "done", item: { id: item.id, name: item.name } });
      } catch (e) {
        send({ step: "error", error: "Something went wrong. Please try again." });
        console.error("[POST /api/wardrobe]", e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
