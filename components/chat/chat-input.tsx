"use client";

import { useRef } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask your stylist…",
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const value = ref.current?.value.trim();
    if (!value || disabled) return;
    onSend(value);
    if (ref.current) {
      ref.current.value = "";
      ref.current.style.height = "auto";
    }
  };

  return (
    <div className="flex gap-2 items-end px-3 py-3 border-t border-neutral-800 bg-neutral-950">
      <textarea
        ref={ref}
        rows={1}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 resize-none bg-neutral-900 text-neutral-100 placeholder-neutral-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50 overflow-hidden"
        style={{ maxHeight: "120px" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }}
      />
      <button
        onClick={submit}
        disabled={disabled}
        className="shrink-0 w-9 h-9 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
        aria-label="Send"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 13V3M3 8l5-5 5 5" />
        </svg>
      </button>
    </div>
  );
}
