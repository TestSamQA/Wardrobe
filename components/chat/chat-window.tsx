"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
}

interface ChatWindowProps {
  initialMessages: ChatMessage[];
  initialSessionId: string | null;
  endpoint: string;
  placeholder?: string;
  emptyState?: React.ReactNode;
}

export function ChatWindow({
  initialMessages,
  initialSessionId,
  endpoint,
  placeholder,
  emptyState,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming) return;

      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "USER", content: text };
      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "ASSISTANT", content: "" };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, ...(sessionId ? { sessionId } : {}) }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "(no body)");
          throw new Error(`Request failed: ${res.status} ${text}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "session") {
                setSessionId(event.sessionId);
              } else if (event.type === "delta") {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "ASSISTANT") {
                    next[next.length - 1] = { ...last, content: last.content + event.text };
                  }
                  return next;
                });
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (e) {
        console.error(e);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "ASSISTANT" && last.content === "") {
            next[next.length - 1] = {
              ...last,
              content: "Sorry, something went wrong. Please try again.",
            };
          }
          return next;
        });
      } finally {
        setStreaming(false);
      }
    },
    [streaming, sessionId, endpoint]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && emptyState}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            streaming={streaming && i === messages.length - 1 && msg.role === "ASSISTANT"}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={sendMessage} disabled={streaming} placeholder={placeholder} />
    </div>
  );
}
