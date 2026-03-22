import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, MODELS, parseJsonResponse } from "@/lib/claude";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  prompt: z.string().min(1).max(500),
});

// POST /api/outfits/generate — AI outfit suggestion (SSE stream)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { prompt } = parsed.data;
  const userId = session.user.id;

  const [profile, items] = await Promise.all([
    prisma.styleProfile.findUnique({ where: { userId } }),
    prisma.wardrobeItem.findMany({
      where: { userId, archivedAt: null },
      select: {
        id: true,
        name: true,
        customName: true,
        category: true,
        subcategory: true,
        colors: true,
        formality: true,
        seasons: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (items.length < 2) {
    return NextResponse.json(
      { error: "Add at least 2 items to your wardrobe before generating outfits." },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        send({ step: "thinking", message: "Analysing your wardrobe…" });

        const profileDesc = profile
          ? [
              `Colour season: ${profile.colorSeason.replace(/_/g, " ")}`,
              `Style archetype: ${profile.styleArchetype}`,
              `Power colours: ${(profile.powerColors as string[]).join(", ")}`,
              `Colours to avoid: ${(profile.colorsToAvoid as string[]).join(", ")}`,
            ].join("\n")
          : "No style profile set.";

        const wardrobeJson = items.map((i) => ({
          id: i.id,
          name: i.customName ?? i.name,
          category: i.category,
          subcategory: i.subcategory,
          colors: i.colors,
          formality: i.formality,
          seasons: i.seasons,
        }));

        const message = await anthropic.messages.create({
          model: MODELS.default,
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `You are a personal stylist. Suggest a complete outfit from the user's wardrobe for the given occasion.

User profile:
${profileDesc}

Wardrobe (JSON array):
${JSON.stringify(wardrobeJson, null, 2)}

Occasion / request: "${prompt}"

Instructions:
- Select 2–6 items that work together as a complete outfit
- Prefer items in the user's power colours and that match their style archetype
- Avoid colours listed as "to avoid" unless the user explicitly asks for them

Return ONLY valid JSON — no markdown, no text outside the object:
{
  "itemIds": ["id1", "id2"],
  "name": "Short outfit name e.g. 'Smart Weekend Look'",
  "rationale": "2–3 sentences explaining why these pieces work together and suit the user's colour profile"
}`,
            },
          ],
        });

        const text = message.content[0].type === "text" ? message.content[0].text : "";
        const result = parseJsonResponse<{
          itemIds: string[];
          name: string;
          rationale: string;
        }>(text);

        // Validate itemIds are actually in the wardrobe
        const validIds = new Set(items.map((i) => i.id));
        result.itemIds = result.itemIds.filter((id) => validIds.has(id));

        if (result.itemIds.length === 0) {
          send({
            step: "error",
            error: "AI couldn't match items to your wardrobe. Try a different prompt.",
          });
          controller.close();
          return;
        }

        send({ step: "done", result });
      } catch (e) {
        send({ step: "error", error: "Failed to generate outfit. Please try again." });
        console.error("[POST /api/outfits/generate]", e);
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
