import { useTranslation } from "@/modules/core/i18n"
import { useMediaThumbnail } from "@/modules/media/actions/use-media-thumbnail"
import type { MediaEntry } from "@/modules/media/interfaces"
import { mediaCapabilities, revealMediaInFolder } from "@/modules/media/services"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  File01Icon,
  FolderOpenIcon,
  Image01Icon,
  StarIcon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons"

const KIND_ICON = {
  image: Image01Icon,
  video: VideoReplayIcon,
  document: File01Icon,
}

interface MediaFileTileProps {
  entry: MediaEntry
  isSelected: boolean
  isFavorite: boolean
  /** Tile width in pixels, from the grid's size slider. */
  size: number
  /** Page count, once the document has been rendered — documents only. */
  pageCount?: number
  onSelect: (entry: MediaEntry, modifiers: { additive: boolean; range: boolean }) => void
  onActivate: (entry: MediaEntry) => void
  onToggleFavorite: (entry: MediaEntry, isFavorite: boolean) => void
  onDragStart: (entry: MediaEntry) => void
}

/**
 * One file in the grid. The thumbnail is requested only once this tile
 * actually intersects the viewport (see `useMediaThumbnail`), so a
 * directory of hundreds of photos decodes what's on screen rather than all
 * of it.
 */
export function MediaFileTile({
  entry,
  isSelected,
  isFavorite,
  size,
  pageCount,
  onSelect,
  onActivate,
  onToggleFavorite,
  onDragStart,
}: MediaFileTileProps) {
  const { t } = useTranslation()
  const thumbnail = useMediaThumbnail(entry)

  const isUnsupported = entry.unsupportedReason !== undefined

  return (
    <ContextMenu>
      <ContextMenuTrigger
        ref={thumbnail.ref}
        // A real border rather than a ring, for the same reason `SlideCard`
        // uses one: an outset ring is clipped by the scroll container.
        className={cn(
          "group flex cursor-default flex-col overflow-hidden rounded-lg border border-transparent bg-card transition-colors duration-200 hover:border-border",
          isSelected && "border-ring",
          isUnsupported && "opacity-60"
        )}
        style={{ width: size }}
        draggable={!isUnsupported}
        onDragStart={() => onDragStart(entry)}
        onClick={(event) =>
          onSelect(entry, { additive: event.metaKey || event.ctrlKey, range: event.shiftKey })
        }
        onDoubleClick={() => {
          if (!isUnsupported) onActivate(entry)
        }}
      >
        <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted">
          {thumbnail.reference ? (
            <img src={thumbnail.reference} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <HugeiconsIcon
              icon={isUnsupported ? Alert02Icon : KIND_ICON[entry.kind]}
              size={24}
              strokeWidth={1.5}
              className={cn("text-muted-foreground", isUnsupported && "text-destructive")}
            />
          )}

          {thumbnail.isGenerating ? (
            <div className="absolute inset-0 animate-pulse bg-foreground/5" />
          ) : null}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite(entry, !isFavorite)
            }}
            className={cn(
              "absolute top-1 right-1 rounded-md bg-background/70 p-1 transition-opacity duration-200",
              isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            aria-label={t(isFavorite ? "media.unstar" : "media.star")}
          >
            <HugeiconsIcon
              icon={StarIcon}
              size={12}
              strokeWidth={2}
              className={cn(isFavorite && "text-ring")}
            />
          </button>

          {entry.kind === "document" && pageCount !== undefined ? (
            <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1 text-[10px] font-medium">
              {t("media.pageCount", { count: pageCount })}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="truncate text-xs" title={entry.name}>
            {entry.name}
          </span>
          {/*
            The two unsupported reasons have different remedies, so they get
            different copy: a codec problem needs the file converted, while a
            deck only this build cannot open needs a PDF export.
          */}
          {entry.unsupportedReason === "desktop-only" ? (
            <span className="truncate text-[10px] text-muted-foreground">{t("media.deckNeedsDesktop")}</span>
          ) : isUnsupported ? (
            <span className="truncate text-[10px] text-destructive">{t("media.unsupportedFile")}</span>
          ) : null}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        {mediaCapabilities().canRevealInFolder ? (
          <ContextMenuItem onClick={() => void revealMediaInFolder(entry.reference)}>
            <HugeiconsIcon icon={FolderOpenIcon} strokeWidth={2} />
            {t("media.revealInFolder")}
          </ContextMenuItem>
        ) : null}
        <ContextMenuItem onClick={() => onToggleFavorite(entry, !isFavorite)}>
          <HugeiconsIcon icon={StarIcon} strokeWidth={2} />
          {t(isFavorite ? "media.unstar" : "media.star")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
