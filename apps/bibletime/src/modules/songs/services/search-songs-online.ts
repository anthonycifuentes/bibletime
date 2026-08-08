import type { SongSearchResult } from "@/modules/songs/interfaces"

const LRCLIB_SEARCH_URL = "https://lrclib.net/api/search"
const SEARCH_TIMEOUT_MS = 10_000

/** LRCLIB's wire shape — only the fields used here; `syncedLyrics` is deliberately not read. */
interface LrclibTrack {
  id?: number | string
  trackName?: string
  artistName?: string
  albumName?: string
  duration?: number
  plainLyrics?: string | null
}

const toSearchResult = (track: LrclibTrack): SongSearchResult | undefined => {
  if (track.id === undefined || !track.trackName) return undefined

  return {
    id: String(track.id),
    title: track.trackName,
    artist: track.artistName || undefined,
    album: track.albumName || undefined,
    durationSeconds: typeof track.duration === "number" ? track.duration : undefined,
    plainLyrics: track.plainLyrics ?? undefined,
  }
}

/**
 * Searches the online lyrics provider (LRCLIB — no key, no quota, and it
 * returns full plain lyrics, unlike Musixmatch's snippet-only free tier or
 * Genius's lyrics-free API).
 *
 * Inside the Electron shell the request goes through the main process, which
 * has no CORS surface and can set the identifying `User-Agent` the provider
 * asks for; elsewhere it's a direct browser request. Throws on any failure —
 * callers turn that into an explicit "unavailable" state rather than an
 * empty result list.
 */
export const searchSongsOnline = async (query: string): Promise<SongSearchResult[]> => {
  const trimmed = query.trim()
  if (!trimmed) return []

  const raw = window.bibletime?.songSearch
    ? await window.bibletime.songSearch.query(trimmed)
    : await fetchDirectly(trimmed)

  if (!Array.isArray(raw)) return []

  return raw
    .map((track) => toSearchResult(track as LrclibTrack))
    .filter((result): result is SongSearchResult => result !== undefined)
}

const fetchDirectly = async (query: string): Promise<unknown> => {
  const response = await fetch(`${LRCLIB_SEARCH_URL}?q=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Song search failed: ${response.status} ${response.statusText}`)
  }
  return response.json()
}
