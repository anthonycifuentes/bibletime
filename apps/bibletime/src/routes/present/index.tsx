import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"

import { useTranslation } from "@/modules/core/i18n"
import { useLiveSlide } from "@/modules/library"
import { useMediaAvailability } from "@/modules/media"
import { DEFAULT_SLIDE_TEMPLATE, SlideFrame } from "@/modules/presentation"
import { cn } from "@workspace/ui/lib/utils"

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
/** How long the "press F" hint stays up before retiring itself. Long enough to read, short enough not to matter if it is already on a projector. */
const HINT_VISIBLE_MS = 4000

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
 *
 * A blanked payload paints a solid field *over* the slide rather than
 * replacing it: the slide stays mounted underneath, so a video keeps
 * playing behind the blank and restoring re-reveals it mid-clip instead of
 * starting it over (see `LiveSlidePayload.blank`).
 */
function PresentRoute() {
  const slide = useLiveSlide()
  const { t } = useTranslation()
  const { isMissing: isMediaMissing, missingReason, url: mediaUrl } = useMediaAvailability(slide?.media)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHintVisible, setIsHintVisible] = useState(true)

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

  // Tracked rather than assumed, because fullscreen can be left by routes
  // this component never hears about — `Esc`, the OS, the window's own
  // controls — and the hint's whole job is to be right about it.
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))

    onFullscreenChange()
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  // The hint shows while windowed and retires on a timer, so it cannot end
  // up on a projector for longer than it takes to read. Leaving fullscreen
  // brings it back with a fresh timer — that is exactly the moment the
  // operator has lost the chrome-free view and needs to know how to return.
  useEffect(() => {
    if (isFullscreen) {
      setIsHintVisible(false)
      return
    }

    setIsHintVisible(true)
    const timeout = window.setTimeout(() => setIsHintVisible(false), HINT_VISIBLE_MS)
    return () => window.clearTimeout(timeout)
  }, [isFullscreen])

  return (
    <div className="relative h-screen w-screen bg-black" onDoubleClick={toggleFullscreen}>
      <SlideFrame
        template={slide?.template ?? DEFAULT_SLIDE_TEMPLATE}
        media={slide?.media}
        // Resolved in *this* window. A URL minted in the console window
        // would be meaningless here, which is why the payload carries a
        // reference and each context resolves it for itself (see
        // `enable-media-tab-on-web` design decision 6).
        mediaUrl={mediaUrl}
        isMediaMissing={Boolean(slide?.media) && isMediaMissing}
        // Restarts playback from zero on every send, so re-sending a
        // countdown restarts the countdown. `sentAt` moves on a slide send
        // and on nothing else — `setLiveSlideBlank` deliberately holds it
        // still — so blanking and restoring cannot restart a video.
        mediaPlaybackKey={slide?.sentAt}
        text={slide?.text}
        reference={slide?.reference}
        versionLabel={slide?.versionLabel}
        emptyMessage={
          slide?.media && isMediaMissing
            ? // No permission prompt on a projector: the grant has to happen
              // in the console window, so that is where the user is sent.
              t(missingReason === "needs-reconnect" ? "media.outputNeedsReconnect" : "media.missingFile")
            : "Esperando contenido…"
        }
        className="rounded-none"
        frameClassName="h-full w-full"
      />

      {/*
        Painted over the slide, never in place of it — the `SlideFrame`
        above stays mounted, which is what makes restoring instant and
        keeps a playing video playing. Non-interactive so the window's
        double-click-to-fullscreen still works while blanked.
      */}
      {slide?.blank ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0",
            slide.blank === "white" ? "bg-white" : "bg-black"
          )}
        />
      ) : null}

      {/*
        Why this exists: on web the browser will not give up the last of its
        chrome — a popup always keeps a small origin label, by design, and no
        site can remove it. Fullscreen is the only thing that hides it, and
        the gesture has to happen in *this* window, so this is where the
        operator has to be told.

        Suppressed while blanked: a blank means the projector is deliberately
        dark, and a floating pill is the one thing that must not be on it.
        `pointer-events-none` so it never eats the double-click that would
        have gone fullscreen.
      */}
      {isHintVisible && !isFullscreen && !slide?.blank ? (
        <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
          <p className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
            {t("present.fullscreenHint")}
          </p>
        </div>
      ) : null}
    </div>
  )
}
