// Package-level boundaries (ADR 0016, layer 1). oxlint's no-restricted-imports
// guards each import; this guards the dependency declarations behind them.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Rule = { from: string; forbidden: string[]; why: string };

const APPS = ["@expense/web", "@expense/api"];

const RULES: Rule[] = [
  {
    from: "*",
    forbidden: APPS,
    why: "nothing depends on an app",
  },
  {
    from: "@expense/web",
    forbidden: ["@expense/db", "@expense/test-db"],
    why: "apps/web reaches data through apps/api only (ADR 0013, 0014)",
  },
  {
    from: "@expense/ui",
    forbidden: ["@expense/db", "@expense/test-db"],
    why: "UI components are presentational",
  },
  {
    from: "@expense/contract",
    forbidden: ["@expense/test-db"],
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

if (violations.length > 0) {
  console.error(`Package boundary violations:\n${violations.map((v) => `  - ${v}`).join("\n")}`);
  process.exit(1);
}
console.log(`Package boundaries OK (${manifests.length} packages).`);
