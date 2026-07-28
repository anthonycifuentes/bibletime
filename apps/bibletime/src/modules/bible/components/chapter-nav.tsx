import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"

import type { Book, NextPrev } from "@/modules/bible/interfaces"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

interface ChapterNavProps {
  book: Book
  /** The chapter currently being read, if any (highlights it). */
  currentChapterUsfm?: string
  previous?: NextPrev | null
  next?: NextPrev | null
  /**
   * Grid classes for the chapter-number grid. Defaults to a viewport-responsive
   * layout for full-width contexts. Callers embedding this in a narrow column
   * (e.g. the console's chapters column) should override with a fixed,
   * narrower column count instead.
   */
  chaptersClassName?: string
  /** Called with a chapter's USFM code when it (or prev/next) is selected. */
  onSelectChapter: (chapterUsfm: string) => void
}

/**
 * Lists a book's real chapters (intro/front-matter pseudo-chapters excluded)
 * as selectable rows, plus prev/next controls when a current chapter's
 * neighbors are provided.
 */
export function ChapterNav({
  book,
  currentChapterUsfm,
  previous,
  next,
  chaptersClassName,
  onSelectChapter,
}: ChapterNavProps) {
  const chapters = book.chapters.filter((chapter) => chapter.is_chapter)
  const showPrevNext = previous !== undefined || next !== undefined

  return (
    <nav className="flex flex-col gap-4">
      {showPrevNext ? (
        <div className="flex items-center justify-between gap-2">
          {previous ? (
            <Button variant="outline" size="sm" onClick={() => onSelectChapter(previous.usfm)}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              Anterior
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              Anterior
            </Button>
          )}

          {next ? (
            <Button variant="outline" size="sm" onClick={() => onSelectChapter(next.usfm)}>
              Siguiente
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Siguiente
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
            </Button>
          )}
        </div>
      ) : null}

      <ul
        className={cn(
          "grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10",
          chaptersClassName
        )}
      >
        {chapters.map((chapter) => {
          const isActive = chapter.chapter_usfm === currentChapterUsfm
          const chapterNumber = chapter.chapter_usfm.split(".")[1]

          return (
            <li key={chapter.chapter_usfm}>
              <Button
                variant={isActive ? "default" : "outline"}
                size="icon-sm"
                className={cn(isActive && "pointer-events-none")}
                onClick={() => onSelectChapter(chapter.chapter_usfm)}
              >
                {chapterNumber}
              </Button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
