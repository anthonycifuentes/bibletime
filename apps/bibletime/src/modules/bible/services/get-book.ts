import type { BibleVersion, Book } from "@/modules/bible/interfaces"

/**
 * Looks up a book by its USFM code (e.g. "GEN") within already-fetched
 * Bible data. Returns null when the code doesn't match any bundled book.
 */
export const getBook = (data: BibleVersion, bookUsfm: string): Book | null => {
  return data.books.find((book) => book.book_usfm === bookUsfm) ?? null
}
