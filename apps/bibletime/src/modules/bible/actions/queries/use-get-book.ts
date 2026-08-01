import { useQuery } from "@tanstack/react-query"

import type { BibleVersionSummary } from "@/modules/bible/interfaces"
import { getBibleData, getBook, resolveBibleDataSource } from "@/modules/bible/services"

/** Resolves a single book (with its chapters) by USFM code, e.g. for the chapter-list screen. */
export const useGetBook = (bookUsfm: string, version?: BibleVersionSummary) => {
  return useQuery({
    queryKey: ["bible", "book", version?.version_id ?? "bundled", bookUsfm],
    queryFn: async () => {
      const data = await getBibleData(resolveBibleDataSource(version))

      const book = getBook(data, bookUsfm)
      if (!book) {
        throw new Error(`Book not found: ${bookUsfm}`)
      }

      return book
    },
    enabled: Boolean(bookUsfm),
  })
}
