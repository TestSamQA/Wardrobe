import { TopBar } from "@/components/layout/top-bar";

export default function ItemDetailLoading() {
  return (
    <div>
      <TopBar title="" back={{ href: "/wardrobe" }} />
      {/* image */}
      <div className="aspect-square w-full bg-neutral-900 animate-pulse" />
      <div className="p-4 flex flex-col gap-4">
        {/* title + category */}
        <div className="flex flex-col gap-2">
          <div className="h-5 w-2/3 bg-neutral-900 rounded animate-pulse" />
          <div className="h-3 w-1/3 bg-neutral-900 rounded animate-pulse" />
        </div>
        {/* colour chips */}
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-6 w-16 bg-neutral-900 rounded-full animate-pulse" />
          ))}
        </div>
        {/* metadata rows */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 bg-neutral-900 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}
