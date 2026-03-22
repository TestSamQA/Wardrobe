"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initialBrands: string[];
}

export function BrandsEditor({ initialBrands }: Props) {
  const router = useRouter();
  const [brands, setBrands] = useState<string[]>(initialBrands);
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addBrand() {
    const trimmed = input.trim();
    if (!trimmed || brands.length >= 30) return;
    if (brands.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      setInput("");
      return;
    }
    setBrands([...brands, trimmed]);
    setInput("");
  }

  function removeBrand(index: number) {
    setBrands(brands.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addBrand();
    } else if (e.key === "Backspace" && input === "" && brands.length > 0) {
      setBrands(brands.slice(0, -1));
    }
  }

  async function save() {
    // Flush any uncommitted text in the input field
    const trimmed = input.trim();
    let finalBrands = brands;
    if (trimmed && !brands.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      finalBrands = [...brands, trimmed];
      setBrands(finalBrands);
      setInput("");
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredBrands: finalBrands }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setBrands(initialBrands);
    setInput("");
    setError(null);
    setEditing(false);
  }

  // Read-only view
  if (!editing) {
    return (
      <div className="bg-neutral-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-widest text-neutral-500">Favourite shops & brands</p>
          <button
            type="button"
            onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="text-xs text-neutral-400 underline"
          >
            {brands.length === 0 ? "Add" : "Edit"}
          </button>
        </div>
        {brands.length === 0 ? (
          <p className="text-sm text-neutral-600">No brands added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {brands.map((brand) => (
              <span
                key={brand}
                className="text-xs bg-neutral-800 text-neutral-300 rounded-full px-3 py-1"
              >
                {brand}
              </span>
            ))}
          </div>
        )}
        {saved && <p className="text-xs text-green-500 mt-3">Saved</p>}
      </div>
    );
  }

  // Edit view
  return (
    <div className="bg-neutral-900 rounded-2xl p-5 flex flex-col gap-4">
      <p className="text-xs uppercase tracking-widest text-neutral-500">Favourite shops & brands</p>

      {/* Pill input area */}
      <div
        className="min-h-[3rem] flex flex-wrap gap-2 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2.5 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {brands.map((brand, i) => (
          <span
            key={brand}
            className="flex items-center gap-1.5 text-xs bg-neutral-700 text-neutral-200 rounded-full pl-3 pr-2 py-1"
          >
            {brand}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeBrand(i); }}
              className="text-neutral-500 hover:text-red-400 transition-colors"
              aria-label={`Remove ${brand}`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 1l8 8M9 1L1 9" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={brands.length === 0 ? "e.g. Reiss, & Other Stories…" : "Add another…"}
          maxLength={80}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none py-0.5"
        />
      </div>
      <p className="text-xs text-neutral-600 -mt-2">Press Enter to add each brand</p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-xl bg-neutral-100 text-neutral-900 py-2.5 text-sm font-medium transition hover:bg-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="flex-1 rounded-xl bg-neutral-800 text-neutral-300 py-2.5 text-sm font-medium transition hover:bg-neutral-700 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
