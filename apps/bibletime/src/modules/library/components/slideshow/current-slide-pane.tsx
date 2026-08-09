import type { FolderItem } from "@/modules/library/interfaces"
import { resolveFolderItemContent } from "@/modules/library/lib/resolve-folder-item-content"
import { useMediaAvailability } from "@/modules/media"
import { DEFAULT_SLIDE_TEMPLATE, SlideFrame } from "@/modules/presentation"
import type { SavedTemplate } from "@/modules/templates"
import { useTranslation } from "@/modules/core/i18n"
import { cn } from "@workspace/ui/lib/utils"

interface CurrentSlidePaneProps {
  item: FolderItem | undefined
  templates: SavedTemplate[]
  /** Mirrors the output's blanked state, so the operator can see the room is dark. */
  blank: "black" | "white" | null
  /** Clicking the slide advances — the pointer equivalent of pressing space. */
  onAdvance: () => void
}

/**
 * What the room is seeing, right now.
 *
 * The one pane rendered `playback="live"`: video plays, animated backgrounds
 * run. An operator usually cannot see the projector, so a still image here
 * would leave them guessing whether the countdown is actually counting. It
 * is `silent`, though — the output window is already playing this file, and
 * two decoders a few milliseconds apart is an audible echo.
 *
 * A blank is drawn as a thin frame and label rather than by covering the
 * slide: the projector is dark, but the operator still needs to see what
 * will come back.
 */
export function CurrentSlidePane({ item, templates, blank, onAdvance }: CurrentSlidePaneProps) {
  const { t } = useTranslation()
  const content = item ? resolveFolderItemContent(item, templates) : undefined
  const { isMissing, missingReason, url: mediaUrl } = useMediaAvailability(content?.media)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onAdvance}
        aria-label={t("slideshow.next")}
        className="min-h-0 flex-1 cursor-pointer overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <SlideFrame
          template={content?.template ?? DEFAULT_SLIDE_TEMPLATE}
          media={content?.media}
          mediaUrl={mediaUrl}
          isMediaMissing={isMissing}
          text={content?.text}
          reference={content?.reference}
          versionLabel={content?.versionLabel}
          silent
          emptyMessage={
            content?.media && isMissing
              ? t(missingReason === "needs-reconnect" ? "media.needsReconnect" : "media.missingFile")
              : (content?.emptyMessage ?? t("slideshow.empty"))
          }
          frameClassName="h-full w-full"
        />
      </button>

      {blank ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset",
            blank === "white" ? "ring-white/70" : "ring-white/40"
          )}
        >
          <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-3 py-1 text-xs font-medium tracking-wide text-white uppercase">
            {blank === "white" ? t("slideshow.blankedWhite") : t("slideshow.blankedBlack")}
          </span>
        </div>
      ) : null}
    </div>
  )
}
