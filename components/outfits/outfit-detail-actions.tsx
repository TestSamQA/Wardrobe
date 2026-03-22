"use client";

import { useState } from "react";

interface Props {
  outfitId: string;
}

export function OutfitDetailActions({ outfitId }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteOutfit() {
    setDeleting(true);
    try {
      await fetch(`/api/outfits/${outfitId}`, { method: "DELETE" });
      window.location.href = "/outfits";
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (!showDeleteConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="text-sm text-red-500 underline text-left"
      >
        Delete outfit
      </button>
    );
  }

  return (
    <div className="bg-neutral-900 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-sm text-neutral-300">Delete this outfit?</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={deleteOutfit}
          disabled={deleting}
          className="flex-1 rounded-lg bg-red-600 text-white py-2 text-sm font-medium transition hover:bg-red-500 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Yes, delete"}
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
  );
}
