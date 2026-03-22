"use client";

import { useState } from "react";
import { STYLE_ARCHETYPES, type StyleArchetypeId } from "@/lib/color-seasons";

interface Props {
  onSelect: (archetypeId: StyleArchetypeId) => void;
  loading?: boolean;
}

export function StylePicker({ onSelect, loading }: Props) {
  const [selected, setSelected] = useState<StyleArchetypeId | null>(null);

  return (
    <div className="flex flex-col px-6 py-8 gap-6 max-w-sm mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-50">What&apos;s your style?</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Pick the vibe that feels most like you. You can always update this later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {STYLE_ARCHETYPES.map((archetype) => (
          <button
            key={archetype.id}
            type="button"
            onClick={() => setSelected(archetype.id)}
            className={`flex flex-col gap-1 text-left rounded-2xl border px-4 py-4 transition ${
              selected === archetype.id
                ? "border-accent bg-neutral-800"
                : "border-neutral-700 bg-neutral-900"
            }`}
          >
            <span className="text-2xl">{archetype.emoji}</span>
            <span className="text-sm font-semibold text-neutral-100 leading-tight">{archetype.label}</span>
            <span className="text-xs text-neutral-500 leading-snug">{archetype.description}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => selected && onSelect(selected)}
        disabled={!selected || loading}
        className="w-full rounded-xl bg-accent text-accent-fg py-3 text-sm font-semibold transition hover:bg-accent-dim disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Setting up your wardrobe…
          </span>
        ) : "Finish setup"}
      </button>
    </div>
  );
}
