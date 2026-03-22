import { TopBar } from "@/components/layout/top-bar";
import { ItemUploadForm } from "@/components/wardrobe/item-upload-form";

export default function AddWardrobeItemPage() {
  return (
    <div>
      <TopBar title="Add Item" back={{ href: "/wardrobe" }} />
      <ItemUploadForm />
    </div>
  );
}
