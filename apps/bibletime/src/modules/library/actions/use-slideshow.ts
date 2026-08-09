import { useCallback, useEffect, useRef, useState } from "react"

import type { FolderItem, LiveSlidePayload } from "@/modules/library/interfaces"
import { resolveFolderItemContent } from "@/modules/library/lib/resolve-folder-item-content"
import {
  resolveDeckCursor,
  resolveJumpIndex,
  resolveMoveIndex,
} from "@/modules/library/lib/slideshow-deck"
import {
  elapsedMs,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startedTimer,
} from "@/modules/library/lib/slideshow-timer"
import type { SlideshowTimerState } from "@/modules/library/lib/slideshow-timer"
import { openOutputWindow, setLiveSlide, setLiveSlideBlank } from "@/modules/library/services"
import type { SavedTemplate } from "@/modules/templates"

/** How long a typed jump number waits for another digit before it lapses. */
const JUMP_BUFFER_TIMEOUT_MS = 1200

export type SlideshowBlank = "black" | "white"

interface UseSlideshowOptions {
  /** The open folder's items, live — not a snapshot. See `resolveDeckCursor`. */
  items: FolderItem[]
  templates: SavedTemplate[]
  /** Which slide to open on: the console's selection when it is in the deck, else the first. */
  seedItemId: string | null
}

/**
 * Everything the slideshow view runs on: where the cursor is, what the next
 * slide is, the elapsed timer, the blank state, and the typed jump buffer.
 *
 * The cursor is an **item id**, never an index. That is the difference
 * between a presentation that survives someone editing the folder mid-service
 * and one that silently drifts a slide off — see `resolveDeckCursor`.
 *
 * Every state change here is deliberate about one thing: whether it sends to
 * the output. Only an explicit navigation does. A deck that changed
 * underneath moves the cursor and nothing else, so the projector holds what
 * it was showing until a human presses a key.
 */
export const useSlideshow = ({ items, templates, seedItemId }: UseSlideshowOptions) => {
  const [currentItemId, setCurrentItemId] = useState<string | undefined>(() => {
    if (seedItemId && items.some((item) => item.id === seedItemId)) return seedItemId
    return items[0]?.id
  })
  const [blank, setBlank] = useState<SlideshowBlank | null>(null)
  const [jumpBuffer, setJumpBuffer] = useState("")
  const [deckChanged, setDeckChanged] = useState(false)
  const [timer, setTimer] = useState<SlideshowTimerState>(() => startedTimer(Date.now()))
  const [elapsed, setElapsed] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const currentIndex = items.findIndex((item) => item.id === currentItemId)
  const currentItem = currentIndex === -1 ? undefined : items[currentIndex]
  const nextItem = currentIndex === -1 ? undefined : items[currentIndex + 1]

  // Remembered so a deletion can resolve "nearest survivor" — once the item
  // is gone from `items`, its index is unrecoverable from the deck alone.
  const lastIndexRef = useRef(0)
  useEffect(() => {
    if (currentIndex !== -1) lastIndexRef.current = currentIndex
  }, [currentIndex])

  /** Builds the payload for a slide and puts it on the wire. The one place this hook writes to the output. */
  const send = useCallback(
    (item: FolderItem) => {
      const content = resolveFolderItemContent(item, templates)
      const payload: LiveSlidePayload = {
        text: content.text,
        reference: content.reference,
        versionLabel: content.versionLabel,
        media: content.media,
        template: content.template,
      }
      // Carried through a send so navigating while blanked keeps the output
      // blanked — the operator blanked it on purpose and did not ask for it
      // back just by moving on.
      setLiveSlide(blank ? { ...payload, blank } : payload)
    },
    [templates, blank]
  )

  /**
   * The deck changed underneath us. Follows the current slide by identity,
   * and deliberately sends nothing: this runs on every folder write, most of
   * which have nothing to do with what is on screen.
   */
  useEffect(() => {
    const resolved = resolveDeckCursor(items, currentItemId, lastIndexRef.current)
    if (resolved === currentItemId) return

    setCurrentItemId(resolved)
    // Only worth flagging when the slide the operator was on actually went
    // away — a reorder that keeps it is not news.
    if (currentItemId !== undefined) setDeckChanged(true)
  }, [items, currentItemId])

  /** Moves the cursor and sends, unless the move lands where it started. */
  const goToIndex = useCallback(
    (index: number, options?: { force?: boolean }) => {
      // `resolveMoveIndex` answers -1 for an empty deck, and a jump can name
      // a slide that a concurrent edit just removed. Checked explicitly
      // because the index type says nothing about the deck's length.
      if (index < 0 || index >= items.length) return

      const target = items[index]
      if (!options?.force && target.id === currentItemId) return

      setCurrentItemId(target.id)
      setDeckChanged(false)
      send(target)
    },
    [items, currentItemId, send]
  )

  const move = useCallback(
    (direction: "next" | "previous" | "first" | "last") => {
      const from = currentIndex === -1 ? lastIndexRef.current : currentIndex
      goToIndex(resolveMoveIndex(items.length, from, direction))
    },
    [items.length, currentIndex, goToIndex]
  )

  /** A filmstrip click. Clicking the slide that is already current deliberately re-sends it, restarting its media. */
  const goToItem = useCallback(
    (itemId: string) => {
      const index = items.findIndex((item) => item.id === itemId)
      if (index === -1) return
      goToIndex(index, { force: true })
    },
    [items, goToIndex]
  )

  // --- Typed jump buffer -------------------------------------------------

  const appendJumpDigit = useCallback((digit: string) => {
    // Capped so a leaned-on key can't build an unbounded string; four digits
    // is far past any real deck.
    setJumpBuffer((previous) => (previous + digit).slice(0, 4))
  }, [])

  const commitJump = useCallback((): boolean => {
    const index = resolveJumpIndex(jumpBuffer, items.length)
    setJumpBuffer("")
    if (index === null) return false

    goToIndex(index)
    return true
  }, [jumpBuffer, items.length, goToIndex])

  // A buffer left alone lapses, so a half-typed number never commits on the
  // operator's *next* Enter, minutes later.
  useEffect(() => {
    if (jumpBuffer === "") return
    const timeout = window.setTimeout(() => setJumpBuffer(""), JUMP_BUFFER_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [jumpBuffer])

  // --- Blanking ----------------------------------------------------------

  const toggleBlank = useCallback((color: SlideshowBlank) => {
    setBlank((previous) => {
      const next = previous === color ? null : color
      setLiveSlideBlank(next)
      return next
    })
  }, [])

  // --- Timer -------------------------------------------------------------

  // One interval drives both the elapsed readout and the wall clock. Display
  // only — the values themselves are computed from timestamps, so a missed
  // tick costs a late repaint, never a wrong number.
  useEffect(() => {
    const tick = () => {
      const stamp = Date.now()
      setNow(stamp)
      setElapsed(elapsedMs(timer, stamp))
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [timer])

  const toggleTimer = useCallback(() => {
    const stamp = Date.now()
    setTimer((previous) =>
      previous.startedAt === null ? resumeTimer(previous, stamp) : pauseTimer(previous, stamp)
    )
  }, [])

  const restartTimer = useCallback(() => {
    setTimer((previous) => resetTimer(previous, Date.now()))
  }, [])

  /** Opens (or refocuses) the output window and re-sends the current slide — the recovery for a closed or blocked output. */
  const reopenOutput = useCallback(() => {
    openOutputWindow()
    if (currentItem) send(currentItem)
    if (blank) setLiveSlideBlank(blank)
  }, [currentItem, send, blank])

  return {
    items,
    currentItem,
    currentIndex,
    nextItem,
    total: items.length,
    isFirst: currentIndex <= 0,
    isLast: currentIndex === items.length - 1,
    blank,
    jumpBuffer,
    deckChanged,
    elapsed,
    isTimerRunning: timer.startedAt !== null,
    now,
    move,
    goToItem,
    appendJumpDigit,
    commitJump,
    toggleBlank,
    toggleTimer,
    restartTimer,
    reopenOutput,
  }
}
