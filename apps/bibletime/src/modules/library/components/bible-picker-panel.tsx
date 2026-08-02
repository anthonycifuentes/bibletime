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
import { splitVerseText } from "@/modules/library/lib/split-verse-text"
import { setLiveSlide } from "@/modules/library/services"
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
  /** Whether a Library folder is currently open — "Present" and "Split into slides" are disabled (with a hint) when it isn't. "Convert to slide" no longer needs one — it creates a folder to hold the slide instead. */
  hasOpenFolder: boolean
  onAddVerse: (
    item: BiblePassageItemData,
    templateId: string | undefined
  ) => void
  onAddVerses: (
    items: BiblePassageItemData[],
    templateId: string | undefined
  ) => void
}

const SPLIT_COUNT_OPTIONS = [2, 3, 4, 5]

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
  onAddVerses,
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
  const [splitCount, setSplitCount] = useState(SPLIT_COUNT_OPTIONS[0])

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

  /** The reference/text a given verse number would resolve to in the currently loaded chapter, without touching any state. */
  const resolveVerseContent = (verseNumber: number) => ({
    text: chapterData
      ? findVerseText(chapterData.chapter.items, verseNumber)
      : undefined,
    reference: chapterData
      ? `${chapterData.chapter.current.human}:${verseNumber}`
      : undefined,
  })

  const pendingContent =
    pendingVerseNumber !== undefined
      ? resolveVerseContent(pendingVerseNumber)
      : undefined
  const pendingText = pendingContent?.text
  const pendingReference = pendingContent?.reference

  /** Convert to Slide only needs a valid pending verse — with no folder open it creates one instead of requiring one. */
  const hasPendingVerse = Boolean(pendingText) && Boolean(pendingReference)
  /** Present and Split into slides still require an open folder — they present/append immediately, with nowhere to fall back to. */
  const canPresentOrSplit = hasOpenFolder && hasPendingVerse

  /** Adds a verse to the open folder as a slide — the shared step behind "Convert to Slide", "Present", and double-click. */
  const convertVerse = (
    verseNumber: number,
    text: string,
    reference: string
  ) => {
    onAddVerse(
      {
        bookUsfm,
        chapterUsfm: effectiveChapterUsfm,
        verseNumber,
        versionId,
        versionAbbreviation: selectedVersion?.local_abbreviation,
        reference,
        text,
      },
      effectiveTemplateId
    )
  }

  /** Sends a verse straight to the presentation output — the shared step behind "Present" and double-click. */
  const presentVerse = (text: string, reference: string) => {
    setLiveSlide({
      text,
      reference,
      versionLabel: selectedVersion?.local_abbreviation,
      template: effectiveTemplate,
    })
    window.open("/present", "bibletime-present")
  }

  const handleConvert = () => {
    if (
      !hasPendingVerse ||
      !pendingText ||
      !pendingReference ||
      pendingVerseNumber === undefined
    )
      return

    convertVerse(pendingVerseNumber, pendingText, pendingReference)
    setPendingVerseNumber(undefined)
  }

  const handlePresent = () => {
    if (
      !canPresentOrSplit ||
      !pendingText ||
      !pendingReference ||
      pendingVerseNumber === undefined
    )
      return

    convertVerse(pendingVerseNumber, pendingText, pendingReference)
    presentVerse(pendingText, pendingReference)
    setPendingVerseNumber(undefined)
  }

  /** Splits the pending verse's text into `splitCount` slides instead of one — for a verse long enough that even auto-fit would look cramped. */
  const handleSplit = () => {
    if (
      !canPresentOrSplit ||
      !pendingText ||
      !pendingReference ||
      pendingVerseNumber === undefined
    )
      return

    const chunks = splitVerseText(pendingText, splitCount)
    if (chunks.length <= 1) return

    onAddVerses(
      chunks.map((chunk, index) => ({
        bookUsfm,
        chapterUsfm: effectiveChapterUsfm,
        verseNumber: pendingVerseNumber,
        versionId,
        versionAbbreviation: selectedVersion?.local_abbreviation,
        reference: `${pendingReference} (${index + 1}/${chunks.length})`,
        text: chunk,
      })),
      effectiveTemplateId
    )
    setPendingVerseNumber(undefined)
  }

  /** Converts and immediately presents a verse double-clicked directly in the reader's list, without waiting on `pendingVerseNumber` state. */
  const handleDoubleClickVerse = (verseNumber: number) => {
    if (!hasOpenFolder) return
    const { text, reference } = resolveVerseContent(verseNumber)
    if (!text || !reference) return

    setPendingVerseNumber(verseNumber)
    convertVerse(verseNumber, text, reference)
    presentVerse(text, reference)
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[minmax(180px,220px)_minmax(160px,200px)_56px_1fr_minmax(220px,260px)]">
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
                onDoubleClickVerse={handleDoubleClickVerse}
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
            versionLabel={selectedVersion?.local_abbreviation}
            emptyMessage={t("library.selectVerseHint")}
            frameClassName="h-full w-full"
          />
        </div>

        {!hasOpenFolder ? (
          <p className="text-xs text-muted-foreground">
            {t("library.openFolderHint")}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={!hasPendingVerse}
            onClick={handleConvert}
          >
            {t("library.convertToSlide")}
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!canPresentOrSplit}
            onClick={handlePresent}
          >
            {t("library.present")}
          </Button>
        </div>

        <div className="flex gap-2">
          <Select
            items={SPLIT_COUNT_OPTIONS.map((count) => ({
              value: String(count),
              label: t("library.splitCountOption", { count }),
            }))}
            value={String(splitCount)}
            onValueChange={(value) => {
              if (value) setSplitCount(Number(value))
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPLIT_COUNT_OPTIONS.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {t("library.splitCountOption", { count })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={!canPresentOrSplit}
            onClick={handleSplit}
          >
            {t("library.splitIntoSlides")}
          </Button>
        </div>
      </div>
    </div>
  )
}
