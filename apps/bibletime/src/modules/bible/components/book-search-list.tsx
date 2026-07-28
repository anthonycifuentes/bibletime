import { useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import type { FormEvent } from "react"

import type { Book } from "@/modules/bible/interfaces"
import { parseReference } from "@/modules/bible/lib/parse-reference"
import { BookList } from "@/modules/bible/components/book-list"
import { Input } from "@workspace/ui/components/input"

interface BookSearchListProps {
  books: Book[]
  /** The currently selected book's USFM code, if any (highlights it). */
  selectedBookUsfm?: string
  /** Called with a book's USFM code when a row is clicked (not via typed reference). */
  onSelectBook: (bookUsfm: string) => void
}

const stripAccents = (value: string): string =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "")

const normalize = (value: string): string => stripAccents(value).toLowerCase().trim()

/**
 * One input serving two purposes: as-you-type it narrows `books` by an
 * accent/case-insensitive substring match on name, while submitting (Enter)
 * a full typed reference (e.g. "Juan 3:16") resolves it via `parseReference`
 * and navigates straight to that book/chapter/verse instead of filtering.
 * Navigation only ever changes the `/bible` route's search params — the
 * path never changes.
 */
export function BookSearchList({ books, selectedBookUsfm, onSelectBook }: BookSearchListProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [notFoundInput, setNotFoundInput] = useState<string | null>(null)

  const filteredBooks = useMemo(() => {
    const normalizedQuery = normalize(query)
    if (!normalizedQuery) return books
    return books.filter((book) => normalize(book.name).includes(normalizedQuery))
  }, [books, query])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    const result = await parseReference(trimmedQuery)

    if (result.status === "resolved") {
      setNotFoundInput(null)
      setQuery("")
      await navigate({
        to: "/bible",
        search: {
          book: result.bookUsfm,
          chapter: result.chapterUsfm,
          verse: result.verseNumber,
        },
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
    <div className="flex flex-col gap-3">
      <form onSubmit={(event) => void handleSubmit(event)}>
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setNotFoundInput(null)
          }}
          placeholder="Filtrar o buscar (ej. Juan 3:16)"
          aria-label="Filtrar libros o buscar referencia bíblica"
        />
      </form>
      {notFoundInput ? (
        <p className="text-sm text-destructive">
          No se encontró la referencia &quot;{notFoundInput}&quot;.
        </p>
      ) : null}
      <BookList
        books={filteredBooks}
        selectedBookUsfm={selectedBookUsfm}
        onSelectBook={onSelectBook}
        className="grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1"
      />
    </div>
  )
}
