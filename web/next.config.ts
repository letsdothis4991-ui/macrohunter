import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  // The website shares the macro maths (../src/lib) and menu reader (../scripts/ingest)
  // with the rest of the repo, so Turbopack needs to see the whole repo.
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
