//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  ...tanstackConfig,
  {
    rules: {
      "import/no-cycle": "off",
      "import/order": "off",
      "sort-imports": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
      "pnpm/json-enforce-catalog": "off",
    },
  },
  {
    // Build output is not source. Without this, linting after a build walks
    // the bundled Nitro/Vite artifacts and fails on files that are not in any
    // tsconfig project.
    ignores: [
      "eslint.config.js",
      ".prettierrc",
      ".output/**",
      ".nitro/**",
      ".tanstack/**",
      ".vercel/**",
      "dist/**",
    ],
  },
]
