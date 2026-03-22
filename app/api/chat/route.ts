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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  if (!checkRateLimit(userId, "chat", 30, HOUR)) {
    return NextResponse.json({ error: "Rate limit exceeded — 30 messages per hour" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { message, sessionId } = parsed.data;

  const [styleProfile, wardrobeItems] = await Promise.all([
    prisma.styleProfile.findUnique({ where: { userId } }),
    prisma.wardrobeItem.findMany({
      where: { userId, archivedAt: null },
      select: { name: true, customName: true, category: true, colors: true, notes: true },
      take: 50,
    }),
  ]);

  // Find or create general chat session (wardrobeItemId = null)
  let chatSession = sessionId
    ? await prisma.chatSession.findFirst({ where: { id: sessionId, userId, wardrobeItemId: null } })
    : null;

  if (!chatSession) {
    chatSession = await prisma.chatSession.findFirst({
      where: { userId, wardrobeItemId: null },
      orderBy: { updatedAt: "desc" },
    });
  }

  let isNewSession = false;
  if (!chatSession) {
    chatSession = await prisma.chatSession.create({ data: { userId } });
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

  const systemPrompt = buildSystemPrompt(styleProfile, wardrobeItems);
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
        console.error("[POST /api/chat]", e);
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

type StyleProfile = Awaited<ReturnType<typeof prisma.styleProfile.findUnique>>;
type WardrobeItem = { name: string; customName: string | null; category: string; colors: unknown; notes: string | null };

function buildSystemPrompt(styleProfile: StyleProfile, wardrobeItems: WardrobeItem[]): string {
  let prompt =
    "You are a personal AI stylist. You are warm, knowledgeable, and specific. You give practical, personalised advice about fashion, colour, and styling.";

  if (styleProfile) {
    const seasonData = COLOR_SEASONS[styleProfile.colorSeason as ColorSeason];
    const archetype = STYLE_ARCHETYPES.find((a) => a.id === styleProfile.styleArchetype);

    prompt += `\n\nColour profile: The user's colour season is ${seasonData?.label ?? styleProfile.colorSeason}.`;
    if (seasonData) {
      prompt += ` ${seasonData.description}`;
      prompt += `\nPower colours: ${seasonData.powerColors.join(", ")}.`;
      prompt += `\nColours to avoid: ${seasonData.colorsToAvoid.join(", ")}.`;
    }
    if (styleProfile.seasonNotes) prompt += `\nPersonal colour notes: ${styleProfile.seasonNotes}`;
    if (styleProfile.skinTone) prompt += `\nSkin tone: ${styleProfile.skinTone}`;
    if (styleProfile.hairColor) prompt += `\nHair: ${styleProfile.hairColor}`;
    if (styleProfile.eyeColor) prompt += `\nEyes: ${styleProfile.eyeColor}`;

    if (archetype) {
      prompt += `\n\nStyle archetype: ${archetype.label} — ${archetype.description}`;
    }
  }

  if (wardrobeItems.length > 0) {
    prompt += `\n\nWardrobe (${wardrobeItems.length} items):`;
    for (const item of wardrobeItems) {
      const name = item.customName ?? item.name;
      const colors = (item.colors as string[]).join(", ");
      const notes = item.notes ? ` — ${item.notes}` : "";
      prompt += `\n- ${name} (${item.category}): ${colors}${notes}`;
    }
  }

  prompt +=
    "\n\nAlways reference the user's actual items and colour profile when relevant. Be concise and specific.";

  return prompt;
}
