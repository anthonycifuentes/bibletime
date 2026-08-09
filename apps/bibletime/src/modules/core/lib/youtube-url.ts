/**
 * A YouTube video id: exactly 11 characters from YouTube's base64url-ish
 * alphabet. Checking the shape here is what lets an invalid link be refused
 * at add time rather than becoming a blank frame on stage.
 */
const VIDEO_ID_PATTERN = /^[\w-]{11}$/

/** The hosts a video link can arrive on, including the mobile and no-cookie variants. */
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
])

const SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"])

/** Path prefixes that carry the id as the next segment. */
const ID_BEARING_PREFIXES = new Set(["embed", "shorts", "live", "v"])

/**
 * Pulls the video id out of any of the forms a person is likely to paste.
 *
 * Returns `null` for a channel, a playlist without a video, a search, or a
 * non-YouTube URL — all of which are refused with a message rather than
 * stored as a link that will fail later.
 */
export const extractYouTubeVideoId = (input: string): string | null => {
  const trimmed = input.trim()
  if (!trimmed) return null

  // A bare id is accepted too: it is what a user copying from a URL bar
  // fragment most often ends up with.
  if (VIDEO_ID_PATTERN.test(trimmed)) return trimmed

  let url: URL
  try {
    // Tolerates a pasted link with no scheme, which is common.
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  const segments = url.pathname.split("/").filter(Boolean)

  if (SHORT_HOSTS.has(host)) {
    const id = segments[0]
    return id && VIDEO_ID_PATTERN.test(id) ? id : null
  }

  if (!YOUTUBE_HOSTS.has(host)) return null

  // `watch?v=<id>` — the canonical desktop form.
  const queryId = url.searchParams.get("v")
  if (queryId && VIDEO_ID_PATTERN.test(queryId)) return queryId

  // `/embed/<id>`, `/shorts/<id>`, `/live/<id>`, `/v/<id>`.
  const [prefix, candidate] = segments
  if (prefix && candidate && ID_BEARING_PREFIXES.has(prefix.toLowerCase()) && VIDEO_ID_PATTERN.test(candidate)) {
    return candidate
  }

  return null
}

/**
 * The form stored in a slide's `src`.
 *
 * Deliberately the ordinary `watch?v=` URL rather than an embed URL or a
 * bare id: someone opening an exported project file should recognize what
 * they are looking at, and should be able to paste it into a browser.
 */
export const buildYouTubeWatchUrl = (videoId: string): string => `https://www.youtube.com/watch?v=${videoId}`

export interface YouTubeEmbedOptions {
  /** Whole seconds; anything falsy starts at the beginning. */
  startSeconds?: number
  loop?: boolean
  muted?: boolean
  /** False in a static thumbnail, where autoplaying every tile would be chaos. */
  autoplay?: boolean
}

/**
 * The player URL for an `<iframe>`.
 *
 * `youtube-nocookie.com` because a presentation console has no reason to
 * set advertising cookies on an operator's machine. Looping needs the
 * `playlist=<id>` companion parameter — a single-video embed has no other
 * way to repeat.
 */
export const buildYouTubeEmbedUrl = (videoId: string, options: YouTubeEmbedOptions = {}): string => {
  const { startSeconds = 0, loop = false, muted = true, autoplay = true } = options

  const parameters = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    mute: muted ? "1" : "0",
    // Hides related videos from other channels at the end — a sermon
    // shouldn't hand the room over to whatever YouTube suggests next.
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  })

  if (startSeconds > 0) parameters.set("start", String(Math.floor(startSeconds)))
  if (loop) {
    parameters.set("loop", "1")
    parameters.set("playlist", videoId)
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${parameters.toString()}`
}
