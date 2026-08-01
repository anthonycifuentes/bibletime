import { useState } from "react"

import {
  BookSearchList,
  BUNDLED_VERSION_ID,
  ChapterNav,
  findVerseText,
  useBibleVersionDownloads,
  useGetBibleVersions,
  useGetBook,
  useGetBooks,
  useGetChapter,
  VersePickerList,
} from "@/modules/bible"
import type { BibleVersionSummary } from "@/modules/bible"
import type { BiblePassageItemData } from "@/modules/library/interfaces"
import { VersionListPanel } from "@/modules/library/components/version-list-panel"
import { SlideFrame } from "@/modules/presentation"
import { useTemplates } from "@/modules/templates"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useTranslation } from "@/modules/core/i18n"

/** Fallback book when none has been selected yet. */
const DEFAULT_BOOK_USFM = "GEN"

interface BiblePickerPanelProps {
  /** Whether a Library folder is currently open — "Convert to slide" is disabled (with a hint) when it isn't. */
  hasOpenFolder: boolean
  onAddVerse: (
    item: BiblePassageItemData,
    templateId: string | undefined
  ) => void
}

/**
 * The bottom drawer's Bible tab: five columns — Version, Book, Chapter,
 * Verse, and Preview — browsing books/chapters/verses (reusing the same
 * pieces the old four-column `BibleConsoleView` composed), highlighting a
 * verse into the Preview column, then explicitly "Convert to slide" to
 * append it to the currently open Library folder. Selecting a verse never
 * adds it by itself.
 */
export function BiblePickerPanel({
  hasOpenFolder,
  onAddVerse,
}: BiblePickerPanelProps) {
  const { t } = useTranslation()

  const [bookUsfm, setBookUsfm] = useState(DEFAULT_BOOK_USFM)
  const [chapterUsfm, setChapterUsfm] = useState<string>("")
  const [versionId, setVersionId] = useState<number | undefined>(undefined)
  const [pendingVerseNumber, setPendingVerseNumber] = useState<
    number | undefined
  >(undefined)
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    string | undefined
  >(undefined)

  const { data: catalogVersions } = useGetBibleVersions()
  const { canDownload, downloadingIds, errorIds, download, remove } =
    useBibleVersionDownloads()
  const { activeId, activeTemplate, templates } = useTemplates()

  // Defaults to the app-wide active template until the user picks a different
  // one here — picking one here is a one-off choice for this conversion, it
  // does not change what the Templates tab reports as active.
  const effectiveTemplateId = selectedTemplateId ?? activeId
  const effectiveTemplate =
    templates.find((template) => template.id === effectiveTemplateId)
      ?.template ?? activeTemplate

  const versions: BibleVersionSummary[] | undefined = catalogVersions?.map(
    (version) =>
      downloadingIds.has(version.version_id)
        ? { ...version, status: "downloading" }
        : errorIds.has(version.version_id)
          ? { ...version, status: "error" }
          : version
  )

  const selectedVersion = versions?.find(
    (version) => version.version_id === (versionId ?? BUNDLED_VERSION_ID)
  )

  const { data: books } = useGetBooks(selectedVersion)
  const { data: book } = useGetBook(bookUsfm, selectedVersion)

  const firstChapterUsfm = book?.chapters.find(
    (chapter) => chapter.is_chapter
  )?.chapter_usfm
  const effectiveChapterUsfm = chapterUsfm || firstChapterUsfm || ""

  const { data: chapterData } = useGetChapter(
    bookUsfm,
    effectiveChapterUsfm,
    selectedVersion
  )

  const handleSelectBook = (newBookUsfm: string) => {
    setBookUsfm(newBookUsfm)
    setChapterUsfm("")
    setPendingVerseNumber(undefined)
  }

  const handleSelectChapter = (newChapterUsfm: string) => {
    setChapterUsfm(newChapterUsfm)
    setPendingVerseNumber(undefined)
  }

  const pendingText =
    chapterData && pendingVerseNumber !== undefined
      ? findVerseText(chapterData.chapter.items, pendingVerseNumber)
      : undefined
  const pendingReference =
    chapterData && pendingVerseNumber !== undefined
      ? `${chapterData.chapter.current.human}:${pendingVerseNumber}`
      : undefined

  const canConvert =
    hasOpenFolder && Boolean(pendingText) && Boolean(pendingReference)

  const handleConvert = () => {
    if (
      !canConvert ||
      !pendingText ||
      !pendingReference ||
      pendingVerseNumber === undefined
    )
      return

    onAddVerse(
      {
        bookUsfm,
        chapterUsfm: effectiveChapterUsfm,
        verseNumber: pendingVerseNumber,
        versionId,
        reference: pendingReference,
        text: pendingText,
      },
      effectiveTemplateId
    )
    setPendingVerseNumber(undefined)
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[minmax(180px,220px)_minmax(160px,200px)_88px_1fr_minmax(220px,260px)]">
      <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase">
          {t("bible.version")}
        </h2>
        {versions ? (
          <VersionListPanel
            versions={versions}
            selectedVersionId={selectedVersion?.version_id}
            canDownload={canDownload}
            onSelectVersion={(version) => setVersionId(version.version_id)}
            onDownload={download}
            onRemove={remove}
          />
        ) : null}
      </div>

      <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
        <h2 className="shrink-0 text-xs font-semibold text-muted-foreground uppercase">
          {t("bible.books")}
        </h2>
        {books ? (
          <BookSearchList
            books={books}
            selectedBookUsfm={bookUsfm}
            onSelectBook={handleSelectBook}
            onResolveReference={(result) => {
              setBookUsfm(result.bookUsfm)
              setChapterUsfm(result.chapterUsfm)
              setPendingVerseNumber(result.verseNumber)
            }}
          />
        ) : null}
      </div>

      <div className="min-h-0 overflow-y-auto">
        {book ? (
          <ChapterNav
            book={book}
            currentChapterUsfm={
              chapterData?.chapter.chapter_usfm ?? effectiveChapterUsfm
            }
            chaptersClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-1"
            onSelectChapter={handleSelectChapter}
          />
        ) : null}
      </div>

      <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
        {chapterData ? (
          <>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase">
              {chapterData.chapter.current.human}
            </h2>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <VersePickerList
                items={chapterData.chapter.items}
                selectedVerseNumber={pendingVerseNumber}
                onSelectVerse={setPendingVerseNumber}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-col gap-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase">
          {t("bible.preview")}
        </h2>

        {templates.length > 0 ? (
          <Select
            items={templates.map((template) => ({
              value: template.id,
              label: template.name,
            }))}
            value={effectiveTemplateId}
            onValueChange={(value) => setSelectedTemplateId(value as string)}
          >
            <SelectTrigger className="w-full">
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
            text={pendingText}
            reference={pendingReference}
            emptyMessage={t("library.selectVerseHint")}
            frameClassName="h-full w-full"
          />
        </div>

        {!hasOpenFolder ? (
          <p className="text-xs text-muted-foreground">
            {t("library.openFolderHint")}
          </p>
        ) : null}

        <Button type="button" disabled={!canConvert} onClick={handleConvert}>
          {t("library.convertToSlide")}
        </Button>
      </div>
    </div>
  )
}
