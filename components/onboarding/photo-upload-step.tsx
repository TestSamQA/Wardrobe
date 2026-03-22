"use client";

import { useRef, useState } from "react";

export interface PhotoAnalysisResult {
  season: string;
  confidence: "high" | "medium" | "low";
  skinTone: string;
  hairColor: string;
  eyeColor: string;
  reasoning: string;
  alternativeSeasons: string[];
  selfieImagePath: string;
}

interface Props {
  onResult: (result: PhotoAnalysisResult) => void;
  onManual: () => void;
}

export function PhotoUploadStep({ onResult, onManual }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleAnalyse() {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/onboarding/analyze-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      onResult(data as PhotoAnalysisResult);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center px-6 py-8 gap-6 max-w-sm mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-50">Find your colour season</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Take or upload a selfie in natural light. AI will analyse your skin, hair, and eye tones.
        </p>
      </div>

      {/* Photo preview / upload area */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-48 h-48 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-dashed border-neutral-700 flex items-center justify-center hover:border-neutral-500 transition"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selfie preview" className="w-full h-full object-cover" />
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
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview && (
        <button
          type="button"
          onClick={() => { setPreview(null); setFile(null); }}
          className="text-xs text-neutral-500 underline -mt-3"
        >
          Remove photo
        </button>
      )}

      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      <button
        type="button"
        onClick={handleAnalyse}
        disabled={!file || loading}
        suppressHydrationWarning
        className="w-full rounded-xl bg-neutral-50 text-neutral-950 py-3 text-sm font-semibold transition hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analysing your colours…
          </span>
        ) : "Analyse my colours"}
      </button>

      <button
        type="button"
        onClick={onManual}
        className="text-sm text-neutral-400 underline"
      >
        Enter my features manually instead
      </button>
    </div>
  );
}
