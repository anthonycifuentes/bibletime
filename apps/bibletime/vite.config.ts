import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8"))

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})

export default config
