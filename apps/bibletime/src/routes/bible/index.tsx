import { createFileRoute } from "@tanstack/react-router"

import { BibleConsoleView } from "@/modules/bible"

/** Fallbacks for the bare `/bible` URL (e.g. the sidebar link), so the console never opens empty. */
const DEFAULT_BOOK_USFM = "GEN"
const DEFAULT_CHAPTER_USFM = "GEN.1"
const DEFAULT_VERSE = 1

interface BibleSearch {
  book?: string
  chapter?: string
  verse?: number
}

const parseStringParam = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined

const parseVerseParam = (value: unknown): number | undefined => {
  const verse =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : undefined

  return verse !== undefined && Number.isFinite(verse) ? verse : undefined
}

export const Route = createFileRoute("/bible/")({
  validateSearch: (search: Record<string, unknown>): BibleSearch => {
    const book = parseStringParam(search.book)
    const chapter = parseStringParam(search.chapter)
    const verse = parseVerseParam(search.verse)

    // Bare `/bible` (all three absent, e.g. the sidebar link or first load):
    // default to Genesis 1, verse 1, so the console never opens empty.
    // Partial search states (e.g. only `book` set right after selecting a
    // book) are resolved by BibleConsoleView instead — resolving "a book's
    // first chapter" needs the loaded Bible data, which isn't available
    // synchronously here.
    if (book === undefined && chapter === undefined && verse === undefined) {
      return { book: DEFAULT_BOOK_USFM, chapter: DEFAULT_CHAPTER_USFM, verse: DEFAULT_VERSE }
    }

    return { book, chapter, verse }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { book, chapter, verse } = Route.useSearch()

  return <BibleConsoleView bookUsfm={book} chapterUsfm={chapter} verseNumber={verse} />
}
