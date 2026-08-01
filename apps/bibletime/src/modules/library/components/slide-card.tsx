import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import type { FolderItem } from "@/modules/library/interfaces"
import { resolveFolderItemContent } from "@/modules/library/lib/resolve-folder-item-content"
import type { SavedTemplate } from "@/modules/templates"
import { useAspectRatio } from "@/modules/core/aspect-ratio"
import { SlidePreview, useElementWidthScale } from "@/modules/presentation"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { GripVerticalIcon } from "@hugeicons/core-free-icons"
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
}

/**
 * One card in the slide console's grid — the live preview only. Reordering
 * is drag-and-drop via the floating handle above the card (the only drag
 * trigger — the card body itself stays click-to-select).
 */
export function SlideCard({ item, isSelected, templates, onSelect }: SlideCardProps) {
  const { t } = useTranslation()
  const { ratio } = useAspectRatio()
  const { elementRef, scale } = useElementWidthScale()
  const content = resolveFolderItemContent(item, templates)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

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

      <div
        role="button"
        tabIndex={0}
        onClick={(event) => onSelect(item.id, event.metaKey || event.ctrlKey || event.shiftKey)}
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
            text={content.text}
            reference={content.reference}
            emptyMessage={content.emptyMessage}
            scale={scale}
            className="h-full w-full rounded-none px-6 py-6"
          />
        </div>

        <div className="bg-card px-3 py-2">
          <p className="truncate text-sm font-medium text-foreground">
            {content.reference || " "}
          </p>
        </div>
      </div>
    </div>
  )
}
