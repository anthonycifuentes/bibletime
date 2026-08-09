import { describe, expect, it } from "vitest"

import { buildYouTubeEmbedUrl, buildYouTubeWatchUrl, extractYouTubeVideoId } from "./youtube-url"

/** A realistic id: 11 characters, and one that exercises both `-` and `_`. */
const ID = "dQw4w9WgXcQ"

describe("extractYouTubeVideoId", () => {
  it("accepts every URL form a person is likely to paste", () => {
    const forms = [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://youtube.com/watch?v=${ID}`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://music.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube.com/live/${ID}`,
      `https://www.youtube.com/v/${ID}`,
      `https://www.youtube-nocookie.com/embed/${ID}`,
    ]

    for (const form of forms) {
      expect(extractYouTubeVideoId(form), form).toBe(ID)
    }
  })

  it("tolerates a link with no scheme and surrounding whitespace", () => {
    expect(extractYouTubeVideoId(`  youtube.com/watch?v=${ID}  `)).toBe(ID)
  })

  it("accepts a bare id, which is what copying from a URL fragment produces", () => {
    expect(extractYouTubeVideoId(ID)).toBe(ID)
  })

  it("keeps the video id when extra query parameters ride along", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${ID}&list=PL123&index=2`)).toBe(ID)
  })

  it("ids containing - and _ survive, since both are in YouTube's alphabet", () => {
    expect(extractYouTubeVideoId("https://youtu.be/a-b_c-d_e-f")).toBe("a-b_c-d_e-f")
  })

  it("refuses anything that is not one specific video", () => {
    const refused = [
      "",
      "   ",
      "not a url",
      "https://example.com/watch?v=dQw4w9WgXcQ", // Right shape, wrong site.
      "https://www.youtube.com/@somechannel",
      "https://www.youtube.com/playlist?list=PL1234567890",
      "https://www.youtube.com/results?search_query=hymns",
      `https://www.youtube.com/watch?v=${ID}extra`, // 16 characters, not 11.
      "https://www.youtube.com/watch?v=tooshort",
      "https://youtu.be/",
    ]

    for (const input of refused) {
      expect(extractYouTubeVideoId(input), input).toBeNull()
    }
  })
})

describe("buildYouTubeWatchUrl", () => {
  it("round-trips through extraction", () => {
    expect(extractYouTubeVideoId(buildYouTubeWatchUrl(ID))).toBe(ID)
  })

  it("produces the ordinary watch URL, so an exported project stays readable", () => {
    expect(buildYouTubeWatchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`)
  })
})

describe("buildYouTubeEmbedUrl", () => {
  const parametersOf = (url: string) => new URL(url).searchParams

  it("targets the no-cookie host", () => {
    expect(buildYouTubeEmbedUrl(ID).startsWith(`https://www.youtube-nocookie.com/embed/${ID}?`)).toBe(true)
  })

  it("defaults to muted autoplay, which is the only combination browsers allow", () => {
    const parameters = parametersOf(buildYouTubeEmbedUrl(ID))
    expect(parameters.get("autoplay")).toBe("1")
    expect(parameters.get("mute")).toBe("1")
  })

  it("carries a start time only when there is one", () => {
    expect(parametersOf(buildYouTubeEmbedUrl(ID, { startSeconds: 90 })).get("start")).toBe("90")
    expect(parametersOf(buildYouTubeEmbedUrl(ID)).get("start")).toBeNull()
    expect(parametersOf(buildYouTubeEmbedUrl(ID, { startSeconds: 0 })).get("start")).toBeNull()
  })

  it("floors a fractional start time, since the parameter is whole seconds", () => {
    expect(parametersOf(buildYouTubeEmbedUrl(ID, { startSeconds: 12.7 })).get("start")).toBe("12")
  })

  it("pairs loop with playlist, the only way a single-video embed repeats", () => {
    const looping = parametersOf(buildYouTubeEmbedUrl(ID, { loop: true }))
    expect(looping.get("loop")).toBe("1")
    expect(looping.get("playlist")).toBe(ID)

    const once = parametersOf(buildYouTubeEmbedUrl(ID, { loop: false }))
    expect(once.get("loop")).toBeNull()
    expect(once.get("playlist")).toBeNull()
  })

  it("unmutes when asked", () => {
    expect(parametersOf(buildYouTubeEmbedUrl(ID, { muted: false })).get("mute")).toBe("0")
  })

  it("round-trips: the embed URL it builds still yields the same id", () => {
    expect(extractYouTubeVideoId(buildYouTubeEmbedUrl(ID, { loop: true, startSeconds: 30 }))).toBe(ID)
  })
})
