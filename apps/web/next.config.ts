import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Pinned so Turbopack doesn't walk up to another pnpm-workspace.yaml in a nested worktree.
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // apps/web/AGENTS.md is hand-written; it points at Next's bundled docs itself.
  agentRules: false,
  turbopack: { root: workspaceRoot },
  // @expense/ui ships source; transpiling keeps its per-file "use client" boundaries.
  transpilePackages: ["@expense/ui"],
};

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

export default withNextIntl(nextConfig);
