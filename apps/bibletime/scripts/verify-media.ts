// Node.js >= 20. Run via `pnpm --filter web verify:media`.
//
// Exercises the media module's pure helpers — the pieces with real logic and
// no React or Electron in them. Written as a runnable script rather than a
// test-framework suite because this repo has no test runner, and adding one
// was out of scope for `add-media-tab`; `tsx` is already a devDependency and
// `build-bible-data.ts` set the precedent.

import { extensionOf, kindForExtension, needsConversion, unsupportedReasonFor } from "../src/modules/media/lib/supported-formats"
import { contentKey, importedDocumentKey } from "../src/modules/media/lib/content-key"
import {
  buildCacheReference,
  buildMediaReference,
  isCacheReference,
  MEDIA_CACHE_HOST,
  parseMediaReference,
} from "../src/modules/media/services/media-reference"
import { filterMediaEntries, sortMediaEntries, visibleMediaEntries } from "../src/modules/media/lib/sort-media-entries"
import type { MediaEntry, MediaViewSettings } from "../src/modules/media/interfaces"

let failures = 0
let checks = 0

const check = (label: string, actual: unknown, expected: unknown): void => {
  checks += 1
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) {
    failures += 1
    console.error(`  ✗ ${label}\n      expected: ${b}\n      actual:   ${a}`)
    return
  }
  console.log(`  ✓ ${label}`)
}

const group = (name: string, run: () => void): void => {
  console.log(`\n${name}`)
  run()
}

group("supported-formats", () => {
  check("extension of a plain name", extensionOf("sunset.JPG"), "jpg")
  check("extension of a dotted name", extensionOf("my.deck.final.pptx"), "pptx")
  check("no extension", extensionOf("README"), "")
  check("dotfile has no extension", extensionOf(".DS_Store"), "")
  check("trailing dot has no extension", extensionOf("weird."), "")

  check("jpg is an image", kindForExtension("jpg"), "image")
  check("mp4 is a video", kindForExtension("mp4"), "video")
  check("pdf is a document", kindForExtension("pdf"), "document")
  check("txt is not media", kindForExtension("txt"), undefined)

  check("heic is listed but undecodable", unsupportedReasonFor("heic"), "codec")
  check("avi is listed but undecodable", unsupportedReasonFor("avi"), "codec")
  check("mp4 is decodable", unsupportedReasonFor("mp4"), undefined)
  // .mov is deliberately absent from the undecodable list: the common
  // H.264-in-MOV case plays, and the HEVC case can't be told apart by extension.
  check("mov is not pre-judged", unsupportedReasonFor("mov"), undefined)

  check("pptx needs LibreOffice", needsConversion("pptx"), true)
  check("odp needs LibreOffice", needsConversion("odp"), true)
  check("pdf goes straight to the rasterizer", needsConversion("pdf"), false)
})

group("content-key", () => {
  const key = contentKey("root-abc", "Photos/sunset.jpg", 1024, 1_700_000_000_000)
  check("is 16 lowercase hex characters", /^[0-9a-f]{16}$/.test(key), true)
  check("is stable for identical inputs", contentKey("root-abc", "Photos/sunset.jpg", 1024, 1_700_000_000_000), key)

  // The whole point of keying on size+mtime: an edited file must miss the cache.
  check(
    "changes when the file is edited (mtime)",
    contentKey("root-abc", "Photos/sunset.jpg", 1024, 1_700_000_000_001) !== key,
    true
  )
  check("changes when the size changes", contentKey("root-abc", "Photos/sunset.jpg", 2048, 1_700_000_000_000) !== key, true)
  check("changes with the path", contentKey("root-abc", "Photos/other.jpg", 1024, 1_700_000_000_000) !== key, true)
  check("changes with the root", contentKey("root-xyz", "Photos/sunset.jpg", 1024, 1_700_000_000_000) !== key, true)

  const deckKey = importedDocumentKey("deck-1", 1_700_000_000_000)
  check("an import key is stable", importedDocumentKey("deck-1", 1_700_000_000_000), deckKey)
  check("re-importing produces a new key", importedDocumentKey("deck-1", 1_700_000_000_001) !== deckKey, true)
})

group("media-reference", () => {
  const plain = buildMediaReference("root-abc", "Photos/sunset.jpg")
  check("builds a root reference", plain, "bibletime-file://root-abc/Photos/sunset.jpg")
  check("round-trips", parseMediaReference(plain), { host: "root-abc", path: "Photos/sunset.jpg" })

  // Real media folders are full of these — a hand-built URL would corrupt them.
  const awkward = buildMediaReference("root-abc", "Vacaciones 2024/#1 Café & Té.jpg")
  check("round-trips spaces, #, &, and accents", parseMediaReference(awkward)?.path, "Vacaciones 2024/#1 Café & Té.jpg")
  check("encodes the # rather than starting a fragment", awkward.includes("%23"), true)

  const cache = buildCacheReference("abcd1234abcd1234", "page-0007.png")
  check("builds a cache reference", cache, "bibletime-file://cache/abcd1234abcd1234/page-0007.png")
  check("parses a cache reference", parseMediaReference(cache), {
    host: MEDIA_CACHE_HOST,
    path: "abcd1234abcd1234/page-0007.png",
  })
  check("recognises a cache reference", isCacheReference(cache), true)
  check("a root reference is not a cache reference", isCacheReference(plain), false)

  check("rejects another scheme", parseMediaReference("file:///etc/passwd"), null)
  check("rejects a bare scheme", parseMediaReference("bibletime-file://"), null)
  check("rejects a host with no path", parseMediaReference("bibletime-file://root-abc/"), null)
  check("rejects a malformed percent-escape", parseMediaReference("bibletime-file://root-abc/%ZZ"), null)

  // Traversal is not rejected *here* — parsing is lexical, and containment is
  // enforced against the real filesystem in the main process. This records
  // that the parser passes it through rather than silently normalising it,
  // which is what makes the main-process guard the single source of truth.
  check("passes traversal through to the path guard", parseMediaReference("bibletime-file://root-abc/../secret")?.path, "../secret")

  // Root ids are minted lowercase in the main process precisely so this
  // holds: a host that arrives case-folded by the platform's URL parser
  // still resolves to the same root.
  check("host is matched case-insensitively", parseMediaReference("bibletime-file://ROOT-ABC/x.jpg")?.host, "root-abc")
  check("the cache host is matched case-insensitively", isCacheReference("bibletime-file://CACHE/k/thumb.jpg"), true)
})

group("sort-media-entries", () => {
  const entry = (name: string, size: number, mtimeMs: number, kind: MediaEntry["kind"] = "image"): MediaEntry => ({
    reference: `bibletime-file://root-abc/${name}`,
    rootId: "root-abc",
    relativePath: name,
    name,
    extension: extensionOf(name),
    kind,
    size,
    mtimeMs,
  })

  const entries = [
    entry("slide-10.png", 300, 30),
    entry("slide-2.png", 100, 10),
    entry("Ángel.jpg", 200, 20),
    entry("clip.mp4", 400, 40, "video"),
  ]

  check(
    "sorts by name with numeric collation (slide-2 before slide-10)",
    sortMediaEntries(entries, "name").map((item) => item.name),
    ["Ángel.jpg", "clip.mp4", "slide-2.png", "slide-10.png"]
  )
  check(
    "sorts newest first by date",
    sortMediaEntries(entries, "date").map((item) => item.name),
    ["clip.mp4", "slide-10.png", "Ángel.jpg", "slide-2.png"]
  )
  check(
    "sorts largest first by size",
    sortMediaEntries(entries, "size").map((item) => item.name),
    ["clip.mp4", "slide-10.png", "Ángel.jpg", "slide-2.png"]
  )

  const view = (patch: Partial<MediaViewSettings> = {}): MediaViewSettings => ({
    sortKey: "name",
    kindFilter: null,
    search: "",
    thumbnailSize: 160,
    ...patch,
  })

  check(
    "filters by kind",
    filterMediaEntries(entries, view({ kindFilter: "video" })).map((item) => item.name),
    ["clip.mp4"]
  )
  check(
    "search is accent-insensitive",
    filterMediaEntries(entries, view({ search: "angel" })).map((item) => item.name),
    ["Ángel.jpg"]
  )
  check(
    "search is case-insensitive",
    filterMediaEntries(entries, view({ search: "CLIP" })).map((item) => item.name),
    ["clip.mp4"]
  )
  check("an unmatched search yields nothing", filterMediaEntries(entries, view({ search: "zzz" })).length, 0)
  check(
    "filter then sort",
    visibleMediaEntries(entries, view({ search: "slide", sortKey: "name" })).map((item) => item.name),
    ["slide-2.png", "slide-10.png"]
  )
})

console.log(`\n${checks - failures}/${checks} checks passed`)
if (failures > 0) {
  console.error(`${failures} FAILED`)
  process.exit(1)
}
