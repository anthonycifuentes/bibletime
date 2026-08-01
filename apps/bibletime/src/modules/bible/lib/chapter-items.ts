import type { ChapterItem } from "@/modules/bible/interfaces"

/** The chapter's first verse number, or `undefined` if it has none (e.g. a front-matter chapter). */
export const findFirstVerseNumber = (items: ChapterItem[]): number | undefined => {
  for (const item of items) {
    if (item.type === "verse") {
      return item.verse_numbers[0]
    }
  }
  return undefined
}

/** The rendered text of the item containing `verseNumber`, or `undefined` if not found. */
export const findVerseText = (items: ChapterItem[], verseNumber: number): string | undefined => {
  const match = items.find(
    (item) => item.type === "verse" && item.verse_numbers.includes(verseNumber)
  )
  return match?.lines.join(" ")
}
