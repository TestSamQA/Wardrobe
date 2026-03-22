"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { PhotoUploadStep, type PhotoAnalysisResult } from "@/components/onboarding/photo-upload-step";
import { ColorSeasonResult } from "@/components/onboarding/color-season-result";
import { ManualInputStep, type ManualResult } from "@/components/onboarding/manual-input-step";
import { StylePicker } from "@/components/onboarding/style-picker";
import type { ColorSeason } from "@/app/generated/prisma/client";
import type { StyleArchetypeId } from "@/lib/color-seasons";

type Step = "upload" | "result" | "manual" | "style";

interface SeasonState {
  season: ColorSeason;
  analysisMethod: "PHOTO" | "MANUAL";
  confidence?: string;
  skinTone?: string;
  hairColor?: string;
  eyeColor?: string;
  reasoning?: string;
  selfieImagePath?: string;
}

export default function OnboardingPhotoPage() {
  const [step, setStep] = useState<Step>("upload");
  const [seasonState, setSeasonState] = useState<SeasonState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { update: updateSession } = useSession();

  function handlePhotoResult(result: PhotoAnalysisResult) {
    setSeasonState({
      season: result.season as ColorSeason,
      analysisMethod: "PHOTO",
      confidence: result.confidence,
      skinTone: result.skinTone,
      hairColor: result.hairColor,
      eyeColor: result.eyeColor,
      reasoning: result.reasoning,
      selfieImagePath: result.selfieImagePath,
    });
    setStep("result");
  }

  function handleManualResult(result: ManualResult) {
    setSeasonState({
      season: result.season,
      analysisMethod: "MANUAL",
      skinTone: result.skinTone,
      hairColor: result.hairColor,
      eyeColor: result.eyeColor,
    });
    setStep("result");
  }

  function handleSeasonConfirm(season: ColorSeason, selfieImagePath?: string) {
    setSeasonState((prev) =>
      prev ? { ...prev, season, selfieImagePath: selfieImagePath ?? prev.selfieImagePath } : prev
    );
    setStep("style");
  }

  async function handleStyleSelect(archetypeId: StyleArchetypeId) {
    if (!seasonState) return;
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colorSeason: seasonState.season,
          analysisMethod: seasonState.analysisMethod,
          selfieImagePath: seasonState.selfieImagePath,
          skinTone: seasonState.skinTone,
          hairColor: seasonState.hairColor,
          eyeColor: seasonState.eyeColor,
          seasonNotes: seasonState.reasoning,
          styleArchetype: archetypeId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Refresh JWT so proxy.ts sees onboardingStatus = COMPLETE.
      // Use a hard navigation (not router.push) so the browser sends the
      // updated session cookie — client-side navigation can race the cookie write.
      await updateSession();
      window.location.href = "/wardrobe";
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full overflow-y-auto">
      {step === "upload" && (
        <PhotoUploadStep
          onResult={handlePhotoResult}
          onManual={() => setStep("manual")}
        />
      )}

      {step === "result" && seasonState && (
        <ColorSeasonResult
          result={{
            season: seasonState.season,
            confidence: seasonState.confidence as "high" | "medium" | "low" | undefined,
            skinTone: seasonState.skinTone,
            hairColor: seasonState.hairColor,
            eyeColor: seasonState.eyeColor,
            reasoning: seasonState.reasoning,
            selfieImagePath: seasonState.selfieImagePath,
          }}
          onConfirm={handleSeasonConfirm}
          onManual={() => setStep("manual")}
        />
      )}

      {step === "manual" && (
        <ManualInputStep
          onResult={handleManualResult}
          onBack={() => setStep("upload")}
        />
      )}

      {step === "style" && (
        <div>
          {saveError && (
            <p className="text-sm text-red-400 text-center px-6 pt-6">{saveError}</p>
          )}
          <StylePicker onSelect={handleStyleSelect} loading={saving} />
        </div>
      )}
    </div>
  );
}
