export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/sessions/[sessionId] — deletes the chat session and all its messages
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;

  const chatSession = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });
  if (!chatSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.chatSession.delete({ where: { id: sessionId } });

  return NextResponse.json({ success: true });
}
