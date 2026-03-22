import { TopBar } from "@/components/layout/top-bar";

export default function OutfitsLoading() {
  return (
    <div>
      <TopBar title="Outfits" />
      <div className="grid grid-cols-2 gap-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-square bg-neutral-900 rounded-2xl animate-pulse" />
            <div className="h-3 w-3/4 bg-neutral-900 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-neutral-900 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
