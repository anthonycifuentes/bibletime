import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { nitro } from "nitro/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8"))

const config = defineConfig({
  // `dedupe` keeps React a single module id: pnpm exposes it at more than one
  // path, and two ids become two React instances, whose hooks throw against
  // each other's dispatcher.
  resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
  // Bundle every dependency into the server output. The desktop build runs
  // this server from inside the .app, where there is no node_modules to
  // resolve a bare `require("react")` against — and a partially-external
  // React is worse than either extreme, because the bundled copy and the
  // required copy are different instances.
  ssr: { noExternal: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})

export default config
