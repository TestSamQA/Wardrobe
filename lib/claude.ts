import Anthropic from "@anthropic-ai/sdk";

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

if (process.env.NODE_ENV !== "production") globalForAnthropic.anthropic = anthropic;

export const MODELS = {
  // Use for vision tasks and complex reasoning
  default: "claude-sonnet-4-6" as const,
  // Use for fast, cheap tasks
  fast: "claude-haiku-4-5-20251001" as const,
} as const;

/**
 * Parse a JSON code block from Claude's response.
 * Claude returns ```json ... ``` blocks — this extracts the content.
 */
export function parseJsonResponse<T>(text: string): T {
  // Try to extract from markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonString = codeBlockMatch ? codeBlockMatch[1] : text;

  try {
    return JSON.parse(jsonString.trim()) as T;
  } catch {
    // Last resort: find the first { or [ and parse from there
    const start = jsonString.search(/[{[]/);
    if (start === -1) throw new Error("No JSON found in response");
    const end = Math.max(jsonString.lastIndexOf("}"), jsonString.lastIndexOf("]"));
    return JSON.parse(jsonString.slice(start, end + 1)) as T;
  }
}

/**
 * Convert an image buffer to a base64 data URI for Claude's vision API.
 */
export function imageToBase64(buffer: Buffer, mediaType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg") {
  return {
    type: "base64" as const,
    media_type: mediaType,
    data: buffer.toString("base64"),
  };
}
