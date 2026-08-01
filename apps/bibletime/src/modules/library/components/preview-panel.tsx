import type { FolderItem } from "@/modules/library/interfaces"
import { resolveFolderItemContent } from "@/modules/library/lib/resolve-folder-item-content"
import { setLiveSlide } from "@/modules/library/services"
import type { SavedTemplate } from "@/modules/templates"
import { DEFAULT_SLIDE_TEMPLATE, SlideFrame } from "@/modules/presentation"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlayIcon } from "@hugeicons/core-free-icons"
import { useTranslation } from "@/modules/core/i18n"

interface PreviewPanelProps {
  item: FolderItem | undefined
  templates: SavedTemplate[]
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
export function PreviewPanel({ item, templates }: PreviewPanelProps) {
  const { t } = useTranslation()
  const content = item ? resolveFolderItemContent(item, templates) : undefined

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg">
        <SlideFrame
          template={content?.template ?? DEFAULT_SLIDE_TEMPLATE}
          text={content?.text}
          reference={content?.reference}
          emptyMessage={content?.emptyMessage ?? t("library.previewEmpty")}
          frameClassName="h-full w-full"
        />
      </div>

      <Button
        type="button"
        variant="default"
        disabled={!content}
        onClick={() => {
          if (!content) return
          window.open("/present", "bibletime-present")
          setLiveSlide({ text: content.text, reference: content.reference, template: content.template })
        }}
      >
        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
        {t("library.sendToOutput")}
      </Button>
    </div>
  )
}
