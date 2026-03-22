export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, MODELS } from "@/lib/claude";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ColorSeason } from "@/app/generated/prisma/client";
import { COLOR_SEASONS, STYLE_ARCHETYPES } from "@/lib/color-seasons";
import { checkRateLimit, HOUR } from "@/lib/rate-limit";

const PostSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { itemId } = await params;

  if (!checkRateLimit(userId, "chat", 30, HOUR)) {
    return NextResponse.json({ error: "Rate limit exceeded — 30 messages per hour" }, { status: 429 });
  }

  const item = await prisma.wardrobeItem.findFirst({
    where: { id: itemId, userId, archivedAt: null },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { message, sessionId } = parsed.data;

  const styleProfile = await prisma.styleProfile.findUnique({ where: { userId } });

  let chatSession = sessionId
    ? await prisma.chatSession.findFirst({ where: { id: sessionId, userId, wardrobeItemId: itemId } })
    : null;

  if (!chatSession) {
    chatSession = await prisma.chatSession.findFirst({
      where: { userId, wardrobeItemId: itemId },
      orderBy: { updatedAt: "desc" },
    });
  }

  let isNewSession = false;
  if (!chatSession) {
    chatSession = await prisma.chatSession.create({ data: { userId, wardrobeItemId: itemId } });
    isNewSession = true;
  }

  const history = await prisma.chatMessage.findMany({
    where: { sessionId: chatSession.id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  await prisma.chatMessage.create({
    data: { sessionId: chatSession.id, role: "USER", content: message },
  });

  const systemPrompt = buildItemSystemPrompt(item, styleProfile);
  const claudeMessages = [
    ...history.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const sessionIdToSend = chatSession.id;
  const encoder = new TextEncoder();

  const responseStream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      if (isNewSession || !sessionId) {
        send({ type: "session", sessionId: sessionIdToSend });
      }

      let fullText = "";
      try {
        const stream = anthropic.messages.stream({
          model: MODELS.default,
          max_tokens: 1024,
          system: systemPrompt,
          messages: claudeMessages,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            send({ type: "delta", text: event.delta.text });
          }
        }

        await prisma.chatMessage.create({
          data: { sessionId: sessionIdToSend, role: "ASSISTANT", content: fullText },
        });

        send({ type: "done" });
      } catch (e) {
        console.error("[POST /api/items/chat]", e);
        send({ type: "error", error: "Something went wrong" });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

type Item = NonNullable<Awaited<ReturnType<typeof prisma.wardrobeItem.findFirst>>>;
type StyleProfile = Awaited<ReturnType<typeof prisma.styleProfile.findUnique>>;

function buildItemSystemPrompt(item: Item, styleProfile: StyleProfile): string {
  const colors = (item.colors as string[]).join(", ");
  const seasons = item.seasons as string[];

  let prompt = `You are a personal AI stylist. The user wants to discuss a specific wardrobe item.

Item: ${item.customName ?? item.name}
Category: ${item.category}
Colours: ${colors}`;

  if (item.subcategory) prompt += `\nSubcategory: ${item.subcategory}`;
  if (item.material) prompt += `\nMaterial: ${item.material}`;
  if (item.pattern) prompt += `\nPattern: ${item.pattern}`;
  if (item.formality) prompt += `\nFormality: ${item.formality}`;
  if (seasons?.length) prompt += `\nSeasons: ${seasons.join(", ")}`;
  if (item.notes) prompt += `\nStyle notes: ${item.notes}`;
  if (item.userNotes) prompt += `\nOwner's notes: ${item.userNotes}`;

  if (styleProfile) {
    const seasonData = COLOR_SEASONS[styleProfile.colorSeason as ColorSeason];
    const archetype = STYLE_ARCHETYPES.find((a) => a.id === styleProfile.styleArchetype);

    prompt += `\n\nUser's colour season: ${seasonData?.label ?? styleProfile.colorSeason}.`;
    if (seasonData) {
      prompt += ` ${seasonData.description}`;
      prompt += ` Power colours: ${seasonData.powerColors.join(", ")}.`;
      prompt += ` Colours to avoid: ${seasonData.colorsToAvoid.join(", ")}.`;
    }
    if (archetype) {
      prompt += `\nStyle archetype: ${archetype.label} — ${archetype.description}`;
    }
  }

  prompt +=
    "\n\nGive specific, practical advice about this item — how to style it, what it pairs with, whether it suits their colour profile, occasions to wear it, etc. Be conversational and helpful.";

  return prompt;
}
