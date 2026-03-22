"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ColourEntry {
  name: string;
  hex: string;
}

interface Props {
  itemId: string;
  initialCustomName: string | null;
  aiName: string;
  initialNotes: string | null;
  initialColors: string[];
  initialColorHexes: string[];
}

export function ItemEditForm({
  itemId,
  initialCustomName,
  aiName,
  initialNotes,
  initialColors,
  initialColorHexes,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialCustomName ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [colours, setColours] = useState<ColourEntry[]>(
    initialColors.map((c, i) => ({ name: c, hex: initialColorHexes[i] ?? "#888888" }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addColour() {
    if (colours.length >= 8) return;
    setColours([...colours, { name: "", hex: "#888888" }]);
  }

  function removeColour(i: number) {
    setColours(colours.filter((_, idx) => idx !== i));
  }

  function updateColour(i: number, field: "name" | "hex", value: string) {
    setColours(colours.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  function cancel() {
    // Reset to initial values
    setName(initialCustomName ?? "");
    setNotes(initialNotes ?? "");
    setColours(initialColors.map((c, i) => ({ name: c, hex: initialColorHexes[i] ?? "#888888" })));
    setError(null);
    setOpen(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const validColours = colours.filter((c) => c.name.trim());
      const res = await fetch(`/api/wardrobe/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customName: name.trim() || null,
          notes: notes.trim() || null,
          colors: validColours.map((c) => c.name.trim()),
          colorHexes: validColours.map((c) => c.hex),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-neutral-400 underline text-left"
      >
        Edit details
      </button>
    );
  }

  return (
    <div className="bg-neutral-900 rounded-2xl p-4 flex flex-col gap-5">
      <h2 className="text-sm font-semibold text-neutral-200">Edit details</h2>

      {/* Name */}
      <div>
        <label className="text-xs uppercase tracking-widest text-neutral-500 block mb-2">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={aiName}
          maxLength={100}
          className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600"
        />
        {name.trim() && name.trim() !== aiName && (
          <p className="text-xs text-neutral-600 mt-1.5">AI name: {aiName}</p>
        )}
      </div>

      {/* Style notes */}
      <div>
        <label className="text-xs uppercase tracking-widest text-neutral-500 block mb-2">
          Style notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe this item…"
          rows={4}
          maxLength={2000}
          className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 resize-none focus:outline-none focus:ring-2 focus:ring-neutral-600"
        />
      </div>

      {/* Colours */}
      <div>
        <label className="text-xs uppercase tracking-widest text-neutral-500 block mb-2">
          Colours
        </label>
        <div className="flex flex-col gap-2">
          {colours.map((colour, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="color"
                  value={colour.hex}
                  onChange={(e) => updateColour(i, "hex", e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  aria-label="Pick colour"
                />
                <div
                  className="w-9 h-9 rounded-lg border border-neutral-700 flex-shrink-0"
                  style={{ backgroundColor: colour.hex }}
                />
              </div>
              <input
                type="text"
                value={colour.name}
                onChange={(e) => updateColour(i, "name", e.target.value)}
                placeholder="Colour name"
                maxLength={50}
                className="flex-1 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600"
              />
              <button
                type="button"
                onClick={() => removeColour(i)}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-neutral-600 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                aria-label="Remove colour"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>
          ))}
          {colours.length < 8 && (
            <button
              type="button"
              onClick={addColour}
              className="text-xs text-neutral-500 underline text-left mt-1"
            >
              + Add colour
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-xl bg-neutral-100 text-neutral-900 py-2.5 text-sm font-medium transition hover:bg-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
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
