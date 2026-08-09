import { useCallback, useEffect, useState } from "react"

import type { InstallAppState } from "@/modules/landing/interfaces"

/**
 * Is this page already running as an installed app? A standalone window (or
 * an iOS home-screen launch, which predates `display-mode`) means the visitor
 * has nothing left to install.
 */
const isRunningInstalled = (): boolean => {
  const asStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return (
    asStandalone ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches
  )
}

export interface InstallApp {
  state: InstallAppState
  /** Raises the browser's install dialog. No-op unless `state` is `"ready"`. */
  install: () => void
}

/**
 * "Add it to your desktop", driven by `beforeinstallprompt`.
 *
 * Chromium fires that event once the page meets its install criteria — for us
 * that's HTTPS, the manifest, and its icons; no service worker is involved
 * since Chrome dropped that requirement in 112 on desktop. The inline script
 * in `__root.tsx` catches it (it lands well before hydration) and parks it on
 * `window`; this hook picks it up from there and from a later
 * `bibletime:installprompt` if the page qualified after mount.
 *
 * Safari and Firefox never fire it, so `state` stays `"unavailable"` and the
 * button never renders — those visitors get the desktop downloads, which is
 * the better answer for them anyway. That's the deliberate trade of this
 * approach over the `<install>` element: it works in shipping browsers today
 * instead of behind a flag, at the cost of covering only Chromium.
 */
export function useInstallApp(): InstallApp {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [state, setState] = useState<InstallAppState>("unavailable")

  useEffect(() => {
    // The Electron shell is the installed app; it doesn't install itself.
    if (window.bibletime) return
    if (isRunningInstalled()) {
      setState("installed")
      return
    }

    const take = () => {
      const stashed = window.__bibletimeInstallPrompt
      if (!stashed) return
      setPrompt(stashed)
      setState("ready")
    }
    const onInstalled = () => {
      window.__bibletimeInstallPrompt = null
      setPrompt(null)
      setState("installed")
    }

    take()
    window.addEventListener("bibletime:installprompt", take)
    // Also fires when the install happens through the browser's own UI —
    // the address-bar icon, the ⋮ menu — not just through our button.
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("bibletime:installprompt", take)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = useCallback(() => {
    if (!prompt) return

    setState("prompting")
    void (async () => {
      try {
        await prompt.prompt()
        const { outcome } = await prompt.userChoice
        setState(outcome === "accepted" ? "installed" : "dismissed")
      } catch {
        // An already-consumed event throws rather than resolving. Nothing to
        // recover: the browser keeps its own install affordance either way.
        setState("dismissed")
      } finally {
        // Single-use — Chromium issues a fresh event on a later visit if the
        // install didn't happen, and the listener above will catch that one.
        window.__bibletimeInstallPrompt = null
        setPrompt(null)
      }
    })()
  }, [prompt])

  return { state, install }
}
