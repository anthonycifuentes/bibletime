import { useEffect, useRef } from "react"

import type { ChapterItem } from "@/modules/bible/interfaces"
import { cn } from "@workspace/ui/lib/utils"

interface VersePickerListProps {
  items: ChapterItem[]
  /** The verse currently shown in the preview column, if any (highlights its row). */
  selectedVerseNumber?: number
  /** Called with a verse's number when its row is clicked. */
  onSelectVerse: (verseNumber: number) => void
  /** Called with a verse's number when its row is double-clicked — converts and immediately presents it. */
  onDoubleClickVerse?: (verseNumber: number) => void
}

/**
 * Renders a chapter's structured items in order — this is both the reading
 * surface (headings, labels, and full verse text) and the picker for the
 * preview column: clicking a verse row calls `onSelectVerse`.
 */
export function VersePickerList({
  items,
  selectedVerseNumber,
  onSelectVerse,
  onDoubleClickVerse,
}: VersePickerListProps) {
  const selectedRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (selectedVerseNumber === undefined) return
    selectedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [selectedVerseNumber])

  return (
    <ul className="flex flex-col gap-2 text-base leading-relaxed">
      {items.map((item, index) => {
        const key = `${item.type}-${index}`
        const text = item.lines.join(" ")

        switch (item.type) {
          case "heading1":
            return (
              <li key={key} className="mt-4 text-xl font-bold first:mt-0">
                {text}
              </li>
            )
          case "heading2":
            return (
              <li key={key} className="mt-3 text-lg font-semibold first:mt-0">
                {text}
              </li>
            )
          case "section1":
            return (
              <li key={key} className="mt-2 text-base font-semibold text-muted-foreground">
                {text}
              </li>
            )
          case "section2":
            return (
              <li key={key} className="mt-2 text-sm font-semibold text-muted-foreground">
                {text}
              </li>
            )
          case "label":
            return (
              <li key={key} className="text-sm text-muted-foreground italic">
                {text}
              </li>
            )
          case "verse": {
            const verseNumber = item.verse_numbers[0]
            const isSelected = verseNumber === selectedVerseNumber

            return (
              <li key={key}>
                <button
                  type="button"
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => onSelectVerse(verseNumber)}
                  onDoubleClick={() => onDoubleClickVerse?.(verseNumber)}
                  aria-pressed={isSelected}
                  className={cn(
                    "w-full scroll-mt-4 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent",
                    isSelected && "bg-primary/10 ring-1 ring-primary/40"
                  )}
                >
                  <sup className="mr-1 font-semibold text-muted-foreground">
                    {item.verse_numbers.join("-")}
                  </sup>
                  {text}
                </button>
              </li>
            )
          }
          default:
            return null
        }
      })}
    </ul>
  )
}
