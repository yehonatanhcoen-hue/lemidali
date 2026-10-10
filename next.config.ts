import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site (out/): no server needed — host anywhere, data lives in the browser.
  output: "export",
  trailingSlash: true,
  // GitHub Pages serves the site under /<repo>/ — set NEXT_PUBLIC_BASE_PATH at build time (empty = site root).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
