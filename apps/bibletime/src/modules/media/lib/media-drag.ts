import type { MediaSlideData } from "@/modules/media/interfaces"

/**
 * Where a grid drag stashes its payload for the folder tree and slide
 * console to pick up.
 *
 * `sessionStorage` rather than the drag event's own `dataTransfer`, because
 * `dataTransfer.getData` is blocked outside a `drop` handler — a drop
 * target needs to know whether it can accept the drag during `dragover`,
 * not only once it already has it.
 */
const MEDIA_DRAG_KEY = "bibletime:media-drag"

export const writeMediaDragPayload = (slides: MediaSlideData[]): void => {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(MEDIA_DRAG_KEY, JSON.stringify(slides))
}

/**
 * Reads (and clears) the slides a Media-tab drag is carrying.
 *
 * Cleared on read so a stale payload can't be dropped twice — a later drop
 * carrying nothing would otherwise silently re-add the previous files.
 */
export const readMediaDragPayload = (): MediaSlideData[] => {
  if (typeof window === "undefined") return []

  try {
    const raw = window.sessionStorage.getItem(MEDIA_DRAG_KEY)
    if (!raw) return []
    window.sessionStorage.removeItem(MEDIA_DRAG_KEY)
    return JSON.parse(raw) as MediaSlideData[]
  } catch {
    return []
  }
}
