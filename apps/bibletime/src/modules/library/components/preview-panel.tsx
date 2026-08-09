import { useState } from "react"

import type { FolderItem } from "@/modules/library/interfaces"
import { useMediaAvailability } from "@/modules/media"
import { resolveFolderItemContent } from "@/modules/library/lib/resolve-folder-item-content"
import { openOutputWindow, setLiveSlide } from "@/modules/library/services"
import type { SavedTemplate } from "@/modules/templates"
import { DEFAULT_SLIDE_TEMPLATE, SlideFrame } from "@/modules/presentation"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlayIcon, Presentation01Icon, StickyNote01Icon } from "@hugeicons/core-free-icons"
import { useTranslation } from "@/modules/core/i18n"

interface PreviewPanelProps {
  item: FolderItem | undefined
  templates: SavedTemplate[]
  /** Repoints a media slide whose source file moved — the Relink action's write-back. */
  onRelinkMedia?: (itemId: string, src: string) => void
  /** Opens the speaker-notes editor for the previewed slide. */
  onEditNotes?: (itemId: string) => void
  /** Runs the open folder's slides as a slideshow, starting from this slide. */
  onStartSlideshow?: () => void
  /**
   * How the output currently is, and how to clear it — set only when a
   * slideshow left the output blanked. The console is where an operator
   * ends up after exiting, so it has to be able to undo a state it can
   * otherwise see no evidence of.
   */
  outputBlank?: "black" | "white" | null
  onRestoreOutput?: () => void
}

/**
 * The console shell's persistent right-hand pane: always rendered, shows
 * the most recently selected slide (or an empty state), and can send that
 * exact slide to the `/present` output window on demand — sending is an
 * explicit action, not automatic on every selection change.
 *
 * "Send to output" both opens the `/present` window (or refocuses it if
 * already open — `window.open` with a fixed window name reuses the same
 * window instead of spawning a duplicate, and Electron's `setWindowOpenHandler`
 * special-cases that URL into a clean, chrome-less window) and writes the
 * live slide payload, so the window's first paint already shows the right
 * content regardless of which happens first.
 */
export function PreviewPanel({
  item,
  templates,
  onRelinkMedia,
  onEditNotes,
  onStartSlideshow,
  outputBlank,
  onRestoreOutput,
}: PreviewPanelProps) {
  const { t } = useTranslation()
  const content = item ? resolveFolderItemContent(item, templates) : undefined
  const { isMissing, missingReason, url: mediaUrl, relink } = useMediaAvailability(content?.media)
  const [relinkNotice, setRelinkNotice] = useState<string | null>(null)

  const handleRelink = async () => {
    const outcome = await relink()
    if (outcome.status === "relinked" && item) {
      setRelinkNotice(null)
      onRelinkMedia?.(item.id, outcome.src)
      return
    }
    // A file outside every registered root can't be addressed by a
    // reference at all, so say what to do rather than failing silently.
    if (outcome.status === "outside-roots") setRelinkNotice(t("media.relinkOutsideRoots"))
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg">
        <SlideFrame
          template={content?.template ?? DEFAULT_SLIDE_TEMPLATE}
          media={content?.media}
          mediaUrl={mediaUrl}
          isMediaMissing={isMissing}
          text={content?.text}
          reference={content?.reference}
          versionLabel={content?.versionLabel}
          emptyMessage={
            content?.media && isMissing
              ? t(missingReason === "needs-reconnect" ? "media.needsReconnect" : "media.missingFile")
              : (content?.emptyMessage ?? t("library.previewEmpty"))
          }
          frameClassName="h-full w-full"
        />
      </div>

      {content?.media && isMissing && missingReason === "file-missing" ? (
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void handleRelink()}>
            {t("media.relink")}
          </Button>
          {relinkNotice ? <p className="text-xs text-destructive">{relinkNotice}</p> : null}
        </div>
      ) : null}

      {/* A blank set from the slideshow outlives it — the operator exits and
          the projector is still black, with nothing in the console saying
          so. This is that missing signal, and its undo. */}
      {outputBlank && onRestoreOutput ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">{t("library.outputBlanked")}</span>
          <Button type="button" variant="outline" size="sm" onClick={onRestoreOutput}>
            {t("library.restoreOutput")}
          </Button>
        </div>
      ) : null}

      <Button
        type="button"
        variant="default"
        disabled={!content || (Boolean(content.media) && isMissing)}
        onClick={() => {
          if (!content) return
          openOutputWindow()
          setLiveSlide({
            text: content.text,
            reference: content.reference,
            versionLabel: content.versionLabel,
            media: content.media,
            template: content.template,
          })
        }}
      >
        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
        {t("library.sendToOutput")}
      </Button>

      {onStartSlideshow ? (
        <Button type="button" variant="outline" disabled={!item} onClick={onStartSlideshow}>
          <HugeiconsIcon icon={Presentation01Icon} strokeWidth={2} />
          {t("library.startSlideshow")}
        </Button>
      ) : null}

      {item && onEditNotes ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEditNotes(item.id)}
        >
          <HugeiconsIcon icon={StickyNote01Icon} strokeWidth={2} />
          {t("library.slideNotes")}
        </Button>
      ) : null}
    </div>
  )
}
