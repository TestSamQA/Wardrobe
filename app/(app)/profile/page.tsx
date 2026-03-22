import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { COLOR_SEASONS, STYLE_ARCHETYPES } from "@/lib/color-seasons";
import type { ColorSeason } from "@/app/generated/prisma/client";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.styleProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return (
      <div>
        <TopBar title="Profile" />
        <div className="flex items-center justify-center h-64 text-neutral-500 text-sm">
          Complete onboarding to set up your profile.
        </div>
      </div>
    );
  }

  const seasonData = COLOR_SEASONS[profile.colorSeason as ColorSeason];
  const archetype = STYLE_ARCHETYPES.find((a) => a.id === profile.styleArchetype);
  const powerColors = profile.powerColors as string[];
  const neutralColors = profile.neutralColors as string[];
  const colorsToAvoid = profile.colorsToAvoid as string[];

  return (
    <div>
      <TopBar title="Profile" />
      <div className="px-4 py-6 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Colour season card */}
        <div className="bg-neutral-900 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-neutral-500 mb-1">Colour season</p>
          <h2 className="text-2xl font-semibold text-neutral-50">{seasonData.label}</h2>
          <p className="text-sm text-neutral-400 mt-1 leading-relaxed">{seasonData.description}</p>
          <div className="flex gap-2 mt-4">
            {seasonData.palette.map((hex) => (
              <div
                key={hex}
                className="w-9 h-9 rounded-full border border-neutral-800 shadow-sm flex-shrink-0"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          {profile.skinTone && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-neutral-400">
              {profile.skinTone && <div><span className="text-neutral-600 block mb-0.5">Skin</span>{profile.skinTone}</div>}
              {profile.hairColor && <div><span className="text-neutral-600 block mb-0.5">Hair</span>{profile.hairColor}</div>}
              {profile.eyeColor && <div><span className="text-neutral-600 block mb-0.5">Eyes</span>{profile.eyeColor}</div>}
            </div>
          )}
        </div>

        {/* Style archetype */}
        {archetype && (
          <div className="bg-neutral-900 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-500 mb-3">Style archetype</p>
            <div className="flex items-start gap-3">
              <span className="text-3xl mt-0.5">{archetype.emoji}</span>
              <div>
                <p className="text-lg font-semibold text-neutral-50">{archetype.label}</p>
                <p className="text-sm text-neutral-400 mt-0.5">{archetype.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Colour palette */}
        <div className="bg-neutral-900 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-neutral-500 mb-3">Your best colours</p>
          <div className="flex flex-wrap gap-2">
            {powerColors.map((c) => (
              <span key={c} className="text-xs bg-neutral-800 text-neutral-300 rounded-full px-3 py-1">{c}</span>
            ))}
          </div>
          <p className="text-xs uppercase tracking-widest text-neutral-500 mt-4 mb-3">Neutrals</p>
          <div className="flex flex-wrap gap-2">
            {neutralColors.map((c) => (
              <span key={c} className="text-xs bg-neutral-800 text-neutral-300 rounded-full px-3 py-1">{c}</span>
            ))}
          </div>
          <p className="text-xs uppercase tracking-widest text-neutral-500 mt-4 mb-3">Colours to avoid</p>
          <div className="flex flex-wrap gap-2">
            {colorsToAvoid.map((c) => (
              <span key={c} className="text-xs bg-neutral-800 text-red-400 rounded-full px-3 py-1">{c}</span>
            ))}
          </div>
        </div>

        <p className="text-xs text-neutral-600 text-center pb-2">
          Analysed via {profile.analysisMethod === "PHOTO" ? "photo" : "manual input"} ·{" "}
          {new Date(profile.createdAt).toLocaleDateString()}
        </p>

      </div>
    </div>
  );
}
