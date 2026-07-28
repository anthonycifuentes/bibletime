import { useQuery } from "@tanstack/react-query"

import { getBibleData } from "@/modules/bible/services"

/**
 * Returns the bundled translation's books in canonical order (as they
 * appear in the source data).
 */
export const useGetBooks = () => {
  return useQuery({
    queryKey: ["bible", "books"],
    queryFn: async () => {
      const data = await getBibleData()
      return data.books
    },
  })
}
