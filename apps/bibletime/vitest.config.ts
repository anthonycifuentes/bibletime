import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

/**
 * A standalone config rather than reusing `vite.config.ts`.
 *
 * That config loads the TanStack Start and Nitro plugins, which build a
 * server and a router graph — none of which a unit test needs, and all of
 * which make a test run slow and able to fail for reasons unrelated to the
 * code under test. The suites here cover pure functions, so plain Node and
 * the `@/` alias are the whole requirement.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@workspace/ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
