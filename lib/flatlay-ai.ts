import Replicate from "replicate";
import { anthropic, MODELS } from "./claude";

const CATEGORY_LABELS: Record<string, string> = {
  HEADWEAR: "hat/headwear",
  OUTERWEAR: "jacket/outerwear",
  TOPS: "top",
  BOTTOMS: "bottoms",
  FOOTWEAR: "shoes/footwear",
  ACCESSORIES: "accessory",
  BAGS: "bag",
  FULL_OUTFIT: "full outfit piece",
};

export interface FlatLayItem {
  name: string;
  customName?: string | null;
  category: string;
  subcategory?: string | null;
  colors: string[];
  material?: string | null;
  notes?: string | null;
}

export interface FlatLayStyleContext {
  colorSeason: string;
  styleArchetype: string;
}

/**
 * Generate an AI flatlay image for an outfit.
 *
 * Two-step:
 * 1. Claude writes an art-direction prompt from item metadata.
 * 2. Replicate (Flux 1.1 Pro) renders the image.
 *
 * Returns the image as a JPEG Buffer.
 * Throws if REPLICATE_API_TOKEN is not set or generation fails.
 */
export async function generateAiFlatlay(
  items: FlatLayItem[],
  profile?: FlatLayStyleContext | null
): Promise<Buffer> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }

  // ── Step 1: Claude writes the image generation prompt ─────────────────────

  const itemLines = items
    .map((item) => {
      const name = item.customName ?? item.name;
      const label = CATEGORY_LABELS[item.category] ?? item.category;
      const colors = item.colors.join(", ");
      const detail = [item.subcategory, item.material].filter(Boolean).join(", ");
      const notes = item.notes ? ` Notes: ${item.notes}` : "";
      return `- ${name} (${label}): ${colors}${detail ? ` — ${detail}` : ""}${notes}`;
    })
    .join("\n");

  const profileLine = profile
    ? `The wearer's colour season is ${profile.colorSeason.replace(/_/g, " ")} and their style archetype is ${profile.styleArchetype}.`
    : "";

  console.log("[flatlay-ai] Item lines sent to Claude:\n", itemLines);

  const promptResponse = await anthropic.messages.create({
    model: MODELS.default,
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `You are a fashion photography art director. Write a prompt for an AI image generator to create a professional editorial flatlay photograph of this outfit.

Outfit items:
${itemLines}

${profileLine}

Rules for the prompt you write:
- Top-down flatlay view, items laid out flat (no model, no mannequin, no hands)
- Clean muted surface — linen, pale marble, or muted wood
- Soft diffused natural light, minimal hard shadows
- Items arranged naturally and cohesively, styled to suggest how they would be worn together
- High-end fashion editorial aesthetic
- CRITICAL: Preserve specific visual details from the item notes — if a note mentions embroidery, logo text, brand markings, distinctive panels, sole shape, pocket details, or any other visible feature, include it explicitly in the prompt. The image generator needs these specifics to render items accurately.
- Do NOT generalise or summarise items — describe each one with the same level of detail found in the notes.

Output ONLY the image generation prompt — no preamble, no explanation.`,
      },
    ],
  });

  const imagePrompt =
    promptResponse.content[0].type === "text"
      ? promptResponse.content[0].text.trim()
      : "";

  if (!imagePrompt) throw new Error("Claude returned an empty image prompt");

  console.log("[flatlay-ai] Claude art-direction prompt:\n", imagePrompt);

  // ── Step 2: Replicate / Flux 1.1 Pro renders the image ────────────────────

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  const output = await replicate.run("black-forest-labs/flux-2-pro", {
    input: {
      prompt: imagePrompt,
      aspect_ratio: "1:1",
      output_format: "jpg",
      output_quality: 90,
      safety_tolerance: 2,
    },
  });

  // Replicate SDK returns FileOutput objects with a .url() method, or plain URL
  // strings in older versions — handle both shapes.
  const first = Array.isArray(output) ? output[0] : output;
  let imageUrl: string;
  if (typeof first === "string") {
    imageUrl = first;
  } else if (first && typeof (first as { url?: () => string }).url === "function") {
    imageUrl = (first as { url: () => string }).url();
  } else {
    throw new Error("Unexpected output shape from Replicate");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to fetch Replicate image: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
