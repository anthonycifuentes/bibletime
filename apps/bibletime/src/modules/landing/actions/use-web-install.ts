import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"

import type { WebInstallState } from "@/modules/landing/interfaces"

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

export interface WebInstall {
  /**
   * Whether to render the `<install>` element at all. `false` until the client
   * has confirmed the browser implements it and there's something to install.
   */
  isOffered: boolean
  state: WebInstallState
  /** Goes on the `<install>` element — this is what the browser's events are read from. */
  ref: RefObject<HTMLInstallElement | null>
}

/**
 * Everything around the `<install>` element: whether to render it, and what
 * the browser said afterwards.
 *
 * The element itself needs no JavaScript — that's its whole appeal — but
 * three things about *this* page do:
 *
 * 1. Browsers without it render whatever children the tag has, and our
 *    fallback is the "Open it in the browser" button already sitting beside
 *    it. An empty tag in a flex row is an empty flex item, so it's cleaner to
 *    not render the tag than to render a zero-width one.
 * 2. The desktop build serves this same landing route from inside Electron,
 *    where offering to install the web app is nonsense.
 * 3. A visitor who already installed it should be told so, not handed the
 *    button again.
 *
 * Detection runs in an effect because the server has no `window`: the markup
 * that hydrates carries no install button, and it appears on the first client
 * pass — the same bargain `useDetectedDownload` makes next door.
 */
export function useWebInstall(): WebInstall {
  const [isOffered, setIsOffered] = useState(false)
  const [state, setState] = useState<WebInstallState>("idle")
  const ref = useRef<HTMLInstallElement>(null)

  useEffect(() => {
    if (!("HTMLInstallElement" in window)) return
    // The Electron shell is the installed app; it doesn't install itself.
    if (window.bibletime) return
    if (isRunningInstalled()) {
      setState("installed")
      return
    }
    setIsOffered(true)
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const onInstalled = () => setState("installed")
    const onDismissed = () => setState("dismissed")
    // The browser refusing to render the button — a manifest it can't read, an
    // id that doesn't match — leaves a control that looks clickable and isn't.
    // Better to drop the whole block than to show one.
    const onValidation = () => setState(element.invalidReason ? "unavailable" : "idle")

    element.addEventListener("promptaction", onInstalled)
    element.addEventListener("promptdismiss", onDismissed)
    element.addEventListener("validationstatuschanged", onValidation)
    return () => {
      element.removeEventListener("promptaction", onInstalled)
      element.removeEventListener("promptdismiss", onDismissed)
      element.removeEventListener("validationstatuschanged", onValidation)
    }
  }, [isOffered])

  return { isOffered, state, ref }
}
