import { TopBar } from "@/components/layout/top-bar";

export default function WardrobeLoading() {
  return (
    <div>
      <TopBar title="Wardrobe" />
      {/* filter bar skeleton */}
      <div className="h-10 mx-4 mt-3 mb-1 bg-neutral-900 rounded-xl animate-pulse" />
      {/* grid skeleton */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-neutral-900 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
