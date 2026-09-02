import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Otherwise Turbopack walks up and finds a
  // lockfile in the home directory and warns about an ambiguous root.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
