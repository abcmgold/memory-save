import type { NextConfig } from "next";

// Cache Components is intentionally OFF: every page is private and per-user, so pages render
// dynamically on each request (research.md R1). Keeps the model simple (constitution I).
const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "@node-rs/argon2", "heic-convert", "@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
