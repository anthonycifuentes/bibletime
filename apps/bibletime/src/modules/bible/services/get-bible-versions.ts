import type {
  BibleVersionCatalogEntry,
  BibleVersionSummary,
  DownloadedBibleVersionMeta,
} from "@/modules/bible/interfaces"
import { BUNDLED_VERSION_ID } from "@/modules/bible/services/get-bible-data"

const CATALOG_URL = "https://mrk214.github.io/snapshots/data.json"

interface RemoteCatalogVersion {
  version_id: number
  local_abbreviation: string
  local_title: string
  json_url: string
  lang_name: string
  lang_key: string
}

interface RemoteCatalogResponse {
  available_versions: RemoteCatalogVersion[]
}

/** Fetches the full list of translations available from the remote snapshots repository. */
export const getBibleVersionCatalog = async (): Promise<BibleVersionCatalogEntry[]> => {
  const response = await fetch(CATALOG_URL)
  if (!response.ok) {
    throw new Error(
      `Failed to load Bible version catalog: ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as RemoteCatalogResponse

  return data.available_versions.map((version) => ({
    version_id: version.version_id,
    local_abbreviation: version.local_abbreviation,
    local_title: version.local_title,
    json_url: version.json_url,
    lang_name: version.lang_name,
    lang_key: version.lang_key,
  }))
}

/**
 * Combines the remote catalog with what's downloaded locally, tagging each
 * entry as bundled (always offline, no download needed), downloaded
 * (fetched once, on disk), or available (catalog-only, online preview).
 */
export const getBibleVersions = (
  catalog: BibleVersionCatalogEntry[],
  downloaded: DownloadedBibleVersionMeta[]
): BibleVersionSummary[] => {
  const downloadedIds = new Set(downloaded.map((entry) => entry.version_id))

  return catalog.map((entry) => ({
    ...entry,
    status:
      entry.version_id === BUNDLED_VERSION_ID
        ? "bundled"
        : downloadedIds.has(entry.version_id)
          ? "downloaded"
          : "available",
  }))
}
