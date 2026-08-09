import { useEffect, useRef } from "react"

import type { FolderItem } from "@/modules/library/interfaces"
import { resolveFolderItemContent } from "@/modules/library/lib/resolve-folder-item-content"
import { useMediaAvailability } from "@/modules/media"
import { useAspectRatio } from "@/modules/core/aspect-ratio"
import { SlidePreview, useElementWidthScale } from "@/modules/presentation"
import type { SavedTemplate } from "@/modules/templates"
import { cn } from "@workspace/ui/lib/utils"

interface FilmstripProps {
  items: FolderItem[]
  currentItemId: string | undefined
  templates: SavedTemplate[]
  onSelect: (itemId: string) => void
}

/**
 * One numbered thumbnail. Split out because each needs its own media
 * resolution and width-derived font scale — both hooks, so they cannot run
 * in a loop inside the strip.
 */
function FilmstripThumbnail({
  item,
  index,
  isCurrent,
  templates,
  onSelect,
}: {
  item: FolderItem
  index: number
  isCurrent: boolean
  templates: SavedTemplate[]
  onSelect: (itemId: string) => void
}) {
  const { ratio } = useAspectRatio()
  const { elementRef, scale } = useElementWidthScale()
  const content = resolveFolderItemContent(item, templates)
  const { isMissing, url: mediaUrl } = useMediaAvailability(content.media)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Keeps the current slide in view as the deck advances past the visible
  // range — `nearest` so an already-visible thumbnail never jerks the strip.
  useEffect(() => {
    if (isCurrent) buttonRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [isCurrent])

  return (
    <li className="flex shrink-0 items-start gap-1.5">
      <span
        className={cn(
          "w-4 pt-1 text-right text-[10px] tabular-nums",
          isCurrent ? "text-white" : "text-white/35"
        )}
      >
        {index + 1}
      </span>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={isCurrent ? "true" : undefined}
        className={cn(
          "w-36 overflow-hidden rounded-md border-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          isCurrent ? "border-ring" : "border-transparent hover:border-white/25"
        )}
      >
        <div style={{ aspectRatio: ratio }} ref={elementRef}>
          <SlidePreview
            template={content.template}
            media={content.media}
            mediaUrl={mediaUrl}
            isMediaMissing={isMissing}
            text={content.text}
            reference={content.reference}
            versionLabel={content.versionLabel}
            // Every thumbnail is a still: a deck's worth of live slides
            // would be a deck's worth of video decoders and WebGL contexts.
            playback="still"
            silent
            emptyMessage={content.emptyMessage}
            scale={scale}
            className="h-full w-full rounded-none px-4 py-4"
          />
        </div>
      </button>
    </li>
  )
}

/**
 * The whole deck, in order, as a scrollable strip — the "jump anywhere"
 * affordance that keeps a mis-ordered service recoverable in one click.
 */
export function Filmstrip({ items, currentItemId, templates, onSelect }: FilmstripProps) {
  return (
    <ul className="flex gap-3 overflow-x-auto pb-1">
      {items.map((item, index) => (
        <FilmstripThumbnail
          key={item.id}
          item={item}
          index={index}
          isCurrent={item.id === currentItemId}
          templates={templates}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}
