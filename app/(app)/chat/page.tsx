import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { ChatWindow } from "@/components/chat/chat-window";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const chatSession = await prisma.chatSession.findFirst({
    where: { userId, wardrobeItemId: null },
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
      <TopBar title="Style AI" />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ChatWindow
          initialMessages={initialMessages}
          initialSessionId={chatSession?.id ?? null}
          endpoint="/api/chat"
          placeholder="Ask your stylist anything…"
          emptyState={
            <div className="flex flex-col items-center justify-center text-center px-8 py-16 text-neutral-500 flex-1">
              <p className="text-4xl mb-4">✨</p>
              <p className="text-base font-medium text-neutral-200 mb-2">Your personal stylist</p>
              <p className="text-sm leading-relaxed">
                Ask about outfits, colour advice, what to wear for an occasion, or how to style a
                specific piece.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
