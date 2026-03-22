import type { ColorSeason } from "@/app/generated/prisma/client";

export interface SeasonData {
  name: string;
  label: string;
  description: string;
  characteristics: string;
  powerColors: string[];
  neutralColors: string[];
  colorsToAvoid: string[];
  palette: string[]; // Representative hex colors for UI display
}

export const COLOR_SEASONS: Record<ColorSeason, SeasonData> = {
  LIGHT_SPRING: {
    name: "LIGHT_SPRING",
    label: "Light Spring",
    description: "Delicate, warm, and light. The most diluted of the Spring seasons.",
    characteristics: "Light blonde or strawberry blonde hair, light blue or green eyes, fair warm skin with peachy undertones.",
    powerColors: ["Peach", "Warm Ivory", "Light Coral", "Aqua", "Warm Pink", "Butter Yellow"],
    neutralColors: ["Ivory", "Light Camel", "Warm Beige", "Soft White"],
    colorsToAvoid: ["Black", "Pure White", "Dark Navy", "Cool Grey", "Burgundy"],
    palette: ["#F5CBA7", "#FDEBD0", "#F8C471", "#85C1E9", "#F1948A", "#A9DFBF"],
  },
  LIGHT_SUMMER: {
    name: "LIGHT_SUMMER",
    label: "Light Summer",
    description: "Delicate, cool, and light. The most diluted of the Summer seasons.",
    characteristics: "Light ash blonde or light ash brown hair, light blue or grey eyes, fair cool or neutral skin.",
    powerColors: ["Powder Blue", "Soft Lavender", "Rose Pink", "Mint", "Soft Periwinkle", "Light Mauve"],
    neutralColors: ["Soft White", "Light Grey", "Rose Beige", "Powder Pink"],
    colorsToAvoid: ["Black", "Orange", "Yellow-Green", "Rust", "Dark Brown"],
    palette: ["#AED6F1", "#D7BDE2", "#F8B4C8", "#A8DFAF", "#C3B1E1", "#E8B4B8"],
  },
  CLEAR_SPRING: {
    name: "CLEAR_SPRING",
    label: "Clear Spring",
    description: "Bright, warm, and clear. High contrast with vivid warm tones.",
    characteristics: "Clear warm complexion, bright eyes (blue, green, or hazel), dark or medium warm hair.",
    powerColors: ["Warm Red", "Bright Coral", "Clear Turquoise", "Bright Yellow", "Hot Pink", "Emerald Green"],
    neutralColors: ["Ivory", "Camel", "Light Navy", "Clear White"],
    colorsToAvoid: ["Muted tones", "Grey", "Dusty shades", "Cool pastels"],
    palette: ["#E74C3C", "#FF8C69", "#00CED1", "#FFD700", "#FF69B4", "#00A86B"],
  },
  CLEAR_WINTER: {
    name: "CLEAR_WINTER",
    label: "Clear Winter",
    description: "Bright, cool, and clear. High contrast with vivid cool tones.",
    characteristics: "High contrast features — very dark hair, bright cool eyes, clear light or olive skin.",
    powerColors: ["True Red", "Royal Blue", "Emerald", "Hot Pink", "Icy White", "Bright Purple"],
    neutralColors: ["Pure White", "True Black", "Charcoal", "Navy"],
    colorsToAvoid: ["Orange", "Warm Brown", "Muted tones", "Beige", "Peach"],
    palette: ["#C0392B", "#2980B9", "#27AE60", "#FF1493", "#F0F8FF", "#8B00FF"],
  },
  WARM_SPRING: {
    name: "WARM_SPRING",
    label: "Warm Spring",
    description: "Rich, warm, and golden. The most intense of the Spring seasons.",
    characteristics: "Golden or auburn hair, warm brown or hazel eyes, golden or peachy skin with warm undertones.",
    powerColors: ["Warm Peach", "Golden Yellow", "Tomato Red", "Warm Turquoise", "Camel", "Apple Green"],
    neutralColors: ["Ivory", "Warm Beige", "Camel", "Tan"],
    colorsToAvoid: ["Black", "Cool Grey", "Icy colours", "Purple", "Cool Pink"],
    palette: ["#E8925A", "#F4D03F", "#C0392B", "#48C9B0", "#C8A45A", "#58D68D"],
  },
  WARM_AUTUMN: {
    name: "WARM_AUTUMN",
    label: "Warm Autumn",
    description: "Rich, warm, and golden. The most intensely warm of all seasons.",
    characteristics: "Red, auburn, or warm golden brown hair, warm brown or green eyes, golden or bronzed skin.",
    powerColors: ["Rust", "Warm Orange", "Olive Green", "Mustard", "Terracotta", "Warm Brown"],
    neutralColors: ["Camel", "Warm Beige", "Chocolate Brown", "Off-White"],
    colorsToAvoid: ["Black", "Cool Grey", "Pink", "Navy", "Icy colours"],
    palette: ["#C0392B", "#E67E22", "#7D6608", "#D4AC0D", "#CB4335", "#784212"],
  },
  DEEP_AUTUMN: {
    name: "DEEP_AUTUMN",
    label: "Deep Autumn",
    description: "Rich, dark, and warm. Deep colouring with warm undertones.",
    characteristics: "Dark brown or black hair with warm undertones, dark brown eyes, medium to deep warm skin.",
    powerColors: ["Deep Teal", "Burgundy", "Forest Green", "Warm Chocolate", "Deep Rust", "Gold"],
    neutralColors: ["Dark Brown", "Warm Taupe", "Camel", "Ivory"],
    colorsToAvoid: ["Pastels", "Cool Grey", "Icy colours", "Cool Pink", "Black (softened)"],
    palette: ["#117A65", "#922B21", "#1E8449", "#6E2C00", "#B7522A", "#B7950B"],
  },
  DEEP_WINTER: {
    name: "DEEP_WINTER",
    label: "Deep Winter",
    description: "Rich, dark, and cool. Deep colouring with cool undertones.",
    characteristics: "Dark brown or black hair, dark brown or black eyes, deep neutral to cool skin.",
    powerColors: ["True Black", "Deep Navy", "Icy White", "Deep Burgundy", "Forest Green", "Rich Purple"],
    neutralColors: ["True Black", "Charcoal", "Pure White", "Deep Navy"],
    colorsToAvoid: ["Orange", "Warm Brown", "Peach", "Camel", "Warm Earth Tones"],
    palette: ["#1C1C1C", "#1A237E", "#F0F0F0", "#6D0F0F", "#1B5E20", "#4A148C"],
  },
  SOFT_SUMMER: {
    name: "SOFT_SUMMER",
    label: "Soft Summer",
    description: "Muted, cool, and soft. Dusty and understated cool tones.",
    characteristics: "Ash brown or dark ash blonde hair, soft grey-blue or grey-green eyes, cool or neutral muted skin.",
    powerColors: ["Dusty Rose", "Soft Teal", "Muted Blue", "Dusty Lavender", "Soft Grey-Green", "Mauve"],
    neutralColors: ["Soft White", "Light Grey", "Rose Grey", "Dusty Pink"],
    colorsToAvoid: ["Bright colours", "Orange", "Pure Black", "Pure White", "Warm Brown"],
    palette: ["#D4A5A5", "#7FB5B5", "#7B9DB4", "#B4A5C8", "#8FAF8F", "#C4939A"],
  },
  SOFT_AUTUMN: {
    name: "SOFT_AUTUMN",
    label: "Soft Autumn",
    description: "Muted, warm, and soft. Dusty and understated warm tones.",
    characteristics: "Ash brown or dark blonde hair, soft hazel or warm grey eyes, neutral warm muted skin.",
    powerColors: ["Dusty Teal", "Warm Mauve", "Muted Olive", "Soft Rust", "Warm Stone", "Dusty Coral"],
    neutralColors: ["Warm Beige", "Soft Brown", "Warm Stone", "Cream"],
    colorsToAvoid: ["Bright colours", "Pure Black", "Icy colours", "Hot Pink", "Royal Blue"],
    palette: ["#5F8A8B", "#C49A8A", "#8A9A5B", "#C47A5A", "#B5A99A", "#D4956A"],
  },
  TRUE_SPRING: {
    name: "TRUE_SPRING",
    label: "True Spring",
    description: "Fresh, warm, and medium intensity. The classic Spring.",
    characteristics: "Golden blonde or light brown warm hair, blue, green, or teal eyes, warm peachy or golden skin.",
    powerColors: ["Warm Coral", "Turquoise", "Golden Yellow", "Grass Green", "Peach", "Periwinkle"],
    neutralColors: ["Ivory", "Warm Beige", "Camel", "Warm White"],
    colorsToAvoid: ["Black", "Cool Grey", "Burgundy", "Cool Purple", "Charcoal"],
    palette: ["#FF7F50", "#40E0D0", "#FFD700", "#7CFC00", "#FFDAB9", "#6495ED"],
  },
  TRUE_SUMMER: {
    name: "TRUE_SUMMER",
    label: "True Summer",
    description: "Soft, cool, and medium intensity. The classic Summer.",
    characteristics: "Ash blonde or medium ash brown hair, blue, grey, or soft green eyes, cool light to medium skin.",
    powerColors: ["Soft Blue", "Rose", "Lavender", "Soft Teal", "Powder Blue", "Dusty Pink"],
    neutralColors: ["Soft White", "Light Grey", "Cool Beige", "Rose White"],
    colorsToAvoid: ["Orange", "Rust", "Yellow-Green", "Warm Brown", "Black"],
    palette: ["#6495ED", "#FF69B4", "#E6E6FA", "#20B2AA", "#B0E0E6", "#DDA0DD"],
  },
  TRUE_AUTUMN: {
    name: "TRUE_AUTUMN",
    label: "True Autumn",
    description: "Rich, warm, and medium intensity. The classic Autumn.",
    characteristics: "Warm golden brown, chestnut, or auburn hair, warm brown, hazel, or green eyes, warm medium skin.",
    powerColors: ["Burnt Orange", "Olive Green", "Warm Brown", "Pumpkin", "Forest Green", "Gold"],
    neutralColors: ["Warm Beige", "Camel", "Chocolate", "Off-White"],
    colorsToAvoid: ["Black", "Cool Grey", "Hot Pink", "Cool Blue", "Icy colours"],
    palette: ["#D2691E", "#6B8E23", "#8B4513", "#FF7518", "#228B22", "#DAA520"],
  },
  TRUE_WINTER: {
    name: "TRUE_WINTER",
    label: "True Winter",
    description: "Clear, cool, and medium-high intensity. The classic Winter.",
    characteristics: "Dark brown or black hair, dark brown or black eyes, cool medium to olive skin.",
    powerColors: ["Pure White", "True Black", "Cool Red", "Royal Blue", "Cool Pink", "Emerald"],
    neutralColors: ["True Black", "Pure White", "Charcoal", "Cool Grey"],
    colorsToAvoid: ["Orange", "Warm Brown", "Peach", "Camel", "Warm Earth Tones"],
    palette: ["#FFFFFF", "#000000", "#DC143C", "#4169E1", "#FF007F", "#50C878"],
  },
};

export const STYLE_ARCHETYPES = [
  {
    id: "city-sleek",
    label: "City Sleek",
    description: "Sharp, minimal, on-trend. Clean lines and elevated basics.",
    emoji: "🏙️",
  },
  {
    id: "casual-cool",
    label: "Casual Cool",
    description: "Effortless and relaxed. Looks great without trying too hard.",
    emoji: "😎",
  },
  {
    id: "skater-grown-up",
    label: "Skater Grown Up",
    description: "Streetwear roots meets adult wardrobe. Hoodies with tailoring.",
    emoji: "🛹",
  },
  {
    id: "classic-refined",
    label: "Classic Refined",
    description: "Timeless pieces, excellent quality, never out of fashion.",
    emoji: "✨",
  },
  {
    id: "bohemian-free",
    label: "Bohemian Free",
    description: "Flowy fabrics, earthy tones, layered and expressive.",
    emoji: "🌿",
  },
  {
    id: "smart-professional",
    label: "Smart Professional",
    description: "Work-ready but personality-forward. Polished with a twist.",
    emoji: "💼",
  },
  {
    id: "eclectic-bold",
    label: "Eclectic & Bold",
    description: "Mixing prints, colours, and eras. Fashion as self-expression.",
    emoji: "🎨",
  },
  {
    id: "outdoor-active",
    label: "Outdoor Active",
    description: "Athletic and functional. Performance fabrics that still look good.",
    emoji: "🏔️",
  },
] as const;

export type StyleArchetypeId = typeof STYLE_ARCHETYPES[number]["id"];
