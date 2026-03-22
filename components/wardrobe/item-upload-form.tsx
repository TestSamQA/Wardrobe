"use client";

import { useRef, useState } from "react";

type UploadStep = "idle" | "uploading" | "thumbnail" | "analysing" | "saving" | "done" | "error";

const STEP_LABELS: Partial<Record<UploadStep, string>> = {
  uploading: "Uploading image…",
  thumbnail: "Generating thumbnail…",
  analysing: "Analysing item with AI…",
  saving: "Saving to your wardrobe…",
};

export function ItemUploadForm() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [doneItemId, setDoneItemId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setStep("idle");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleSubmit() {
    if (!file) return;
    setStep("uploading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/wardrobe", { method: "POST", body: formData });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Upload failed. Please try again.");
        setStep("error");
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
            setError(data.error);
            setStep("error");
            return;
          }
          if (data.step === "done") {
            setDoneItemId(data.item.id);
            setStep("done");
            return;
          }
          setStep(data.step as UploadStep);
        }
      }
    } catch {
      setError("Network error. Please check your connection.");
      setStep("error");
    }
  }

  const isProcessing = !["idle", "done", "error"].includes(step);

  // ── Done state ────────────────────────────────────────────────────────────
  if (step === "done" && doneItemId) {
    return (
      <div className="flex flex-col items-center gap-6 px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center">
          <svg className="w-7 h-7 text-neutral-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-neutral-50">Item added!</p>
          <p className="text-sm text-neutral-400 mt-1">Analysed and saved to your wardrobe.</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a
            href={`/wardrobe/${doneItemId}`}
            className="w-full rounded-xl bg-neutral-50 text-neutral-950 py-3 text-sm font-semibold text-center transition hover:bg-neutral-200"
          >
            View item
          </a>
          <button
            type="button"
            onClick={() => { setPreview(null); setFile(null); setStep("idle"); setDoneItemId(null); }}
            className="text-sm text-neutral-400 underline"
          >
            Add another item
          </button>
        </div>
      </div>
    );
  }

  // ── Upload form ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center px-6 py-8 gap-6 max-w-sm mx-auto">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-neutral-50">Add a wardrobe item</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Photo your item and AI will extract all the details.
        </p>
      </div>

      {/* Photo area */}
      <button
        type="button"
        onClick={() => !isProcessing && inputRef.current?.click()}
        className="relative w-56 h-56 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-dashed border-neutral-700 flex items-center justify-center hover:border-neutral-500 transition disabled:pointer-events-none"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Item preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-500">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium">Tap to add photo</span>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview && !isProcessing && (
        <button
          type="button"
          onClick={() => { setPreview(null); setFile(null); }}
          className="text-xs text-neutral-500 underline -mt-3"
        >
          Remove photo
        </button>
      )}

      {/* Progress */}
      {isProcessing && (
        <div className="flex items-center gap-3 text-sm text-neutral-300">
          <svg className="animate-spin w-4 h-4 flex-shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {STEP_LABELS[step] ?? "Processing…"}
        </div>
      )}

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!file || isProcessing}
        suppressHydrationWarning
        className="w-full rounded-xl bg-neutral-50 text-neutral-950 py-3 text-sm font-semibold transition hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Adding item…" : "Add to wardrobe"}
      </button>
    </div>
  );
}
