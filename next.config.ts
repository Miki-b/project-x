import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

// In dev the Mini App is served through a tunnel (e.g. cloudflared), so its host differs
// from localhost. Next blocks cross-origin access to /_next/* dev resources by default,
// which stops the client bundle from hydrating inside Telegram's WebView. Whitelist the
// tunnel host, derived from NEXT_PUBLIC_APP_URL so it stays in sync when the URL changes.
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const allowedDevOrigins = appUrl ? [new URL(appUrl).host] : [];

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Otherwise Turbopack walks up and finds a
  // lockfile in the home directory and warns about an ambiguous root.
  turbopack: {
    root: projectRoot,
  },
  allowedDevOrigins,
};

export default nextConfig;
