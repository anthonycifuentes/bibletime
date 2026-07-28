import { useNavigate } from "@tanstack/react-router"

import { useGetBook } from "@/modules/bible/actions/queries/use-get-book"
import { useGetBooks } from "@/modules/bible/actions/queries/use-get-books"
import { useGetChapter } from "@/modules/bible/actions/queries/use-get-chapter"
import { BookSearchList } from "@/modules/bible/components/book-search-list"
import { ChapterNav } from "@/modules/bible/components/chapter-nav"
import { OutputPreview } from "@/modules/bible/components/output-preview"
import { VersePickerList } from "@/modules/bible/components/verse-picker-list"
import type { ChapterItem } from "@/modules/bible/interfaces"

/** Fallback book when the route's `book` search param is absent. */
const DEFAULT_BOOK_USFM = "GEN"

interface BibleConsoleViewProps {
  /** The `/bible` route's `book` search param, if set. */
  bookUsfm?: string
  /** The `/bible` route's `chapter` search param, if set. */
  chapterUsfm?: string
  /** The `/bible` route's `verse` search param, if set. */
  verseNumber?: number
}

const findFirstVerseNumber = (items: ChapterItem[]): number | undefined => {
  for (const item of items) {
    if (item.type === "verse") {
      return item.verse_numbers[0]
    }
  }
  return undefined
}

const findVerseText = (items: ChapterItem[], verseNumber: number): string | undefined => {
  const match = items.find(
    (item) => item.type === "verse" && item.verse_numbers.includes(verseNumber)
  )
  return match?.lines.join(" ")
}

/**
 * The Bible module's one and only screen: a four-column console (books+search
 * | chapters | verse picker | preview) composing this module's own
 * components only.
 *
 * Book/chapter/verse selection lives entirely in the `/bible` route's search
 * params (passed down as props here) rather than separate pages. Every
 * selection below calls `navigate({ to: "/bible", search: {...} })`, which
 * only ever changes search params — never the path — so this component is
 * never remounted by a selection; it is genuinely one continuous screen.
 *
 * A partially-set search state (e.g. only `book`, right after selecting a
 * new book) is resolved here rather than in the route's `validateSearch`:
 * finding "a book's first chapter" or "a chapter's first verse" needs the
 * loaded Bible data, which isn't available synchronously when the URL is
 * parsed. `validateSearch` only handles the fully-absent case (bare `/bible`
 * defaults to Genesis 1, verse 1).
 */
export function BibleConsoleView({ bookUsfm, chapterUsfm, verseNumber }: BibleConsoleViewProps) {
  const navigate = useNavigate()

  const effectiveBookUsfm = bookUsfm ?? DEFAULT_BOOK_USFM

  const { data: books, isLoading: isBooksLoading, isError: isBooksError } = useGetBooks()
  const { data: book, isLoading: isBookLoading, isError: isBookError } =
    useGetBook(effectiveBookUsfm)

  const firstChapterUsfm = book?.chapters.find((chapter) => chapter.is_chapter)?.chapter_usfm
  const effectiveChapterUsfm = chapterUsfm ?? firstChapterUsfm ?? ""

  const { data: chapterData, isLoading: isChapterLoading, isError: isChapterError } = useGetChapter(
    effectiveBookUsfm,
    effectiveChapterUsfm
  )

  const selectedVerseNumber =
    verseNumber ?? findFirstVerseNumber(chapterData?.chapter.items ?? [])
  const selectedVerseText =
    chapterData && selectedVerseNumber !== undefined
      ? findVerseText(chapterData.chapter.items, selectedVerseNumber)
      : undefined

  const handleSelectBook = (newBookUsfm: string) => {
    // Clears chapter/verse by omitting them — they belonged to the previous
    // book. `validateSearch`/this view's own fallback chain resolves the new
    // book's first chapter and first verse.
    void navigate({ to: "/bible", search: { book: newBookUsfm } })
  }

  const handleSelectChapter = (newChapterUsfm: string) => {
    // Clears verse by omitting it — it belonged to the previous chapter.
    void navigate({
      to: "/bible",
      search: { book: effectiveBookUsfm, chapter: newChapterUsfm },
    })
  }

  const handleSelectVerse = (verse: number) => {
    void navigate({
      to: "/bible",
      search: { book: effectiveBookUsfm, chapter: effectiveChapterUsfm, verse },
      replace: true,
    })
  }

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-1 gap-px overflow-hidden bg-border md:grid-cols-[minmax(200px,240px)_minmax(160px,200px)_1fr_1fr]">
      <section className="flex flex-col gap-3 overflow-y-auto bg-background p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase">Libros</h2>
        {isBooksLoading ? (
          <p className="text-sm text-muted-foreground">Cargando libros…</p>
        ) : null}
        {isBooksError ? (
          <p className="text-sm text-destructive">No se pudieron cargar los libros.</p>
        ) : null}
        {books ? (
          <BookSearchList
            books={books}
            selectedBookUsfm={effectiveBookUsfm}
            onSelectBook={handleSelectBook}
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-3 overflow-y-auto bg-background p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase">Capítulos</h2>
        {isBookLoading ? (
          <p className="text-sm text-muted-foreground">Cargando capítulos…</p>
        ) : null}
        {isBookError ? (
          <p className="text-sm text-destructive">No se encontró el libro solicitado.</p>
        ) : null}
        {book ? (
          <ChapterNav
            book={book}
            currentChapterUsfm={chapterData?.chapter.chapter_usfm ?? effectiveChapterUsfm}
            previous={chapterData?.chapter.previous}
            next={chapterData?.chapter.next}
            chaptersClassName="grid-cols-5 sm:grid-cols-5 md:grid-cols-5"
            onSelectChapter={handleSelectChapter}
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-3 overflow-y-auto bg-background p-4">
        {isChapterLoading ? (
          <p className="text-sm text-muted-foreground">Cargando capítulo…</p>
        ) : null}
        {isChapterError ? (
          <p className="text-sm text-destructive">No se encontró el capítulo solicitado.</p>
        ) : null}
        {chapterData ? (
          <>
            <h1 className="text-xl font-bold">{chapterData.chapter.current.human}</h1>
            <VersePickerList
              items={chapterData.chapter.items}
              selectedVerseNumber={selectedVerseNumber}
              onSelectVerse={handleSelectVerse}
            />
          </>
        ) : null}
      </section>

      <section className="overflow-y-auto bg-background p-4">
        {chapterData ? (
          <OutputPreview
            chapterHuman={chapterData.chapter.current.human}
            verseNumber={selectedVerseNumber}
            verseText={selectedVerseText}
          />
        ) : null}
      </section>
    </div>
  )
}
