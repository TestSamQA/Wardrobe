import { OutfitCard } from "./outfit-card";

interface Outfit {
  id: string;
  name: string;
  occasion?: string | null;
  flatlayImagePath?: string | null;
  _count: { items: number };
}

interface Props {
  outfits: Outfit[];
}

export function OutfitGrid({ outfits }: Props) {
  if (outfits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-neutral-900 flex items-center justify-center">
          <svg className="w-7 h-7 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-300">No outfits yet</p>
          <p className="text-xs text-neutral-500 mt-1">Create your first outfit to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 px-4 py-4">
      {outfits.map((outfit, i) => (
        <OutfitCard
          key={outfit.id}
          id={outfit.id}
          name={outfit.name}
          occasion={outfit.occasion}
          flatlayImagePath={outfit.flatlayImagePath}
          itemCount={outfit._count.items}
          priority={i < 2}
        />
      ))}
    </div>
  );
}
