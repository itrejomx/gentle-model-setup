import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // The data package declares `dist` entries it never emits (see tsconfig.json paths).
    alias: {
      "@gentle-ai/profile-data": fileURLToPath(new URL("../data/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
