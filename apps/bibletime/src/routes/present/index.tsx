import { useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"

import { useLiveSlide } from "@/modules/library"
import { DEFAULT_SLIDE_TEMPLATE, SlideFrame } from "@/modules/presentation"

export const Route = createFileRoute("/present/")({
  component: PresentRoute,
})

/**
 * Toggles the window between fullscreen and windowed.
 *
 * Deliberately the plain HTML Fullscreen API rather than an IPC call into
 * Electron: it is one implementation that works identically in the web
 * build's popup, and it keeps this route free of any `window.bibletime`
 * dependency. Electron maps HTML fullscreen onto the `BrowserWindow`, so
 * the desktop result is a real fullscreen window either way.
 */
const toggleFullscreen = () => {
  // Guarded for the non-browser (SSR) render, where there is no `document`.
  if (typeof document === "undefined") return

  // Both calls reject rather than throw when the environment refuses (no user
  // gesture, blocked by permissions policy) — caught, because a presentation
  // must not fall over an unhandled rejection from a keystroke.
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined)
    return
  }
  void document.documentElement.requestFullscreen().catch(() => undefined)
}

/**
 * The bare output window a "Send to output" click opens: no app chrome,
 * meant to be dragged to a second display and made fullscreen. Letterboxes
 * the slide to the configured aspect ratio instead of stretching it to
 * whatever the display's own ratio happens to be — a projector or second
 * monitor rarely matches the console's aspect ratio exactly. Mirrors the
 * main console window via `localStorage` — the sent slide (text, reference,
 * and its resolved template, already denormalized by the preview panel)
 * updates instantly through `storage` events, so this route never needs to
 * know about folders, items, content types, or the template library itself.
 *
 * Fullscreen is reachable from inside the window (`F`, `F11`, or a
 * double-click) because the window it lives in has no menu to reach it
 * from. `Esc` needs no handler — the browser exits fullscreen natively.
 */
function PresentRoute() {
  const slide = useLiveSlide()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F11" || event.key === "f" || event.key === "F") {
        event.preventDefault()
        toggleFullscreen()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div className="h-screen w-screen bg-black" onDoubleClick={toggleFullscreen}>
      <SlideFrame
        template={slide?.template ?? DEFAULT_SLIDE_TEMPLATE}
        text={slide?.text}
        reference={slide?.reference}
        versionLabel={slide?.versionLabel}
        emptyMessage="Esperando contenido…"
        className="rounded-none"
        frameClassName="h-full w-full"
      />
    </div>
  )
}
