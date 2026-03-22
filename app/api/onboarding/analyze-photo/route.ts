export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { uploadObject, ensureBucket, BUCKET_IMAGES } from "@/lib/minio";
import { anthropic, MODELS, parseJsonResponse } from "@/lib/claude";
import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const VALID_SEASONS = new Set([
  "LIGHT_SPRING", "WARM_SPRING", "TRUE_SPRING", "CLEAR_SPRING",
  "LIGHT_SUMMER", "TRUE_SUMMER", "SOFT_SUMMER",
  "TRUE_AUTUMN", "WARM_AUTUMN", "SOFT_AUTUMN", "DEEP_AUTUMN",
  "TRUE_WINTER", "DEEP_WINTER", "CLEAR_WINTER",
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("photo") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Please provide a JPEG, PNG, or WebP image. On iPhone, capture a new photo rather than selecting from your library." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectKey = `${session.user.id}/selfie/${createId()}.${ext}`;

  await ensureBucket(BUCKET_IMAGES);
  await uploadObject(BUCKET_IMAGES, objectKey, buffer, file.type);

  const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";

  const message = await anthropic.messages.create({
    model: MODELS.default,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: buffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: `You are an expert colour analyst specialising in the 12-season colour analysis system.

Analyse this selfie to determine the person's colour season. Examine:
- Skin tone and undertone (warm/peachy/golden vs cool/pink/rosy vs neutral/olive)
- Natural hair colour and tone
- Eye colour and tone
- Overall contrast and clarity (light/muted/vivid/deep)

The 14 seasons are:
LIGHT_SPRING, WARM_SPRING, TRUE_SPRING, CLEAR_SPRING
LIGHT_SUMMER, TRUE_SUMMER, SOFT_SUMMER
TRUE_AUTUMN, WARM_AUTUMN, SOFT_AUTUMN, DEEP_AUTUMN
TRUE_WINTER, DEEP_WINTER, CLEAR_WINTER

Return ONLY valid JSON — no markdown, no text outside the JSON object:
{
  "season": "SEASON_NAME",
  "confidence": "high|medium|low",
  "skinTone": "brief description e.g. warm medium with golden undertones",
  "hairColor": "brief description e.g. warm chestnut brown",
  "eyeColor": "brief description e.g. warm hazel with green flecks",
  "reasoning": "2-3 sentences explaining the season assignment",
  "alternativeSeasons": ["SEASON1", "SEASON2"]
}`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: {
    season: string;
    confidence: string;
    skinTone: string;
    hairColor: string;
    eyeColor: string;
    reasoning: string;
    alternativeSeasons: string[];
  };

  try {
    parsed = parseJsonResponse(text);
  } catch {
    return NextResponse.json(
      { error: "Failed to analyse the photo. Please try again or enter your features manually." },
      { status: 500 }
    );
  }

  if (!VALID_SEASONS.has(parsed.season)) {
    return NextResponse.json(
      { error: "Failed to analyse the photo. Please try again or enter your features manually." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ...parsed, selfieImagePath: objectKey });
}
