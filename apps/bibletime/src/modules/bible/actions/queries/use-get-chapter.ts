import { useQuery } from "@tanstack/react-query"

import type { BibleVersionSummary } from "@/modules/bible/interfaces"
import { getBibleData, getBook, getChapter, resolveBibleDataSource } from "@/modules/bible/services"

/**
 * Resolves a book + chapter pair by USFM code. Returns both the book
 * (needed for the chapter list / prev-next nav) and the chapter (needed
 * for verse content) so the chapter-reader view has everything it needs.
 */
export const useGetChapter = (bookUsfm: string, chapterUsfm: string, version?: BibleVersionSummary) => {
  return useQuery({
    queryKey: ["bible", "chapter", version?.version_id ?? "bundled", bookUsfm, chapterUsfm],
    queryFn: async () => {
      const data = await getBibleData(resolveBibleDataSource(version))

      const book = getBook(data, bookUsfm)
      if (!book) {
        throw new Error(`Book not found: ${bookUsfm}`)
      }

      const chapter = getChapter(data, chapterUsfm)
      if (!chapter) {
        throw new Error(`Chapter not found: ${chapterUsfm}`)
      }

      return { book, chapter }
    },
    enabled: Boolean(bookUsfm) && Boolean(chapterUsfm),
  })
}
