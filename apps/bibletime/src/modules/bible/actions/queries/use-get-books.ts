import { useQuery } from "@tanstack/react-query"

import type { BibleVersionSummary } from "@/modules/bible/interfaces"
import { getBibleData, resolveBibleDataSource } from "@/modules/bible/services"

/**
 * Returns the selected translation's books in canonical order (as they
 * appear in the source data). Defaults to the bundled translation when no
 * version is given.
 */
export const useGetBooks = (version?: BibleVersionSummary) => {
  return useQuery({
    queryKey: ["bible", "books", version?.version_id ?? "bundled"],
    queryFn: async () => {
      const data = await getBibleData(resolveBibleDataSource(version))
      return data.books
    },
  })
}
