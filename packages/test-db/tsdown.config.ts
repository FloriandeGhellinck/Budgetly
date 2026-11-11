import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  // Consumers read types from src (package.json "types"), so no .d.ts is emitted.
  dts: false,
  clean: true,
});
