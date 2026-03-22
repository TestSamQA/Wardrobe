"use client";

import { useState } from "react";
import { COLOR_SEASONS } from "@/lib/color-seasons";
import type { ColorSeason } from "@/app/generated/prisma/client";

const ALL_SEASONS = Object.keys(COLOR_SEASONS) as ColorSeason[];

interface AnalysisResult {
  season: ColorSeason;
  confidence?: "high" | "medium" | "low";
  skinTone?: string;
  hairColor?: string;
  eyeColor?: string;
  reasoning?: string;
  selfieImagePath?: string;
}

interface Props {
  result: AnalysisResult;
  onConfirm: (season: ColorSeason, selfieImagePath?: string) => void;
  onManual: () => void;
}

export function ColorSeasonResult({ result, onConfirm, onManual }: Props) {
  const [selectedSeason, setSelectedSeason] = useState<ColorSeason>(result.season);
  const seasonData = COLOR_SEASONS[selectedSeason];
  const isOverridden = selectedSeason !== result.season;

  return (
    <div className="flex flex-col px-6 py-8 gap-6 max-w-sm mx-auto">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-1">Your colour season</p>
        <h1 className="text-3xl font-semibold text-neutral-50">{seasonData.label}</h1>
        <p className="mt-2 text-sm text-neutral-400">{seasonData.description}</p>
      </div>

      {/* Palette swatches */}
      <div className="flex justify-center gap-2">
        {seasonData.palette.map((hex) => (
          <div
            key={hex}
            className="w-9 h-9 rounded-full border border-neutral-800 shadow-sm flex-shrink-0"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>

      {/* AI reasoning — only show if not manually overridden */}
      {result.reasoning && !isOverridden && (
        <div className="bg-neutral-900 rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Analysis</p>
          <p className="text-sm text-neutral-300 leading-relaxed">{result.reasoning}</p>
          {result.confidence && (
            <p className="mt-2 text-xs text-neutral-500">
              Confidence: <span className="capitalize">{result.confidence}</span>
            </p>
          )}
        </div>
      )}

      {/* Power colors */}
      <div>
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Your best colours</p>
        <div className="flex flex-wrap gap-2">
          {seasonData.powerColors.map((c) => (
            <span key={c} className="text-xs bg-neutral-900 text-neutral-300 rounded-full px-3 py-1">{c}</span>
          ))}
        </div>
      </div>

      {/* Colors to avoid */}
      <div>
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Colours to avoid</p>
        <div className="flex flex-wrap gap-2">
          {seasonData.colorsToAvoid.map((c) => (
            <span key={c} className="text-xs bg-neutral-900 text-red-400 rounded-full px-3 py-1">{c}</span>
          ))}
        </div>
      </div>

      {/* Season override dropdown */}
      <div>
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Not right? Change season</p>
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value as ColorSeason)}
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-600"
        >
          {ALL_SEASONS.map((s) => (
            <option key={s} value={s}>{COLOR_SEASONS[s].label}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => onConfirm(selectedSeason, result.selfieImagePath)}
        className="w-full rounded-xl bg-neutral-50 text-neutral-950 py-3 text-sm font-semibold transition hover:bg-neutral-200"
      >
        This is my season — continue
      </button>

      {result.reasoning && (
        <button
          type="button"
          onClick={onManual}
          className="text-sm text-neutral-400 underline text-center"
        >
          Determine from features instead
        </button>
      )}
    </div>
  );
}
