import { ItemCard } from "./item-card";

interface Item {
  id: string;
  name: string;
  customName?: string | null;
  category: string;
  thumbnailPath?: string | null;
  imagePath: string;
  colorHexes: unknown;
}

interface Props {
  items: Item[];
}

export function ItemGrid({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <p className="text-neutral-400 text-sm">Your wardrobe is empty.</p>
        <p className="text-neutral-600 text-xs mt-1">Tap + to add your first item.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-6">
      {items.map((item, i) => (
        <ItemCard
          key={item.id}
          id={item.id}
          name={item.name}
          customName={item.customName}
          category={item.category}
          thumbnailPath={item.thumbnailPath}
          imagePath={item.imagePath}
          colorHexes={item.colorHexes as string[]}
          priority={i < 2}
        />
      ))}
    </div>
  );
}
