import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Pinned so Turbopack doesn't walk up to another pnpm-workspace.yaml in a nested worktree.
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: workspaceRoot },
  // @expense/ui ships source; transpiling keeps its per-file "use client" boundaries.
  transpilePackages: ["@expense/ui"],
};

export default nextConfig;
