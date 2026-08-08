import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

import { useTranslation } from "@/modules/core/i18n"
import { MediaFileTile } from "@/modules/media/components/media-file-tile"
import type { MediaEntry } from "@/modules/media/interfaces"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"

/** Gap between tiles, and the extra rows rendered above and below the viewport so scrolling never shows a blank band. */
const GRID_GAP = 12
const OVERSCAN_ROWS = 2
/** Tile height = width / 16 * 9 for the thumbnail, plus the label block. */
const LABEL_HEIGHT = 34

interface MediaFileGridProps {
  entries: MediaEntry[]
  selectedReferences: string[]
  favorites: string[]
  /** Tile width in pixels, from the toolbar's size slider. */
  tileSize: number
  isLoading: boolean
  /** Page counts by entry reference, for document tiles whose pages have been rendered. */
  pageCounts: Record<string, number>
  onSelectionChange: (references: string[], lastReference: string | null) => void
  /** Double-click: drill into a document, or add-and-present an image/video. */
  onActivate: (entry: MediaEntry) => void
  onToggleFavorite: (entry: MediaEntry, isFavorite: boolean) => void
  /** Enter with the grid focused — adds the current selection. */
  onAddSelection: () => void
  onDragStart: (entry: MediaEntry) => void
}

/**
 * The Media tab's second column: a windowed thumbnail grid.
 *
 * Windowing is hand-rolled rather than pulled from a virtualization library
 * because this is the easy case — every tile is exactly the same size, so
 * the visible row range is arithmetic on the scroll offset, and two spacer
 * divs hold the scrollbar at its true height. That keeps the change at one
 * new dependency while still meeting the 1000-file requirement.
 */
export function MediaFileGrid({
  entries,
  selectedReferences,
  favorites,
  tileSize,
  isLoading,
  pageCounts,
  onSelectionChange,
  onActivate,
  onToggleFavorite,
  onAddSelection,
  onDragStart,
}: MediaFileGridProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0, scrollTop: 0 })
  /** Anchor for shift-click ranges — the last item selected without extending. */
  const anchorRef = useRef<string | null>(null)

  const selected = new Set(selectedReferences)
  const favoriteSet = new Set(favorites)

  const rowHeight = Math.round((tileSize / 16) * 9) + LABEL_HEIGHT + GRID_GAP
  const columns = Math.max(1, Math.floor((viewport.width + GRID_GAP) / (tileSize + GRID_GAP)))
  const rowCount = Math.ceil(entries.length / columns)

  const firstRow = Math.max(0, Math.floor(viewport.scrollTop / rowHeight) - OVERSCAN_ROWS)
  const lastRow = Math.min(
    rowCount,
    Math.ceil((viewport.scrollTop + viewport.height) / rowHeight) + OVERSCAN_ROWS
  )
  const visible = entries.slice(firstRow * columns, lastRow * columns)

  // Measured rather than assumed: the grid sits in a resizable panel, so
  // its width changes without any prop changing.
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const measure = () =>
      setViewport((current) => ({
        ...current,
        width: element.clientWidth,
        height: element.clientHeight,
      }))

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const select = useCallback(
    (entry: MediaEntry, modifiers: { additive: boolean; range: boolean }) => {
      if (modifiers.range && anchorRef.current) {
        const anchorIndex = entries.findIndex((candidate) => candidate.reference === anchorRef.current)
        const targetIndex = entries.findIndex((candidate) => candidate.reference === entry.reference)
        if (anchorIndex !== -1 && targetIndex !== -1) {
          const [from, to] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex]
          onSelectionChange(
            entries.slice(from, to + 1).map((candidate) => candidate.reference),
            entry.reference
          )
          return
        }
      }

      if (modifiers.additive) {
        const next = new Set(selectedReferences)
        if (next.has(entry.reference)) {
          next.delete(entry.reference)
        } else {
          next.add(entry.reference)
        }
        anchorRef.current = entry.reference
        onSelectionChange([...next], entry.reference)
        return
      }

      anchorRef.current = entry.reference
      onSelectionChange([entry.reference], entry.reference)
    },
    [entries, selectedReferences, onSelectionChange]
  )

  /** Arrow keys move by one tile (or one row), matching how a file manager's icon view behaves. */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault()
      onSelectionChange(
        entries.map((entry) => entry.reference),
        entries.at(-1)?.reference ?? null
      )
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      onAddSelection()
      return
    }

    const step =
      event.key === "ArrowRight" ? 1
      : event.key === "ArrowLeft" ? -1
      : event.key === "ArrowDown" ? columns
      : event.key === "ArrowUp" ? -columns
      : 0
    if (step === 0) return

    event.preventDefault()
    const currentIndex = entries.findIndex(
      (entry) => entry.reference === (selectedReferences.at(-1) ?? anchorRef.current)
    )
    const nextIndex = Math.min(entries.length - 1, Math.max(0, (currentIndex === -1 ? 0 : currentIndex) + step))
    const next = entries.at(nextIndex)
    if (!next) return

    anchorRef.current = next.reference
    onSelectionChange([next.reference], next.reference)

    // Keep the newly focused tile on screen — arrow-navigating past the
    // fold otherwise silently moves the selection out of view.
    const row = Math.floor(nextIndex / columns)
    const element = scrollRef.current
    if (!element) return
    const rowTop = row * rowHeight
    if (rowTop < element.scrollTop) element.scrollTop = rowTop
    else if (rowTop + rowHeight > element.scrollTop + element.clientHeight)
      element.scrollTop = rowTop + rowHeight - element.clientHeight
  }

  // A location change resets the range anchor — an anchor pointing at a
  // file that is no longer listed would produce a nonsensical range.
  useEffect(() => {
    if (!entries.some((entry) => entry.reference === anchorRef.current)) anchorRef.current = null
  }, [entries])

  if (!isLoading && entries.length === 0) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyTitle>{t("media.emptyDirectoryTitle")}</EmptyTitle>
          <EmptyDescription>{t("media.emptyDirectoryDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      role="grid"
      aria-label={t("media.fileGridLabel")}
      className="h-full min-h-0 overflow-y-auto outline-none"
      onScroll={(event) => setViewport((current) => ({ ...current, scrollTop: event.currentTarget.scrollTop }))}
      onKeyDown={handleKeyDown}
    >
      {/* Spacers hold the scrollbar at the full list's height while only the visible rows are mounted. */}
      <div style={{ height: firstRow * rowHeight }} />

      <div className="flex flex-wrap content-start" style={{ gap: GRID_GAP }}>
        {visible.map((entry) => (
          <MediaFileTile
            key={entry.reference}
            entry={entry}
            isSelected={selected.has(entry.reference)}
            isFavorite={favoriteSet.has(entry.reference)}
            size={tileSize}
            pageCount={pageCounts[entry.reference]}
            onSelect={select}
            onActivate={onActivate}
            onToggleFavorite={onToggleFavorite}
            onDragStart={onDragStart}
          />
        ))}
      </div>

      <div style={{ height: Math.max(0, (rowCount - lastRow) * rowHeight) }} />
    </div>
  )
}
