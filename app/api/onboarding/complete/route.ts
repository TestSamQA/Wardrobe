export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COLOR_SEASONS } from "@/lib/color-seasons";
import { NextRequest, NextResponse } from "next/server";
import type { ColorSeason, AnalysisMethod } from "@/app/generated/prisma/client";
import { z } from "zod";

const VALID_SEASONS = [
  "LIGHT_SPRING", "WARM_SPRING", "TRUE_SPRING", "CLEAR_SPRING",
  "LIGHT_SUMMER", "TRUE_SUMMER", "SOFT_SUMMER",
  "TRUE_AUTUMN", "WARM_AUTUMN", "SOFT_AUTUMN", "DEEP_AUTUMN",
  "TRUE_WINTER", "DEEP_WINTER", "CLEAR_WINTER",
] as const;

const CompleteSchema = z.object({
  colorSeason: z.enum(VALID_SEASONS),
  analysisMethod: z.enum(["PHOTO", "MANUAL"]),
  selfieImagePath: z.string().optional(),
  skinTone: z.string().optional(),
  hairColor: z.string().optional(),
  eyeColor: z.string().optional(),
  seasonNotes: z.string().optional(),
  styleArchetype: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CompleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    colorSeason, analysisMethod, selfieImagePath,
    skinTone, hairColor, eyeColor, seasonNotes, styleArchetype,
  } = parsed.data;

  const seasonData = COLOR_SEASONS[colorSeason as ColorSeason];

  await prisma.$transaction([
    prisma.styleProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        colorSeason: colorSeason as ColorSeason,
        analysisMethod: analysisMethod as AnalysisMethod,
        selfieImagePath,
        skinTone,
        hairColor,
        eyeColor,
        seasonNotes,
        styleArchetype,
        powerColors: seasonData.powerColors,
        neutralColors: seasonData.neutralColors,
        colorsToAvoid: seasonData.colorsToAvoid,
      },
      update: {
        colorSeason: colorSeason as ColorSeason,
        analysisMethod: analysisMethod as AnalysisMethod,
        selfieImagePath,
        skinTone,
        hairColor,
        eyeColor,
        seasonNotes,
        styleArchetype,
        powerColors: seasonData.powerColors,
        neutralColors: seasonData.neutralColors,
        colorsToAvoid: seasonData.colorsToAvoid,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingStatus: "COMPLETE" },
    }),
  ]);

  return NextResponse.json({ success: true });
}
