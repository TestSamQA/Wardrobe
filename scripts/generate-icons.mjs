import sharp from "sharp";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

// ── SVG designs ──────────────────────────────────────────────────────────────
//
// Icon: minimalist clothes hanger on dark background with a small gold sparkle.
// The hanger uses warm off-white strokes; the sparkle nods to the AI layer.

const hanger = `
  <!-- Hook: neck up to a shepherd's-crook curve -->
  <path d="M256 222 L256 183 C256 153 274 132 298 126 C322 120 344 134 348 156 C352 178 336 192 316 190"
        stroke="#ede8df" stroke-width="22" stroke-linecap="round" fill="none"/>
  <!-- Left shoulder -->
  <path d="M256 222 C206 240 148 282 94 330"
        stroke="#ede8df" stroke-width="22" stroke-linecap="round" fill="none"/>
  <!-- Right shoulder -->
  <path d="M256 222 C306 240 364 282 418 330"
        stroke="#ede8df" stroke-width="22" stroke-linecap="round" fill="none"/>
  <!-- Bottom bar -->
  <line x1="94" y1="330" x2="418" y2="330"
        stroke="#ede8df" stroke-width="22" stroke-linecap="round"/>
  <!-- Gold sparkle (4-pointed star) -->
  <path d="M390 150 L394 138 L398 150 L410 154 L398 158 L394 170 L390 158 L378 154 Z"
        fill="#c4a46b"/>
`;

// Regular icon — hanger fills most of the canvas
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#141414"/>
  ${hanger}
</svg>`;

// Maskable icon — content scaled to 75% so nothing clips under any mask shape
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#141414"/>
  <g transform="translate(64 64) scale(0.75)">
    ${hanger}
  </g>
</svg>`;

// ── Generate ──────────────────────────────────────────────────────────────────

const outDir = "public/icons";
if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

await sharp(Buffer.from(iconSvg)).resize(192, 192).png().toFile(`${outDir}/icon-192x192.png`);
console.log("✓ icon-192x192.png");

await sharp(Buffer.from(iconSvg)).resize(512, 512).png().toFile(`${outDir}/icon-512x512.png`);
console.log("✓ icon-512x512.png");

await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(`${outDir}/icon-maskable-512x512.png`);
console.log("✓ icon-maskable-512x512.png");

console.log("\nAll icons written to public/icons/");
