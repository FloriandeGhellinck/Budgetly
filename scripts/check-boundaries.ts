// Package-level boundaries (ADR 0016, layer 1). oxlint's no-restricted-imports
// guards each import; this guards the dependency declarations behind them.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

type Rule = { from: string; forbidden: string[]; why: string };

const APPS = ["@budgetly/web", "@budgetly/api"];

const RULES: Rule[] = [
  {
    from: "*",
    forbidden: APPS,
    why: "nothing depends on an app",
  },
  {
    from: "@budgetly/web",
    forbidden: ["@budgetly/db", "@budgetly/test-db"],
    why: "apps/web reaches data through apps/api only (ADR 0013, 0014)",
  },
  {
    from: "@budgetly/ui",
    forbidden: ["@budgetly/db", "@budgetly/test-db"],
    why: "UI components are presentational",
  },
  {
    from: "@budgetly/contract",
    forbidden: ["@budgetly/test-db"],
    why: "contracts are pure",
  },
];

type Manifest = {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const root = join(import.meta.dirname, "..");
const manifests: Manifest[] = ["apps", "packages"].flatMap((group) =>
  readdirSync(join(root, group), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map(
      (entry) =>
        JSON.parse(readFileSync(join(root, group, entry.name, "package.json"), "utf8")) as Manifest,
    ),
);

const violations: string[] = [];
for (const manifest of manifests) {
  const deps = new Set(
    Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    }),
  );
  for (const rule of RULES) {
    if (rule.from !== "*" && rule.from !== manifest.name) continue;
    for (const name of rule.forbidden) {
      if (deps.has(name) && name !== manifest.name) {
        violations.push(`${manifest.name} depends on ${name}: ${rule.why}.`);
      }
    }
  }
}

// apps/web: a "use client" file must not import a server-only module (one
// that imports "server-only": the API client, env, Supabase server client).
// `server-only` fails the build too; this names the offending import early
// and in `pnpm checks` (ADR 0014, 0030).
const webSrc = join(root, "apps", "web", "src");
const webFiles = readdirSync(webSrc, { recursive: true, encoding: "utf8" })
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => join(webSrc, file));
const sources = new Map(webFiles.map((file) => [file, readFileSync(file, "utf8")]));
const serverOnly = new Set(
  [...sources]
    .filter(([, source]) => /^import "server-only";$/m.test(source))
    .map(([file]) => file),
);
const IMPORT = /^\s*import\s+(?!type\b)[^;]*?from\s+"([^"]+)"/gm;

function resolveWebImport(from: string, specifier: string): string | undefined {
  const base = specifier.startsWith("@/")
    ? join(webSrc, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(from), specifier)
      : undefined;
  if (!base) return undefined;
  return [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")].find((file) => sources.has(file));
}

for (const [file, source] of sources) {
  if (!/^\s*["']use client["'];?/.test(source)) continue;
  for (const [, specifier = ""] of source.matchAll(IMPORT)) {
    const target = resolveWebImport(file, specifier);
    if (target && serverOnly.has(target)) {
      violations.push(
        `${relative(root, file)} is a client component but imports ${specifier} (server-only): call it through a server action instead.`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(`Package boundary violations:\n${violations.map((v) => `  - ${v}`).join("\n")}`);
  process.exit(1);
}
console.log(
  `Package boundaries OK (${manifests.length} packages, ${sources.size} apps/web files, ${serverOnly.size} server-only).`,
);
