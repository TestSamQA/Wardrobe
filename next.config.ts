import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const csp = [
  "default-src 'self'",
  // Next.js runtime requires unsafe-inline + unsafe-eval
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind uses inline styles
  "style-src 'self' 'unsafe-inline'",
  // Images are proxied through /api/images (same origin); data: for tiny base64 previews
  "img-src 'self' data: blob:",
  // fetch() calls are same-origin only; SSE streams are same-origin
  "connect-src 'self'",
  "font-src 'self'",
  "media-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["sharp", "minio"],
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline.html",
  },
})(nextConfig);
