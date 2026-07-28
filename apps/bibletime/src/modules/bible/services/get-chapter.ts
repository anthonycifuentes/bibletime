import type { BibleVersion, Chapter } from "@/modules/bible/interfaces"

import { getBook } from "./get-book"

/**
 * Looks up a chapter by its USFM code (e.g. "GEN.1") within already-fetched
 * Bible data. The book USFM code is derived from the chapter code's prefix.
 * Returns null when the book or chapter can't be found.
 */
export const getChapter = (data: BibleVersion, chapterUsfm: string): Chapter | null => {
  const bookUsfm = chapterUsfm.split(".")[0]
  if (!bookUsfm) return null

  const book = getBook(data, bookUsfm)
  if (!book) return null

  return book.chapters.find((chapter) => chapter.chapter_usfm === chapterUsfm) ?? null
}
