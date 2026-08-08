"use client"

import * as React from "react"

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

export interface PointerDragPoint {
  /** Horizontal position within the element, 0 at its left edge and 1 at its right. */
  x: number
  /** Vertical position within the element, 0 at its top edge and 1 at its bottom. */
  y: number
}

export interface UsePointerDragOptions {
  /**
   * Runs once on press, before the first `onDrag`. Return `false` to refuse
   * the drag entirely (no pointer capture, no `onDrag`) — how a track can
   * ignore a press that didn't land anywhere meaningful.
   */
  onStart?: (
    point: PointerDragPoint,
    event: React.PointerEvent<HTMLElement>
  ) => boolean | void
  onDrag: (point: PointerDragPoint) => void
}

/**
 * Turns pointer input on an element into normalized 0–1 coordinates within
 * that element's box.
 *
 * Built on `setPointerCapture`, so a drag keeps reporting — clamped to the
 * element's bounds — after the pointer leaves it, without the global
 * listeners and teardown that approach would otherwise need. Spread the
 * returned handlers onto the element whose box defines the coordinate
 * space; a press on a child still reports relative to that element, which is
 * what lets a draggable thumb be positioned by its own track.
 */
export function usePointerDrag({ onStart, onDrag }: UsePointerDragOptions) {
  const handlers = React.useRef({ onStart, onDrag })
  handlers.current = { onStart, onDrag }

  const pointToLocal = React.useCallback(
    (element: HTMLElement, event: { clientX: number; clientY: number }): PointerDragPoint => {
      const rect = element.getBoundingClientRect()
      return {
        x: rect.width === 0 ? 0 : clamp01((event.clientX - rect.left) / rect.width),
        y: rect.height === 0 ? 0 : clamp01((event.clientY - rect.top) / rect.height),
      }
    },
    []
  )

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return

      const element = event.currentTarget
      const point = pointToLocal(element, event)
      if (handlers.current.onStart?.(point, event) === false) return

      // Keeps the press from starting a text selection that would fight the drag.
      event.preventDefault()
      element.setPointerCapture(event.pointerId)
      handlers.current.onDrag(point)
    },
    [pointToLocal]
  )

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      // Only a captured pointer is mid-drag; a bare hover must not move anything.
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
      handlers.current.onDrag(pointToLocal(event.currentTarget, event))
    },
    [pointToLocal]
  )

  const onPointerUp = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
