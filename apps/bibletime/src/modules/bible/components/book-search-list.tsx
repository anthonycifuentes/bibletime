import { useMemo, useState } from "react"
import type { FormEvent } from "react"

import type { Book } from "@/modules/bible/interfaces"
import { parseReference } from "@/modules/bible/lib/parse-reference"
import { normalizeText } from "@/modules/bible/lib/normalize-text"
import { BookList } from "@/modules/bible/components/book-list"
import { Input } from "@workspace/ui/components/input"
import { useTranslation } from "@/modules/core/i18n"

interface BookSearchListProps {
  books: Book[]
  /** The currently selected book's USFM code, if any (highlights it). */
  selectedBookUsfm?: string
  /** Called with a book's USFM code when a row is clicked (not via typed reference). */
  onSelectBook: (bookUsfm: string) => void
  /** Called instead of `onSelectBook` when a full typed reference (e.g. "Juan 3:16") resolves. */
  onResolveReference?: (result: { bookUsfm: string; chapterUsfm: string; verseNumber?: number }) => void
}

/**
 * One input serving two purposes: as-you-type it narrows `books` by an
 * accent/case-insensitive substring match on name, while submitting (Enter)
 * a full typed reference (e.g. "Juan 3:16") resolves it via `parseReference`
 * and reports the resolved book/chapter/verse via `onResolveReference`
 * instead of filtering.
 */
export function BookSearchList({ books, selectedBookUsfm, onSelectBook, onResolveReference }: BookSearchListProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const [notFoundInput, setNotFoundInput] = useState<string | null>(null)

  const filteredBooks = useMemo(() => {
    const normalizedQuery = normalizeText(query)
    if (!normalizedQuery) return books
    return books.filter((book) => normalizeText(book.name).includes(normalizedQuery))
  }, [books, query])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    const result = await parseReference(trimmedQuery)

    if (result.status === "resolved") {
      setNotFoundInput(null)
      setQuery("")
      onResolveReference?.({
        bookUsfm: result.bookUsfm,
        chapterUsfm: result.chapterUsfm,
        verseNumber: result.verseNumber,
      })
      return
    }

    // Only surface a "not found" message when the input looked like a
    // reference attempt (has a trailing chapter/verse number) — plain
    // filter terms like "gen" never match parseReference's pattern and
    // should just keep narrowing the list instead of showing an error.
    setNotFoundInput(/\d/.test(trimmedQuery) ? trimmedQuery : null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <form className="shrink-0" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setNotFoundInput(null)
          }}
          placeholder={t("bible.search.placeholder")}
          aria-label={t("bible.search.ariaLabel")}
        />
      </form>
      {notFoundInput ? (
        <p className="shrink-0 text-sm text-destructive">
          {t("bible.search.notFound", { query: notFoundInput })}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <BookList
          books={filteredBooks}
          selectedBookUsfm={selectedBookUsfm}
          onSelectBook={onSelectBook}
          className="grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1"
        />
      </div>
    </div>
  )
}
