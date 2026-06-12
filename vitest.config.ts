import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.test.ts"],
    isolate: false,
    fileParallelism: false,
    maxWorkers: 1
  },
  resolve: {
    alias: {
      "@open-agent-access/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@open-agent-access/hono": new URL("./packages/hono/src/index.ts", import.meta.url).pathname,
      "@open-agent-access/payments-algorand-x402": new URL("./packages/payments-algorand-x402/src/index.ts", import.meta.url).pathname
    }
  }
});
