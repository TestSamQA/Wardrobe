"use client";

import { useState } from "react";
import { COLOR_SEASONS } from "@/lib/color-seasons";
import type { ColorSeason } from "@/app/generated/prisma/client";

// Deterministic season mapping. Key: `${undertone}-${depth}-${hair}`
const SEASON_MAP: Record<string, ColorSeason> = {
  "warm-light-light-cool": "LIGHT_SPRING",
  "warm-light-light-warm": "LIGHT_SPRING",
  "warm-light-medium-warm": "WARM_SPRING",
  "warm-light-deep": "TRUE_SPRING",
  "warm-medium-light-warm": "WARM_SPRING",
  "warm-medium-medium-warm": "WARM_AUTUMN",
  "warm-medium-deep": "TRUE_AUTUMN",
  "warm-deep-light-warm": "DEEP_AUTUMN",
  "warm-deep-medium-warm": "DEEP_AUTUMN",
  "warm-deep-deep": "DEEP_AUTUMN",
  "cool-light-light-cool": "LIGHT_SUMMER",
  "cool-light-light-warm": "LIGHT_SUMMER",
  "cool-light-medium-warm": "TRUE_SUMMER",
  "cool-light-deep": "TRUE_SUMMER",
  "cool-medium-light-cool": "TRUE_SUMMER",
  "cool-medium-light-warm": "SOFT_SUMMER",
  "cool-medium-medium-warm": "SOFT_SUMMER",
  "cool-medium-deep": "SOFT_SUMMER",
  "cool-deep-light-cool": "DEEP_WINTER",
  "cool-deep-light-warm": "TRUE_WINTER",
  "cool-deep-medium-warm": "TRUE_WINTER",
  "cool-deep-deep": "DEEP_WINTER",
  "neutral-light-light-cool": "LIGHT_SUMMER",
  "neutral-light-light-warm": "LIGHT_SPRING",
  "neutral-light-medium-warm": "TRUE_SPRING",
  "neutral-light-deep": "CLEAR_SPRING",
  "neutral-medium-light-cool": "SOFT_SUMMER",
  "neutral-medium-light-warm": "SOFT_AUTUMN",
  "neutral-medium-medium-warm": "SOFT_AUTUMN",
  "neutral-medium-deep": "TRUE_AUTUMN",
  "neutral-deep-light-cool": "CLEAR_WINTER",
  "neutral-deep-light-warm": "CLEAR_SPRING",
  "neutral-deep-medium-warm": "TRUE_WINTER",
  "neutral-deep-deep": "DEEP_WINTER",
};

const UNDERTONE_OPTIONS = [
  { value: "warm", label: "Warm", hint: "Peachy, golden, or bronze skin tones" },
  { value: "cool", label: "Cool", hint: "Pink, rosy, or blue-toned skin" },
  { value: "neutral", label: "Neutral / Olive", hint: "Neither clearly warm nor cool" },
];

const DEPTH_OPTIONS = [
  { value: "light", label: "Light", hint: "Light hair, light eyes, fair-light skin" },
  { value: "medium", label: "Medium", hint: "Medium depth overall" },
  { value: "deep", label: "Deep", hint: "Dark hair, dark eyes, or deep skin tone" },
];

const HAIR_OPTIONS = [
  { value: "light-cool", label: "Platinum / Ash blonde / Grey or white" },
  { value: "light-warm", label: "Golden blonde / Strawberry blonde" },
  { value: "medium-warm", label: "Auburn / Red / Warm brown / Chestnut" },
  { value: "deep", label: "Dark brown / Black (any undertone)" },
];

const EYE_OPTIONS = [
  { value: "blue-grey", label: "Blue or Grey" },
  { value: "green", label: "Green or Grey-green" },
  { value: "hazel", label: "Hazel or Amber" },
  { value: "brown-medium", label: "Brown (light to medium)" },
  { value: "brown-dark", label: "Brown (dark)" },
];

export interface ManualResult {
  season: ColorSeason;
  skinTone: string;
  hairColor: string;
  eyeColor: string;
}

interface Props {
  onResult: (result: ManualResult) => void;
  onBack: () => void;
}

function deriveSeasonFromInputs(undertone: string, depth: string, hair: string): ColorSeason {
  const key = `${undertone}-${depth}-${hair}`;
  return SEASON_MAP[key] ?? "TRUE_AUTUMN";
}

function SelectCard({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col text-left rounded-xl px-4 py-3 border transition ${
        selected
          ? "border-neutral-200 bg-neutral-800 text-neutral-50"
          : "border-neutral-800 bg-neutral-900 text-neutral-300"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="text-xs text-neutral-500 mt-0.5">{hint}</span>}
    </button>
  );
}

export function ManualInputStep({ onResult, onBack }: Props) {
  const [undertone, setUndertone] = useState("");
  const [depth, setDepth] = useState("");
  const [hair, setHair] = useState("");
  const [eyes, setEyes] = useState("");

  const isComplete = !!(undertone && depth && hair && eyes);
  const derivedSeason = isComplete ? deriveSeasonFromInputs(undertone, depth, hair) : null;
  const seasonData = derivedSeason ? COLOR_SEASONS[derivedSeason] : null;

  function handleSubmit() {
    if (!isComplete || !derivedSeason) return;
    onResult({
      season: derivedSeason,
      skinTone: `${UNDERTONE_OPTIONS.find((u) => u.value === undertone)?.label ?? undertone}, ${DEPTH_OPTIONS.find((d) => d.value === depth)?.label ?? depth}`,
      hairColor: HAIR_OPTIONS.find((h) => h.value === hair)?.label ?? hair,
      eyeColor: EYE_OPTIONS.find((e) => e.value === eyes)?.label ?? eyes,
    });
  }

  return (
    <div className="flex flex-col px-6 py-8 gap-6 max-w-sm mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-50">Describe your features</h1>
        <p className="mt-2 text-sm text-neutral-400">
          We&apos;ll suggest your colour season based on your natural colouring.
        </p>
      </div>

      {/* Skin undertone */}
      <div>
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-3">Skin undertone</p>
        <div className="flex flex-col gap-2">
          {UNDERTONE_OPTIONS.map((o) => (
            <SelectCard
              key={o.value}
              selected={undertone === o.value}
              onClick={() => setUndertone(o.value)}
              label={o.label}
              hint={o.hint}
            />
          ))}
        </div>
      </div>

      {/* Overall depth */}
      <div>
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-3">Overall depth</p>
        <div className="flex flex-col gap-2">
          {DEPTH_OPTIONS.map((o) => (
            <SelectCard
              key={o.value}
              selected={depth === o.value}
              onClick={() => setDepth(o.value)}
              label={o.label}
              hint={o.hint}
            />
          ))}
        </div>
      </div>

      {/* Hair colour */}
      <div>
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-3">Natural hair colour</p>
        <div className="flex flex-col gap-2">
          {HAIR_OPTIONS.map((o) => (
            <SelectCard
              key={o.value}
              selected={hair === o.value}
              onClick={() => setHair(o.value)}
              label={o.label}
            />
          ))}
        </div>
      </div>

      {/* Eye colour */}
      <div>
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-3">Eye colour</p>
        <div className="flex flex-col gap-2">
          {EYE_OPTIONS.map((o) => (
            <SelectCard
              key={o.value}
              selected={eyes === o.value}
              onClick={() => setEyes(o.value)}
              label={o.label}
            />
          ))}
        </div>
      </div>

      {/* Live season preview */}
      {seasonData && (
        <div className="bg-neutral-900 rounded-xl p-4">
          <p className="text-xs text-neutral-500 mb-1">Suggested season</p>
          <p className="text-lg font-semibold text-neutral-50">{seasonData.label}</p>
          <div className="flex gap-2 mt-2">
            {seasonData.palette.map((hex) => (
              <div
                key={hex}
                className="w-6 h-6 rounded-full border border-neutral-800"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isComplete}
        className="w-full rounded-xl bg-neutral-50 text-neutral-950 py-3 text-sm font-semibold transition hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        See my season
      </button>

      <button
        type="button"
        onClick={onBack}
        className="text-sm text-neutral-400 underline text-center"
      >
        Back to photo upload
      </button>
    </div>
  );
}
