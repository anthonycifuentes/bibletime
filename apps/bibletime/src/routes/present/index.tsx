import { createFileRoute } from "@tanstack/react-router"

import { useLiveSlide } from "@/modules/library"
import { DEFAULT_SLIDE_TEMPLATE, SlideFrame } from "@/modules/presentation"

export const Route = createFileRoute("/present/")({
  component: PresentRoute,
})

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
 */
function PresentRoute() {
  const slide = useLiveSlide()

  return (
    <div className="h-screen w-screen bg-black">
      <SlideFrame
        template={slide?.template ?? DEFAULT_SLIDE_TEMPLATE}
        text={slide?.text}
        reference={slide?.reference}
        emptyMessage="Esperando contenido…"
        className="rounded-none"
        frameClassName="h-full w-full"
      />
    </div>
  )
}
