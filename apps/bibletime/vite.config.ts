import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { nitro } from "nitro/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8"))

const config = defineConfig(({ command }) => ({
  // `dedupe` keeps React a single module id: pnpm exposes it at more than one
  // path, and two ids become two React instances, whose hooks throw against
  // each other's dispatcher.
  resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
  ssr: {
    // Bundle every dependency into the server output. The desktop build runs
    // this server from inside the .app, where there is no node_modules to
    // resolve a bare `require("react")` against — and a partially-external
    // React is worse than either extreme, because the bundled copy and the
    // required copy are different instances.
    //
    // Build only. `vite dev` evaluates inlined SSR modules as ESM, so forcing
    // CommonJS dependencies through that path throws "module is not defined"
    // on every request — the build converts them properly, dev can't. The
    // packaged desktop app only ever runs a built server, so restricting this
    // to `build` leaves that fix fully intact.
    noExternal: command === "build" ? true : undefined,
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
}))

export default config
