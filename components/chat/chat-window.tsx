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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming) return;

      const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const userMsg: ChatMessage = { id: uid(), role: "USER", content: text };
      const assistantMsg: ChatMessage = { id: uid(), role: "ASSISTANT", content: "" };

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

  async function clearChat() {
    if (!sessionId || clearing) return;
    setClearing(true);
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      setMessages([]);
      setSessionId(null);
      setShowClearConfirm(false);
    } finally {
      setClearing(false);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Clear chat bar */}
      {hasMessages && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-neutral-800/60">
          {showClearConfirm ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400">Clear all messages?</span>
              <button
                type="button"
                onClick={clearChat}
                disabled={clearing}
                className="text-xs text-red-400 font-medium disabled:opacity-50"
              >
                {clearing ? "Clearing…" : "Yes, clear"}
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className="text-xs text-neutral-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              disabled={streaming}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Clear chat
            </button>
          )}
        </div>
      )}

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
