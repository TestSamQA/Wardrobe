"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "TOPS", label: "Tops" },
  { value: "BOTTOMS", label: "Bottoms" },
  { value: "OUTERWEAR", label: "Outerwear" },
  { value: "FOOTWEAR", label: "Footwear" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "BAGS", label: "Bags" },
  { value: "HEADWEAR", label: "Headwear" },
  { value: "FULL_OUTFIT", label: "Full Outfit" },
];

interface Props {
  activeCategory: string;
}

export function FilterBar({ activeCategory }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setCategory(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("category", value);
    } else {
      params.delete("category");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          type="button"
          onClick={() => setCategory(cat.value)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition ${
            activeCategory === cat.value
              ? "bg-accent text-accent-fg"
              : "bg-neutral-900 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
