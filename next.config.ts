import type { NextConfig } from "next";

// Isolated static Render preview. The live Sites/Cloudflare build is unchanged.
const nextConfig: NextConfig = process.env.RENDER_STATIC_PREVIEW === "1"
  ? { output: "export", images: { unoptimized: true } }
  : {};

export default nextConfig;
