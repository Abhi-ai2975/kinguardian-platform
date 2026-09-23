import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: { resolve: true },
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ["next"],
    platform: "node",
  },
  {
    entry: { server: "src/server/index.ts" },
    format: ["cjs", "esm"],
    dts: { resolve: true },
    splitting: false,
    sourcemap: true,
    external: ["next", "server-only"],
    platform: "node",
  },
]);
