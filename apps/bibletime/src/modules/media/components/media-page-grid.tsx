import { useTranslation } from "@/modules/core/i18n"
import type { MediaDocument } from "@/modules/media/interfaces"
import { cn } from "@workspace/ui/lib/utils"

interface MediaPageGridProps {
  document: MediaDocument
  selectedPageIndex: number | null
  tileSize: number
  onSelectPage: (pageIndex: number) => void
  /** Double-click on a page — adds it and sends it to the output. */
  onActivatePage: (pageIndex: number) => void
}

/**
 * A document drilled into: its rendered pages, in order, each selectable and
 * addable on its own.
 *
 * Not windowed, unlike the file grid — a deck is tens of pages, not
 * thousands of files, and the pages are already rasterized and cached by
 * the time this renders.
 */
export function MediaPageGrid({
  document,
  selectedPageIndex,
  tileSize,
  onSelectPage,
  onActivatePage,
}: MediaPageGridProps) {
  const { t } = useTranslation()

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="flex flex-wrap content-start gap-3">
        {document.pages.map((page) => (
          <button
            key={page.reference}
            type="button"
            style={{ width: tileSize }}
            className={cn(
              "flex flex-col overflow-hidden rounded-lg border border-transparent bg-card text-left transition-colors duration-200 hover:border-border",
              selectedPageIndex === page.pageIndex && "border-ring"
            )}
            onClick={() => onSelectPage(page.pageIndex)}
            onDoubleClick={() => onActivatePage(page.pageIndex)}
          >
            <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted">
              <img src={page.reference} alt="" className="size-full object-contain" loading="lazy" />
            </div>
            <span className="px-2 py-1.5 text-xs text-muted-foreground">
              {t("media.pageNumber", { page: page.pageIndex + 1 })}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
