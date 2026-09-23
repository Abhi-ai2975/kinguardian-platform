import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: { resolve: true },
  splitting: false,
  sourcemap: true,
  clean: true,
  banner: {
    js: '"use client";',
  },
  external: [
    "react", "react-dom", "@tanstack/react-query",
    "@radix-ui/react-context-menu", "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu", "@radix-ui/react-tooltip",
    "@radix-ui/react-scroll-area", "@radix-ui/react-checkbox",
  ],
});
