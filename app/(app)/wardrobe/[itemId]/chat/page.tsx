import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { ChatWindow } from "@/components/chat/chat-window";

export default async function ItemChatPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { itemId } = await params;

  const item = await prisma.wardrobeItem.findFirst({
    where: { id: itemId, userId, archivedAt: null },
    select: { id: true, name: true, customName: true },
  });
  if (!item) notFound();

  const displayName = item.customName ?? item.name;

  const chatSession = await prisma.chatSession.findFirst({
    where: { userId, wardrobeItemId: itemId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 40,
      },
    },
  });

  const initialMessages =
    chatSession?.messages.map((m) => ({
      id: m.id,
      role: m.role as "USER" | "ASSISTANT",
      content: m.content,
    })) ?? [];

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 56px)" }}>
      <TopBar title={displayName} back={{ href: `/wardrobe/${itemId}` }} />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ChatWindow
          initialMessages={initialMessages}
          initialSessionId={chatSession?.id ?? null}
          endpoint={`/api/items/${itemId}/chat`}
          placeholder={`Ask about this item…`}
          emptyState={
            <div className="flex flex-col items-center justify-center text-center px-8 py-16 text-neutral-500 flex-1">
              <p className="text-4xl mb-4">👕</p>
              <p className="text-base font-medium text-neutral-200 mb-2">{displayName}</p>
              <p className="text-sm leading-relaxed">
                Ask how to style it, what it pairs with, whether it suits your colour season, or
                when to wear it.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
