"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  role: "USER" | "ASSISTANT";
  content: string;
  streaming?: boolean;
}

export function MessageBubble({ role, content, streaming }: MessageBubbleProps) {
  const isUser = role === "USER";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-neutral-100 text-neutral-900 rounded-br-sm whitespace-pre-wrap"
            : "bg-neutral-900 text-neutral-100 rounded-bl-sm"
        }`}
      >
        {isUser ? (
          content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-neutral-50">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              hr: () => <hr className="border-neutral-700 my-3" />,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              h1: ({ children }) => <p className="font-semibold text-neutral-50 mb-1">{children}</p>,
              h2: ({ children }) => <p className="font-semibold text-neutral-50 mb-1">{children}</p>,
              h3: ({ children }) => <p className="font-medium text-neutral-200 mb-1">{children}</p>,
              code: ({ children }) => (
                <code className="bg-neutral-800 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
        {streaming && (
          <span className="inline-block w-0.5 h-3.5 bg-current animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  );
}
