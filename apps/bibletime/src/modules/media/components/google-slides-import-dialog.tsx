import { useState } from "react"

import { useTranslation } from "@/modules/core/i18n"
import type { MediaDocument, MediaDocumentError } from "@/modules/media/interfaces"
import { importGoogleSlides } from "@/modules/media/services"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

interface GoogleSlidesImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Hands the imported deck back so the panel can preview it and offer the add actions. */
  onImported: (document: MediaDocument) => void
}

type ImportState =
  | { status: "idle" }
  | { status: "importing"; renderedPages: number; totalPages: number }
  | { status: "failed"; error: MediaDocumentError }

/**
 * Imports a Google Slides deck by URL. The deck is fetched as PDF in the
 * main process and rasterized like any other PDF, so what lands in the
 * folder is an ordered set of page images — a snapshot, not a live link.
 */
export function GoogleSlidesImportDialog({ open, onOpenChange, onImported }: GoogleSlidesImportDialogProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [state, setState] = useState<ImportState>({ status: "idle" })

  const handleImport = async () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    setState({ status: "importing", renderedPages: 0, totalPages: 0 })

    const result = await importGoogleSlides(trimmedUrl, title.trim() || t("media.googleSlidesDefaultTitle"), {
      // Passed in rather than read inside, so the content key that
      // identifies this snapshot is stamped once at the call site.
      fetchedAt: Date.now(),
      onProgress: (renderedPages, totalPages) =>
        setState({ status: "importing", renderedPages, totalPages }),
    })

    if (!result.ok) {
      setState({ status: "failed", error: result.error })
      return
    }

    setState({ status: "idle" })
    setUrl("")
    setTitle("")
    onImported(result.document)
    onOpenChange(false)
  }

  const isImporting = state.status === "importing"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("media.importGoogleSlides")}</DialogTitle>
          <DialogDescription>{t("media.googleSlidesDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={t("media.googleSlidesUrlPlaceholder")}
            aria-label={t("media.googleSlidesUrlPlaceholder")}
            disabled={isImporting}
          />
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("media.googleSlidesTitlePlaceholder")}
            aria-label={t("media.googleSlidesTitlePlaceholder")}
            disabled={isImporting}
          />

          {state.status === "importing" ? (
            <p className="text-xs text-muted-foreground">
              {state.totalPages > 0
                ? t("media.status.renderingProgress", {
                    rendered: state.renderedPages,
                    total: state.totalPages,
                  })
                : t("media.status.fetchingDeck")}
            </p>
          ) : null}

          {state.status === "failed" ? (
            <p className="text-xs text-destructive">{t(`media.error.${state.error.code}`)}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" disabled={isImporting} onClick={() => onOpenChange(false)}>
            {t("media.cancel")}
          </Button>
          <Button type="button" disabled={isImporting || !url.trim()} onClick={() => void handleImport()}>
            {t("media.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
