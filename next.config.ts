import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site (out/): no server needed — host anywhere, data lives in the browser.
  output: "export",
  trailingSlash: true,
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
