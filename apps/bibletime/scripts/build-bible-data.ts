// Node.js >= 20. Run via `pnpm --filter web build:bible-data`.
//
// Reads the raw RVR1960 export at the repo root and writes a trimmed copy
// into public/bible-data/, stripping the `chapter_html` field (~10.6MB of
// the ~23.6MB source) since the app renders from the structured `items`
// array only.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOURCE_PATH = path.join(__dirname, "..", "..", "..", "RVR1960_vid_149.json")
const OUTPUT_PATH = path.join(__dirname, "..", "public", "bible-data", "rvr1960.json")

type RawChapter = Record<string, unknown> & { chapter_html?: string }
type RawBook = { chapters: RawChapter[] } & Record<string, unknown>
type RawVersion = { books: RawBook[] } & Record<string, unknown>

const main = async (): Promise<void> => {
  const raw = await fs.promises.readFile(SOURCE_PATH, "utf8")
  const version: RawVersion = JSON.parse(raw)

  for (const book of version.books) {
    for (const chapter of book.chapters) {
      delete chapter.chapter_html
    }
  }

  await fs.promises.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.promises.writeFile(OUTPUT_PATH, JSON.stringify(version), "utf8")

  const { size } = await fs.promises.stat(OUTPUT_PATH)
  console.info(
    `Wrote ${OUTPUT_PATH} (${(size / 1024 / 1024).toFixed(2)}MB, ${version.books.length} books).`,
  )
}

await main()
