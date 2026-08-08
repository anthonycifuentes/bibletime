import { useMemo, useState } from "react"

import { useTranslation } from "@/modules/core/i18n"
import { useDocumentPages } from "@/modules/media/actions/use-document-pages"
import { useMediaDirectory } from "@/modules/media/actions/use-media-directory"
import { useMediaRoots } from "@/modules/media/actions/use-media-roots"
import { GoogleSlidesImportDialog } from "@/modules/media/components/google-slides-import-dialog"
import { MediaExplorerTree } from "@/modules/media/components/media-explorer-tree"
import { MediaFileGrid } from "@/modules/media/components/media-file-grid"
import { MediaGridToolbar } from "@/modules/media/components/media-grid-toolbar"
import { MediaPageGrid } from "@/modules/media/components/media-page-grid"
import { MediaPreviewColumn } from "@/modules/media/components/media-preview-column"
import type {
  MediaDocument,
  MediaEntry,
  MediaFit,
  MediaLocation,
  MediaSlideData,
  MediaViewSettings,
} from "@/modules/media/interfaces"
import {
  buildDocumentPageSlide,
  buildDocumentSlides,
  buildEntrySlide,
  DEFAULT_MEDIA_FIT,
} from "@/modules/media/lib/build-media-slide"
import { writeMediaDragPayload } from "@/modules/media/lib/media-drag"
import { visibleMediaEntries } from "@/modules/media/lib/sort-media-entries"
import { useTemplates } from "@/modules/templates"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"

interface MediaPickerPanelProps {
  /** Whether a Library folder is open — "Present" needs one; the add actions create one when there isn't. */
  hasOpenFolder: boolean
  location: MediaLocation
  selectedReferences: string[]
  lastSelectedReference: string | null
  view: MediaViewSettings
  onLocationChange: (location: MediaLocation) => void
  onSelectionChange: (references: string[], lastReference: string | null) => void
  onViewChange: (view: MediaViewSettings) => void
  /** Appends slides to the open folder, creating one at the root when none is open. */
  onAddMedia: (slides: MediaSlideData[], templateId: string | undefined) => void
  /** Creates a folder named `name` holding `slides`, in one write. */
  onAddMediaFolder: (name: string, slides: MediaSlideData[], templateId: string | undefined) => void
  /** Sends a slide straight to the output — the library module owns `setLiveSlide`, so this panel asks rather than reaching for it. */
  onPresentMedia: (slide: MediaSlideData, templateId: string | undefined) => void
}

/**
 * The Media tab: three columns — a file explorer over the registered roots,
 * a thumbnail grid of the selected directory, and a preview with the add
 * actions. Modeled on `BiblePickerPanel`'s and `SongsPickerPanel`'s
 * browse → select → preview → explicitly-add grammar, so there is one
 * interaction to learn across all three content tabs.
 *
 * Desktop-only by design: a media library is a view onto a filesystem the
 * web build cannot reach (see `add-media-tab` design decision 9).
 */
export function MediaPickerPanel({
  hasOpenFolder,
  location,
  selectedReferences,
  lastSelectedReference,
  view,
  onLocationChange,
  onSelectionChange,
  onViewChange,
  onAddMedia,
  onAddMediaFolder,
  onPresentMedia,
}: MediaPickerPanelProps) {
  const { t } = useTranslation()
  const roots = useMediaRoots()
  const { activeId, activeTemplate, templates } = useTemplates()

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined)
  const [fit, setFit] = useState<MediaFit>(DEFAULT_MEDIA_FIT)
  const [loop, setLoop] = useState(false)
  const [muted, setMuted] = useState(true)
  const [isImportOpen, setIsImportOpen] = useState(false)
  /** Set while drilled into a document, or holding an imported Google Slides deck (which has no directory entry). */
  const [openDocument, setOpenDocument] = useState<MediaDocument | null>(null)
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null)

  const rootIds = useMemo(() => roots.roots.map((root) => root.id), [roots.roots])
  const directory = useMediaDirectory(location, { rootIds, favorites: roots.favorites })

  // Same one-off-choice semantics as the Bible tab: picking a template here
  // applies to this add, and doesn't change what the Templates tab reports.
  const effectiveTemplateId = selectedTemplateId ?? activeId
  const effectiveTemplate =
    templates.find((template) => template.id === effectiveTemplateId)?.template ?? activeTemplate

  const entries = useMemo(() => visibleMediaEntries(directory.entries, view), [directory.entries, view])
  const hiddenCount = directory.entries.length - entries.length

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedReferences.includes(entry.reference)),
    [entries, selectedReferences]
  )
  const previewEntry = useMemo(
    () => entries.find((entry) => entry.reference === lastSelectedReference),
    [entries, lastSelectedReference]
  )

  // Only a document that is actually selected is converted — this is what
  // makes selection, not adding, the trigger for the deck pipeline.
  const documentState = useDocumentPages(previewEntry?.kind === "document" ? previewEntry : undefined)

  const activeDocument =
    openDocument ?? (documentState.status === "ready" ? documentState.document : null)

  const pageCounts = useMemo(
    () =>
      documentState.status === "ready" && previewEntry
        ? { [previewEntry.reference]: documentState.document.pages.length }
        : {},
    [documentState, previewEntry]
  )

  /** What the preview column shows: a drilled-into page, else the selected file. */
  const previewSlide: MediaSlideData | undefined = useMemo(() => {
    if (openDocument && selectedPageIndex !== null) {
      return buildDocumentPageSlide(openDocument, selectedPageIndex, { fit })
    }
    if (!previewEntry) return undefined
    if (previewEntry.kind === "document") {
      return documentState.status === "ready"
        ? buildDocumentPageSlide(documentState.document, 0, { fit })
        : undefined
    }
    return buildEntrySlide(previewEntry, { fit, loop, muted })
  }, [openDocument, selectedPageIndex, previewEntry, documentState, fit, loop, muted])

  /** The slides the Add action commits — a drilled-into page, a whole deck, or the selected files. */
  const slidesToAdd = (): MediaSlideData[] => {
    if (openDocument) {
      return selectedPageIndex !== null
        ? [buildDocumentPageSlide(openDocument, selectedPageIndex, { fit })].filter(
            (slide): slide is MediaSlideData => slide !== undefined
          )
        : buildDocumentSlides(openDocument, { fit })
    }

    if (previewEntry?.kind === "document" && documentState.status === "ready") {
      return buildDocumentSlides(documentState.document, { fit })
    }

    const targets = selectedEntries.length > 0 ? selectedEntries : previewEntry ? [previewEntry] : []
    return targets
      .filter((entry) => entry.kind !== "document" && !entry.unsupportedReason)
      .map((entry) => buildEntrySlide(entry, { fit, loop, muted }))
  }

  const handleAdd = () => {
    const slides = slidesToAdd()
    if (slides.length > 0) onAddMedia(slides, effectiveTemplateId)
  }

  const handleAddAll = () => {
    const slides = entries
      .filter((entry) => entry.kind !== "document" && !entry.unsupportedReason)
      .map((entry) => buildEntrySlide(entry, { fit, loop, muted }))
    if (slides.length > 0) onAddMedia(slides, effectiveTemplateId)
  }

  /** A deck becomes a folder named after it; a multi-file selection, a folder named after its directory. */
  const handleAddAsFolder = () => {
    if (activeDocument) {
      onAddMediaFolder(activeDocument.title, buildDocumentSlides(activeDocument, { fit }), effectiveTemplateId)
      return
    }

    const slides = slidesToAdd()
    if (slides.length === 0) return

    const directoryName =
      location.kind === "directory"
        ? (location.relativePath.split("/").pop() ??
          roots.roots.find((root) => root.id === location.rootId)?.label ??
          t("media.newFolderFallback"))
        : t("media.newFolderFallback")

    onAddMediaFolder(directoryName, slides, effectiveTemplateId)
  }

  const handlePresent = () => {
    if (previewSlide) onPresentMedia(previewSlide, effectiveTemplateId)
  }

  /** Double-click: a document drills in, anything else is added and presented at once. */
  const handleActivate = (entry: MediaEntry) => {
    if (entry.kind === "document") {
      if (documentState.status === "ready") {
        setOpenDocument(documentState.document)
        setSelectedPageIndex(0)
      }
      return
    }

    const slide = buildEntrySlide(entry, { fit, loop, muted })
    onAddMedia([slide], effectiveTemplateId)
    onPresentMedia(slide, effectiveTemplateId)
  }

  const handleDragStart = (entry: MediaEntry) => {
    if (entry.kind === "document") return
    // Reuses the selection when the dragged tile is part of it, so dragging
    // one of six selected photos moves all six.
    const dragged = selectedReferences.includes(entry.reference) ? selectedEntries : [entry]
    const slides = dragged
      .filter((candidate) => candidate.kind !== "document" && !candidate.unsupportedReason)
      .map((candidate) => buildEntrySlide(candidate, { fit, loop, muted }))
    if (slides.length > 0) writeMediaDragPayload(slides)
  }

  if (!roots.isAvailable) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyTitle>{t("media.desktopOnlyTitle")}</EmptyTitle>
          <EmptyDescription>{t("media.desktopOnlyDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[minmax(180px,240px)_1fr_minmax(240px,300px)]">
      <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
        <h2 className="shrink-0 text-xs font-semibold text-muted-foreground uppercase">{t("media.explorer")}</h2>
        <MediaExplorerTree
          roots={roots.roots}
          location={location}
          onSelectLocation={(next) => {
            onLocationChange(next)
            setOpenDocument(null)
            setSelectedPageIndex(null)
          }}
          onAddRoot={() => void roots.addRoot()}
          onAddRootByPath={(directoryPath) => void roots.addRootByPath(directoryPath)}
          onRemoveRoot={(rootId) => void roots.removeRoot(rootId)}
          onRelocateRoot={(rootId) => void roots.relocateRoot(rootId)}
        />
      </div>

      <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
        <MediaGridToolbar
          view={view}
          onViewChange={onViewChange}
          onRefresh={() => void directory.refresh()}
          hiddenCount={hiddenCount}
          documentTitle={openDocument?.title}
          onBack={() => {
            setOpenDocument(null)
            setSelectedPageIndex(null)
          }}
        />

        {directory.isUnreadable ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyTitle>{t("media.unreadableTitle")}</EmptyTitle>
              <EmptyDescription>{t("media.unreadableDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : openDocument ? (
          <MediaPageGrid
            document={openDocument}
            selectedPageIndex={selectedPageIndex}
            tileSize={view.thumbnailSize}
            onSelectPage={setSelectedPageIndex}
            onActivatePage={(pageIndex) => {
              const slide = buildDocumentPageSlide(openDocument, pageIndex, { fit })
              if (!slide) return
              setSelectedPageIndex(pageIndex)
              onAddMedia([slide], effectiveTemplateId)
              onPresentMedia(slide, effectiveTemplateId)
            }}
          />
        ) : (
          <MediaFileGrid
            entries={entries}
            selectedReferences={selectedReferences}
            favorites={roots.favorites}
            tileSize={view.thumbnailSize}
            isLoading={directory.isLoading}
            pageCounts={pageCounts}
            onSelectionChange={onSelectionChange}
            onActivate={handleActivate}
            onToggleFavorite={(entry, isFavorite) => void roots.toggleFavorite(entry.reference, isFavorite)}
            onAddSelection={handleAdd}
            onDragStart={handleDragStart}
          />
        )}
      </div>

      <MediaPreviewColumn
        entry={previewEntry}
        selectionCount={selectedReferences.length}
        documentState={documentState}
        previewPageIndex={selectedPageIndex}
        slide={previewSlide}
        fit={fit}
        loop={loop}
        muted={muted}
        templates={templates}
        effectiveTemplateId={effectiveTemplateId}
        effectiveTemplate={effectiveTemplate}
        hasOpenFolder={hasOpenFolder}
        canAdd={Boolean(previewEntry) || Boolean(openDocument)}
        onTemplateChange={setSelectedTemplateId}
        onFitChange={setFit}
        onLoopChange={setLoop}
        onMutedChange={setMuted}
        onAdd={handleAdd}
        onAddAll={handleAddAll}
        onAddAsFolder={handleAddAsFolder}
        onPresent={handlePresent}
        onImportGoogleSlides={() => setIsImportOpen(true)}
      />

      <GoogleSlidesImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImported={(document) => {
          setOpenDocument(document)
          setSelectedPageIndex(0)
        }}
      />
    </div>
  )
}

