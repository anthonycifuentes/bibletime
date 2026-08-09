import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import type { FolderItem } from "@/modules/library/interfaces"
import { useMediaAvailability } from "@/modules/media"
import { resolveFolderItemContent } from "@/modules/library/lib/resolve-folder-item-content"
import type { SavedTemplate } from "@/modules/templates"
import { useAspectRatio } from "@/modules/core/aspect-ratio"
import { SlidePreview, useElementWidthScale } from "@/modules/presentation"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  GalleryThumbnailsIcon,
  GripVerticalIcon,
  PaintBoardIcon,
  PencilEdit02Icon,
  PlayIcon,
  StickyNote01Icon,
} from "@hugeicons/core-free-icons"
import { useTranslation } from "@/modules/core/i18n"

// A real `border`, not a `ring` box-shadow: an outset ring gets clipped by
// the grid's scroll container near its edges (overflow-y-auto forces the
// other axis to clip too), and an inset ring is painted *underneath* the
// card's own content per the CSS box-shadow spec — since the preview/label
// fill the card edge-to-edge with no gap, an inset ring is fully covered by
// them. A `border` reserves its own space in the box model (box-sizing:
// border-box), so children lay out inside it and can never paint over it,
// and it isn't a box-shadow at all, so no ancestor clipping applies either.
const SELECTED_BORDER = "border-ring"

interface SlideCardProps {
  item: FolderItem
  isSelected: boolean
  templates: SavedTemplate[]
  onSelect: (itemId: string, additive: boolean) => void
  /** Called when the card is double-clicked — presents this slide immediately. */
  onPresent: (itemId: string) => void
  /** Called from the card's context menu — removes this one slide. */
  onDelete: (itemId: string) => void
  /** Called from the card's context menu — renames this slide's caption. Only offered for song slides (see `canRenameCaption`). */
  onRename: (itemId: string, label: string) => void
  /** Called from the card's context menu — opens the per-slide style editor for this one slide. */
  onEditStyle: (itemId: string) => void
  /** Called from the card's context menu — opens the speaker-notes editor for this one slide. */
  onEditNotes: (itemId: string) => void
}

/**
 * Whether this slide's caption is the user's to name. A song section's label
 * is a choice ("Verse 2" may really be a pre-chorus); a verse's reference and
 * a media slide's filename are derived from the content itself, so renaming
 * them would just make the card lie about what it holds.
 */
const canRenameCaption = (item: FolderItem): boolean => item.type === "song"

/**
 * One card in the slide console's grid — the live preview only. Reordering
 * is drag-and-drop via the floating handle above the card (the only drag
 * trigger — the card body itself stays click-to-select, double-click-to-present).
 * Right-click (or long-press) opens a context menu with the same
 * prepare/present actions plus delete — the same three options offered for
 * a slide in the sidebar tree.
 */
export function SlideCard({
  item,
  isSelected,
  templates,
  onSelect,
  onPresent,
  onDelete,
  onRename,
  onEditStyle,
  onEditNotes,
}: SlideCardProps) {
  const { t } = useTranslation()
  const { ratio } = useAspectRatio()
  const { elementRef, scale } = useElementWidthScale()
  const content = resolveFolderItemContent(item, templates)
  const { isMissing, missingReason, url: mediaUrl } = useMediaAvailability(content.media)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const [isRenaming, setIsRenaming] = useState(false)
  const [draftCaption, setDraftCaption] = useState("")

  const startRename = () => {
    setDraftCaption(content.caption ?? "")
    setIsRenaming(true)
  }

  const commitRename = () => {
    onRename(item.id, draftCaption)
    setIsRenaming(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-50")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute -top-3 right-0 z-10 flex size-6 touch-none items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm active:cursor-grabbing"
      >
        <HugeiconsIcon icon={GripVerticalIcon} size={14} strokeWidth={2} />
        <span className="sr-only">{t("library.dragToReorder")}</span>
      </button>

      <ContextMenu>
        <ContextMenuTrigger
          role="button"
          tabIndex={0}
          onClick={(event) => onSelect(item.id, event.metaKey || event.ctrlKey || event.shiftKey)}
          onDoubleClick={() => onPresent(item.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              onSelect(item.id, event.metaKey || event.ctrlKey || event.shiftKey)
            }
          }}
          className={cn(
            "cursor-pointer overflow-hidden rounded-3xl border-2 transition-colors",
            isSelected ? SELECTED_BORDER : "border-transparent hover:border-ring/50"
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
              emptyMessage={
                content.media && isMissing
                  ? t(missingReason === "needs-reconnect" ? "media.needsReconnect" : "media.missingFile")
                  : content.emptyMessage
              }
              scale={scale}
              className="h-full w-full rounded-none px-6 py-6"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-card px-3 py-2">
            {/* Kept in flow while renaming so the card doesn't change height. */}
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-sm font-medium text-foreground",
                isRenaming && "invisible"
              )}
            >
              {content.caption || " "}
            </p>
            {/* Marks the slide as carrying notes without spending caption
                width on them — the notes themselves belong to the slideshow,
                and must never be rendered onto the slide area above. */}
            {item.speakerNotes && !isRenaming ? (
              <HugeiconsIcon
                icon={StickyNote01Icon}
                size={14}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground"
                aria-label={t("library.slideHasNotes")}
              />
            ) : null}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onSelect(item.id, false)}>
            <HugeiconsIcon icon={GalleryThumbnailsIcon} strokeWidth={2} />
            {t("library.prepareSlide")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onPresent(item.id)}>
            <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
            {t("library.present")}
          </ContextMenuItem>
          {canRenameCaption(item) ? (
            <ContextMenuItem onClick={startRename}>
              <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
              {t("library.renameSlide")}
            </ContextMenuItem>
          ) : null}
          <ContextMenuItem onClick={() => onEditStyle(item.id)}>
            <HugeiconsIcon icon={PaintBoardIcon} strokeWidth={2} />
            {t("library.editStyle")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onEditNotes(item.id)}>
            <HugeiconsIcon icon={StickyNote01Icon} strokeWidth={2} />
            {t("library.slideNotes")}
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={() => onDelete(item.id)}>
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            {t("library.deleteSlide")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Overlaid rather than nested inside the trigger, so typing in it
          can't be read as a click-to-select on the card underneath. */}
      {isRenaming ? (
        <Input
          autoFocus
          value={draftCaption}
          onChange={(event) => setDraftCaption(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              commitRename()
            }
            if (event.key === "Escape") setIsRenaming(false)
          }}
          aria-label={t("library.renameSlide")}
          className="absolute right-3 bottom-2 left-3 h-7 w-auto px-2 text-sm"
        />
      ) : null}
    </div>
  )
}
