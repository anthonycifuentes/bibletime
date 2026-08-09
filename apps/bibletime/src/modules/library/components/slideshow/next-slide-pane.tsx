import type { FolderItem } from "@/modules/library/interfaces"
import { resolveFolderItemContent } from "@/modules/library/lib/resolve-folder-item-content"
import { useMediaAvailability } from "@/modules/media"
import { useAspectRatio } from "@/modules/core/aspect-ratio"
import { SlidePreview, useElementWidthScale } from "@/modules/presentation"
import type { SavedTemplate } from "@/modules/templates"
import { useTranslation } from "@/modules/core/i18n"

interface NextSlidePaneProps {
  item: FolderItem | undefined
  templates: SavedTemplate[]
}

/**
 * The slide one press away.
 *
 * Sized off its own width against the configured ratio rather than through
 * `SlideFrame`: this column has a definite width and the pane should be
 * exactly as tall as that ratio makes it, which is the case `SlideFrame`'s
 * doc comment points at its own alternative for.
 *
 * Rendered `playback="still"` — nothing here is being watched yet, and
 * mounting a second video decoder (or a second WebGL context) for it is the
 * cost that mode exists to avoid.
 */
export function NextSlidePane({ item, templates }: NextSlidePaneProps) {
  const { t } = useTranslation()
  const { ratio } = useAspectRatio()
  const { elementRef, scale } = useElementWidthScale()
  const content = item ? resolveFolderItemContent(item, templates) : undefined
  const { isMissing, missingReason, url: mediaUrl } = useMediaAvailability(content?.media)

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium tracking-wide text-white/50 uppercase">
        {t("slideshow.nextSlide")}
      </h2>

      {item && content ? (
        <div style={{ aspectRatio: ratio }} ref={elementRef} className="overflow-hidden rounded-lg">
          <SlidePreview
            template={content.template}
            media={content.media}
            mediaUrl={mediaUrl}
            isMediaMissing={isMissing}
            text={content.text}
            reference={content.reference}
            versionLabel={content.versionLabel}
            playback="still"
            silent
            emptyMessage={
              content.media && isMissing
                ? t(missingReason === "needs-reconnect" ? "media.needsReconnect" : "media.missingFile")
                : content.emptyMessage
            }
            scale={scale}
            className="h-full w-full rounded-none"
          />
        </div>
      ) : (
        <div
          style={{ aspectRatio: ratio }}
          className="flex items-center justify-center rounded-lg border border-dashed border-white/15 px-4 text-center"
        >
          <p className="text-xs text-white/40">{t("slideshow.endOfDeck")}</p>
        </div>
      )}
    </section>
  )
}
