import type {
  BibleVersionCatalogEntry,
  BibleVersionSummary,
  DownloadedBibleVersionMeta,
} from "@/modules/bible/interfaces"
import { BUNDLED_BIBLE_VERSION_CATALOG } from "@/modules/bible/services/bundled-catalog"
import { BUNDLED_VERSION_ID } from "@/modules/bible/services/get-bible-data"

const CATALOG_URL = "https://mrk214.github.io/snapshots/data.json"

/** How long the remote catalog gets before the bundled one is used instead — a version list must never sit loading. */
const CATALOG_TIMEOUT_MS = 5000

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

const isRemoteCatalog = (data: unknown): data is RemoteCatalogResponse =>
  typeof data === "object" &&
  data !== null &&
  Array.isArray((data as RemoteCatalogResponse).available_versions)

/**
 * Fetches the remote catalog, or throws. Kept separate from the fallback so
 * the failure modes stay visible: HTTP error, network error, timeout, and a
 * body that is not a catalog all land in the same `catch`.
 */
const fetchRemoteCatalog = async (): Promise<BibleVersionCatalogEntry[]> => {
  const response = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(
      `Failed to load Bible version catalog: ${response.status} ${response.statusText}`
    )
  }

  const data: unknown = await response.json()
  if (!isRemoteCatalog(data)) throw new Error("Bible version catalog has an unexpected shape")

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
 * The list of translations available to the user.
 *
 * Remote first, so translations added upstream appear with no app update;
 * the bundled catalog on *any* failure — the upstream catalog has already
 * disappeared once (see `bundled-catalog.ts`), and offline is the normal
 * state for a church laptop. Never rejects: a catalog problem must not
 * become an empty Bible tab.
 */
export const getBibleVersionCatalog = async (): Promise<BibleVersionCatalogEntry[]> => {
  try {
    return await fetchRemoteCatalog()
  } catch {
    return BUNDLED_BIBLE_VERSION_CATALOG
  }
}

/** The bundled translation as a catalog entry, for when the catalog that loaded does not list it. */
const bundledVersionEntry = (): BibleVersionCatalogEntry | undefined =>
  BUNDLED_BIBLE_VERSION_CATALOG.find((entry) => entry.version_id === BUNDLED_VERSION_ID)

/**
 * Combines the catalog with what's on this machine, tagging each entry as
 * bundled (always offline, no download needed), downloaded (fetched once,
 * on disk), or available (catalog-only, online preview).
 *
 * Local content is appended when the catalog does not mention it: the
 * catalog is whatever happened to load, and a translation the user already
 * has must never be hidden by it. A downloaded file carries no language
 * metadata, so such an entry is grouped under a neutral label.
 */
export const getBibleVersions = (
  catalog: BibleVersionCatalogEntry[],
  downloaded: DownloadedBibleVersionMeta[]
): BibleVersionSummary[] => {
  const downloadedIds = new Set(downloaded.map((entry) => entry.version_id))
  const catalogIds = new Set(catalog.map((entry) => entry.version_id))

  const statusOf = (versionId: number): BibleVersionSummary["status"] =>
    versionId === BUNDLED_VERSION_ID
      ? "bundled"
      : downloadedIds.has(versionId)
        ? "downloaded"
        : "available"

  const listed: BibleVersionSummary[] = catalog.map((entry) => ({
    ...entry,
    status: statusOf(entry.version_id),
  }))

  const bundled = bundledVersionEntry()
  if (bundled && !catalogIds.has(BUNDLED_VERSION_ID)) {
    listed.push({ ...bundled, status: "bundled" })
    catalogIds.add(BUNDLED_VERSION_ID)
  }

  for (const meta of downloaded) {
    if (catalogIds.has(meta.version_id)) continue
    listed.push({
      version_id: meta.version_id,
      local_abbreviation: meta.local_abbreviation,
      local_title: meta.local_title,
      json_url: meta.json_url,
      lang_name: "—",
      lang_key: "",
      status: "downloaded",
    })
  }

  return listed
}
