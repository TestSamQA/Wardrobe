import { TopBar } from "@/components/layout/top-bar";
import { OutfitBuilder } from "@/components/outfits/outfit-builder";

export default function CreateOutfitPage() {
  return (
    <div>
      <TopBar title="Create outfit" back={{ href: "/outfits" }} />
      <OutfitBuilder />
    </div>
  );
}
