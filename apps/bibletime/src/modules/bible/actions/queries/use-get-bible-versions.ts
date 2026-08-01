import { useQuery } from "@tanstack/react-query"

import { getBibleVersionCatalog, getBibleVersionDownloads, getBibleVersions } from "@/modules/bible/services"

const bibleVersionDownloads = getBibleVersionDownloads()

/** Every translation in the remote catalog, tagged bundled/downloaded/available. */
export const useGetBibleVersions = () => {
  return useQuery({
    queryKey: ["bible", "versions"],
    queryFn: async () => {
      const [catalog, downloaded] = await Promise.all([
        getBibleVersionCatalog(),
        bibleVersionDownloads.list(),
      ])
      return getBibleVersions(catalog, downloaded)
    },
  })
}
