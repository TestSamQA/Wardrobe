"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────

interface WardrobeItem {
  id: string;
  name: string;
  customName?: string | null;
  category: string;
  thumbnailPath?: string | null;
  imagePath: string;
  colorHexes: string[];
}

type Mode = "manual" | "ai";
type AiStep = "idle" | "thinking" | "done" | "error";

// ─── Helpers ────────────────────────────────────────────────────────────────

function itemImageUrl(item: WardrobeItem): string {
  const bucket = item.thumbnailPath ? "wardrobe-thumbnails" : "wardrobe-images";
  const key = item.thumbnailPath ?? item.imagePath;
  return `/api/images/${bucket}/${key}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  HEADWEAR: "Headwear",
  OUTERWEAR: "Outerwear",
  TOPS: "Tops",
  BOTTOMS: "Bottoms",
  FOOTWEAR: "Footwear",
  ACCESSORIES: "Accessories",
  BAGS: "Bags",
  FULL_OUTFIT: "Full Outfit",
};

// ─── Selectable item card ────────────────────────────────────────────────────

function SelectableItemCard({
  item,
  selected,
  onToggle,
}: {
  item: WardrobeItem;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const displayName = item.customName ?? item.name;
  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      className="relative flex flex-col gap-1.5 text-left focus:outline-none"
    >
      <div
        className={`relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-900 border-2 transition ${
          selected ? "border-neutral-100" : "border-transparent"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={itemImageUrl(item)}
          alt={displayName}
          className="w-full h-full object-cover"
        />
        {selected && (
          <div className="absolute inset-0 bg-neutral-950/40 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-neutral-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-neutral-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
      <div className="px-0.5">
        <p className="text-xs font-medium text-neutral-100 truncate leading-tight">{displayName}</p>
        <p className="text-xs text-neutral-500">{CATEGORY_LABELS[item.category] ?? item.category}</p>
      </div>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function OutfitBuilder() {
  const router = useRouter();

  // Wardrobe items loaded from API
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Builder state
  const [mode, setMode] = useState<Mode>("manual");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("");

  // AI-specific state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStep, setAiStep] = useState<AiStep>("idle");
  const [aiRationale, setAiRationale] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load wardrobe items
  useEffect(() => {
    fetch("/api/wardrobe")
      .then((r) => r.json())
      .then((data: WardrobeItem[]) => {
        setItems(data);
        setItemsLoading(false);
      })
      .catch(() => {
        setItemsError("Failed to load wardrobe. Please refresh.");
        setItemsLoading(false);
      });
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── AI generation ──────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setAiStep("thinking");
    setAiError(null);
    setAiRationale(null);
    setSelectedIds(new Set());
    setName("");

    try {
      const res = await fetch("/api/outfits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setAiError(data.error ?? "Generation failed. Please try again.");
        setAiStep("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.step === "error") {
            setAiError(data.error);
            setAiStep("error");
            return;
          }

          if (data.step === "done") {
            const result: { itemIds: string[]; name: string; rationale: string } = data.result;
            setSelectedIds(new Set(result.itemIds));
            setName(result.name);
            setAiRationale(result.rationale);
            setAiStep("done");
            return;
          }
        }
      }
    } catch {
      setAiError("Network error. Please check your connection.");
      setAiStep("error");
    }
  }

  // ── Save outfit ────────────────────────────────────────────────────────────

  const [saveStep, setSaveStep] = useState<"saving" | "generating" | null>(null);

  async function handleSave() {
    if (!name.trim() || selectedIds.size === 0) return;
    setSaving(true);
    setSaveStep("saving");
    setSaveError(null);

    try {
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: Array.from(selectedIds),
          name: name.trim(),
          occasion: occasion.trim() || null,
          createdBy: mode === "ai" ? "AI_GENERATED" : "MANUAL",
          aiRationale: mode === "ai" ? aiRationale : null,
          aiPrompt: mode === "ai" ? aiPrompt : null,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? "Failed to save outfit.");
        setSaving(false);
        setSaveStep(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.step === "saving" || data.step === "generating") {
            setSaveStep(data.step);
          } else if (data.step === "done") {
            router.push(`/outfits/${data.outfitId}`);
            return;
          } else if (data.step === "error") {
            // If the outfit was saved but flatlay failed, still navigate to it
            if (data.outfitId) {
              router.push(`/outfits/${data.outfitId}`);
            } else {
              setSaveError(data.error ?? "Something went wrong.");
              setSaving(false);
              setSaveStep(null);
            }
            return;
          }
        }
      }
    } catch {
      setSaveError("Network error. Please try again.");
      setSaving(false);
      setSaveStep(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const canSave = name.trim().length > 0 && selectedIds.size > 0 && !saving;

  return (
    <div className="flex flex-col min-h-0">
      {/* Mode tabs */}
      <div className="flex gap-1 mx-4 mt-4 p-1 bg-neutral-900 rounded-xl">
        {(["manual", "ai"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              mode === m
                ? "bg-neutral-800 text-neutral-50"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {m === "manual" ? "Manual" : "AI Suggest"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4">
        {/* Outfit name */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">Outfit name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Smart Weekend Look"
            maxLength={100}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
          />
        </div>

        {/* Occasion */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Occasion <span className="text-neutral-600">(optional)</span>
          </label>
          <input
            type="text"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="e.g. Weekend brunch, Office meeting…"
            maxLength={200}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
          />
        </div>

        {/* AI prompt */}
        {mode === "ai" && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Describe the occasion or look you want
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Smart casual for a first date at a wine bar"
                rows={3}
                maxLength={500}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!aiPrompt.trim() || aiStep === "thinking"}
              className="w-full rounded-xl bg-neutral-800 text-neutral-100 py-2.5 text-sm font-medium transition hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {aiStep === "thinking" ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analysing your wardrobe…
                </>
              ) : (
                "Generate outfit"
              )}
            </button>
            {aiError && <p className="text-sm text-red-400">{aiError}</p>}
            {aiStep === "done" && aiRationale && (
              <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3.5">
                <p className="text-xs font-medium text-neutral-400 mb-1">AI rationale</p>
                <p className="text-sm text-neutral-300 leading-relaxed">{aiRationale}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected items strip */}
      {selectedIds.size > 0 && (
        <div className="mt-4 px-4">
          <p className="text-xs font-medium text-neutral-400 mb-2">
            {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {Array.from(selectedIds).map((id) => {
              const item = items.find((i) => i.id === id);
              if (!item) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleItem(id)}
                  className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-700"
                  aria-label={`Remove ${item.customName ?? item.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={itemImageUrl(item)}
                    alt={item.customName ?? item.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-neutral-950/80 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Item grid heading */}
      <div className="mt-5 px-4">
        <p className="text-xs font-medium text-neutral-400">
          {mode === "ai" && aiStep === "done"
            ? "AI selected these items — tap to adjust"
            : "Tap items to select"}
        </p>
      </div>

      {/* Item picker grid */}
      <div className="px-4 pt-3 pb-4">
        {itemsLoading ? (
          <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
            Loading wardrobe…
          </div>
        ) : itemsError ? (
          <p className="text-sm text-red-400 py-8 text-center">{itemsError}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-500 py-8 text-center">
            No wardrobe items yet. Add some items first.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <SelectableItemCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggle={toggleItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="sticky bottom-20 px-4 pb-4 bg-gradient-to-t from-neutral-950 pt-6">
        {saveError && <p className="text-sm text-red-400 text-center mb-3">{saveError}</p>}
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-xl bg-neutral-50 text-neutral-950 py-3 text-sm font-semibold transition hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {saveStep === "generating" ? "Creating flatlay image…" : "Saving outfit…"}
            </>
          ) : (
            "Create outfit"
          )}
        </button>
      </div>
    </div>
  );
}
