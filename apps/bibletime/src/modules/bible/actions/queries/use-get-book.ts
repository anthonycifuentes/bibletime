import { useQuery } from "@tanstack/react-query"

import { getBibleData, getBook } from "@/modules/bible/services"

/** Resolves a single book (with its chapters) by USFM code, e.g. for the chapter-list screen. */
export const useGetBook = (bookUsfm: string) => {
  return useQuery({
    queryKey: ["bible", "book", bookUsfm],
    queryFn: async () => {
      const data = await getBibleData()

      const book = getBook(data, bookUsfm)
      if (!book) {
        throw new Error(`Book not found: ${bookUsfm}`)
      }

      return book
    },
    enabled: Boolean(bookUsfm),
  })
}
