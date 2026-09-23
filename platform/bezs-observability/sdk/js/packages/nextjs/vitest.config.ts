import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolve workspace packages from TypeScript source during tests
    // so we don't need to build them first.
    alias: {
      "@watcher/core": resolve(__dirname, "../core/src/index.ts"),
      "@watcher/node": resolve(__dirname, "../node/src/index.ts"),
      "@watcher/react": resolve(__dirname, "../react/src/index.tsx"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
