import { useTranslation } from "@/modules/core/i18n"
import type {
  MediaDocumentState,
  MediaEntry,
  MediaFit,
  MediaSlideData,
} from "@/modules/media/interfaces"
import { useResolvedMediaUrl } from "@/modules/media/actions/use-resolved-media-url"
import { mediaCapabilities } from "@/modules/media/services"
import { SlideFrame } from "@/modules/presentation"
import type { SlideTemplate } from "@/modules/presentation"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import type { SavedTemplate } from "@/modules/templates"

interface MediaPreviewColumnProps {
  /** The most recently selected file — what the preview shows. */
  entry: MediaEntry | undefined
  /** How many files are selected, so a multi-selection can say so. */
  selectionCount: number
  /** Conversion/rasterization progress for the selected document. */
  documentState: MediaDocumentState
  /** The page previewed while drilled into a document, if any. */
  previewPageIndex: number | null
  slide: MediaSlideData | undefined
  fit: MediaFit
  loop: boolean
  muted: boolean
  templates: SavedTemplate[]
  effectiveTemplateId: string | undefined
  effectiveTemplate: SlideTemplate
  hasOpenFolder: boolean
  canAdd: boolean
  onTemplateChange: (templateId: string) => void
  onFitChange: (fit: MediaFit) => void
  onLoopChange: (loop: boolean) => void
  onMutedChange: (muted: boolean) => void
  onAdd: () => void
  onAddAll: () => void
  onAddAsFolder: () => void
  onPresent: () => void
  onImportGoogleSlides: () => void
  onAddYouTube: () => void
}

/**
 * The Media tab's third column: what the selected file will look like on
 * the output, and the four ways to commit it.
 *
 * Every failure the pipeline can produce resolves to a named message here
 * rather than a spinner that never ends — an absent LibreOffice, an
 * unshared deck, an unreadable PDF, and a codec Chromium can't decode are
 * each actionable and each say what to do about it.
 */
export function MediaPreviewColumn({
  entry,
  selectionCount,
  documentState,
  previewPageIndex,
  slide,
  fit,
  loop,
  muted,
  templates,
  effectiveTemplateId,
  effectiveTemplate,
  hasOpenFolder,
  canAdd,
  onTemplateChange,
  onFitChange,
  onLoopChange,
  onMutedChange,
  onAdd,
  onAddAll,
  onAddAsFolder,
  onPresent,
  onImportGoogleSlides,
  onAddYouTube,
}: MediaPreviewColumnProps) {
  const { t } = useTranslation()
  // Resolved here rather than taken from the slide: `slide.src` is a stored
  // reference, which only a protocol-serving build can load directly.
  const { url: previewUrl } = useResolvedMediaUrl(slide?.src)

  const isDocument = entry?.kind === "document"
  const isUnsupported = entry?.unsupportedReason !== undefined

  /** One line under the preview describing whatever state the selection is in. */
  const statusMessage = (): string | null => {
    if (!entry) return null
    // A deck this build cannot convert is a different problem from a file
    // nothing can decode, and the user can act on it — so it says how.
    if (entry.unsupportedReason === "desktop-only") return t("media.status.deckNeedsDesktop")
    if (isUnsupported) return t("media.status.unsupported")

    switch (documentState.status) {
      case "converting":
        return t("media.status.converting")
      case "rendering":
        return documentState.totalPages > 0
          ? t("media.status.renderingProgress", {
              rendered: documentState.renderedPages,
              total: documentState.totalPages,
            })
          : t("media.status.rendering")
      case "failed":
        return t(`media.error.${documentState.error.code}`)
      case "ready":
        return t("media.status.readyPages", { count: documentState.document.pages.length })
      default:
        return null
    }
  }

  const status = statusMessage()
  const isBusy = documentState.status === "converting" || documentState.status === "rendering"
  const isFailed = documentState.status === "failed"

  // A document can only be added once its pages exist; an image or video is
  // addable as soon as it's selected and decodable.
  const canCommit = canAdd && !isUnsupported && !isBusy && !isFailed && (isDocument ? documentState.status === "ready" : Boolean(entry))

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <h2 className="shrink-0 text-xs font-semibold text-muted-foreground uppercase">{t("media.preview")}</h2>

      {templates.length > 0 ? (
        <Select
          items={templates.map((template) => ({ value: template.id, label: template.name }))}
          value={effectiveTemplateId}
          onValueChange={(value) => onTemplateChange(value as string)}
        >
          <SelectTrigger className="w-full shrink-0">
            <SelectValue placeholder={t("library.chooseTemplate")} />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
        <SlideFrame
          template={effectiveTemplate}
          media={slide}
          mediaUrl={previewUrl}
          emptyMessage={t("media.selectFileHint")}
          frameClassName="h-full w-full"
        />
      </div>

      {status ? (
        <p className={isFailed ? "shrink-0 text-xs text-destructive" : "shrink-0 text-xs text-muted-foreground"}>
          {status}
        </p>
      ) : null}

      {selectionCount > 1 ? (
        <p className="shrink-0 text-xs text-muted-foreground">
          {t("media.selectionCount", { count: selectionCount })}
        </p>
      ) : null}

      {previewPageIndex !== null && documentState.status === "ready" ? (
        <p className="shrink-0 text-xs text-muted-foreground">
          {t("media.pagePosition", {
            page: previewPageIndex + 1,
            total: documentState.document.pages.length,
          })}
        </p>
      ) : null}

      <div className="flex shrink-0 gap-2">
        <Select
          items={[
            { value: "contain", label: t("media.fitContain") },
            { value: "cover", label: t("media.fitCover") },
          ]}
          value={fit}
          onValueChange={(value) => onFitChange(value as MediaFit)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">{t("media.fitContain")}</SelectItem>
            <SelectItem value="cover">{t("media.fitCover")}</SelectItem>
          </SelectContent>
        </Select>

        {entry?.kind === "video" ? (
          <>
            <Button
              type="button"
              variant={loop ? "default" : "outline"}
              size="sm"
              onClick={() => onLoopChange(!loop)}
            >
              {t("media.loop")}
            </Button>
            <Button
              type="button"
              variant={muted ? "default" : "outline"}
              size="sm"
              onClick={() => onMutedChange(!muted)}
            >
              {t("media.mute")}
            </Button>
          </>
        ) : null}
      </div>

      {!hasOpenFolder ? (
        <p className="shrink-0 text-xs text-muted-foreground">{t("media.noOpenFolderHint")}</p>
      ) : null}

      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" className="flex-1" disabled={!canCommit} onClick={onAdd}>
          {t("media.add")}
        </Button>
        <Button type="button" className="flex-1" disabled={!canCommit || !hasOpenFolder} onClick={onPresent}>
          {t("library.present")}
        </Button>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" className="flex-1" disabled={!canAdd} onClick={onAddAll}>
          {t("media.addAll")}
        </Button>
        <Button type="button" variant="outline" className="flex-1" disabled={!canCommit} onClick={onAddAsFolder}>
          {t("media.addAsFolder")}
        </Button>
      </div>

      {/*
        The export endpoint is a cross-origin fetch only the main process can
        make, so in the browser this action is absent rather than offered and
        failing (see `enable-media-tab-on-web` design decision 7).
      */}
      {/* Needs no filesystem, so it is offered in every build. */}
      <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={onAddYouTube}>
        {t("media.addYouTube")}
      </Button>

      {mediaCapabilities().canImportGoogleSlides ? (
        <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={onImportGoogleSlides}>
          {t("media.importGoogleSlides")}
        </Button>
      ) : null}
    </div>
  )
}
