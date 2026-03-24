"use client";

import { useState } from "react";

interface Props {
  itemId: string;
  initialUserNotes: string | null;
}

export function ItemDetailActions({ itemId, initialUserNotes }: Props) {
  const [notes, setNotes] = useState(initialUserNotes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function duplicateItem() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/wardrobe/${itemId}/duplicate`, { method: "POST" });
      if (res.ok) {
        const { id } = await res.json();
        window.location.href = `/wardrobe/${id}`;
      }
    } finally {
      setDuplicating(false);
    }
  }

  async function saveNotes() {
    setNotesSaving(true);
    setNotesSaved(false);
    try {
      await fetch(`/api/wardrobe/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userNotes: notes || null }),
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } finally {
      setNotesSaving(false);
    }
  }

  async function deleteItem() {
    setDeleting(true);
    try {
      await fetch(`/api/wardrobe/${itemId}`, { method: "DELETE" });
      window.location.href = "/wardrobe";
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Personal notes */}
      <div>
        <label className="text-xs uppercase tracking-widest text-neutral-500 block mb-2">
          Your notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
          placeholder="Add your own notes about this item…"
          rows={3}
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 resize-none focus:outline-none focus:ring-2 focus:ring-neutral-600"
        />
        <button
          type="button"
          onClick={saveNotes}
          disabled={notesSaving}
          className="mt-2 text-xs text-neutral-400 underline disabled:opacity-50"
        >
          {notesSaving ? "Saving…" : notesSaved ? "Saved ✓" : "Save notes"}
        </button>
      </div>

      {/* Duplicate */}
      <button
        type="button"
        onClick={duplicateItem}
        disabled={duplicating}
        className="text-sm text-neutral-400 underline text-left disabled:opacity-50"
      >
        {duplicating ? "Duplicating…" : "Duplicate in another colour"}
      </button>

      {/* Delete */}
      {!showDeleteConfirm ? (
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="text-sm text-red-500 underline text-left"
        >
          Remove from wardrobe
        </button>
      ) : (
        <div className="bg-neutral-900 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm text-neutral-300">Remove this item from your wardrobe?</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={deleteItem}
              disabled={deleting}
              className="flex-1 rounded-lg bg-red-600 text-white py-2 text-sm font-medium transition hover:bg-red-500 disabled:opacity-50"
            >
              {deleting ? "Removing…" : "Yes, remove"}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 rounded-lg bg-neutral-800 text-neutral-300 py-2 text-sm font-medium transition hover:bg-neutral-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
