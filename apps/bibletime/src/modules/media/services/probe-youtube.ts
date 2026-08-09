import { buildYouTubeWatchUrl } from "@/modules/core/lib"

/**
 * What a probe can conclude about a video.
 *
 * `unknown` is a first-class answer, not a failure: a probe that could not
 * reach YouTube says so rather than claiming the video is bad, because the
 * common cause is the building's Wi-Fi rather than the link.
 */
export type YouTubeProbeResult =
  | { status: "ok"; title: string; authorName?: string }
  | { status: "not-embeddable" }
  | { status: "unavailable" }
  | { status: "unknown" }

/** Long enough for a slow connection, short enough that the dialog doesn't feel stuck. */
const PROBE_TIMEOUT_MS = 5000

/**
 * Asks YouTube's public oEmbed endpoint whether a video exists and can be
 * embedded, and what it is called.
 *
 * Used to give the operator that answer while they are adding the link,
 * rather than in front of a room. It needs no API key and no account, and
 * it is the one network call this feature makes.
 */
export const probeYouTubeVideo = async (videoId: string): Promise<YouTubeProbeResult> => {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    buildYouTubeWatchUrl(videoId)
  )}&format=json`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)

  try {
    const response = await fetch(endpoint, { signal: controller.signal })

    // oEmbed reports a deleted or private video as 404, and one whose owner
    // has disabled embedding as 401 — the two states the operator can act
    // on differently.
    if (response.status === 401 || response.status === 403) return { status: "not-embeddable" }
    if (response.status === 404) return { status: "unavailable" }
    if (!response.ok) return { status: "unknown" }

    const payload = (await response.json()) as { title?: string; author_name?: string }
    return { status: "ok", title: payload.title ?? "", authorName: payload.author_name }
  } catch {
    // Offline, blocked, or timed out. Nothing is concluded about the video.
    return { status: "unknown" }
  } finally {
    clearTimeout(timeout)
  }
}
