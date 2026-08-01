import type { Book } from "@/modules/bible/interfaces"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

interface ChapterNavProps {
  book: Book
  /** The chapter currently being read, if any (highlights it). */
  currentChapterUsfm?: string
  /**
   * Grid classes for the chapter-number grid. Defaults to a viewport-responsive
   * layout for full-width contexts. Callers embedding this in a narrow column
   * (e.g. the console's chapters column) should override with a fixed,
   * narrower column count instead.
   */
  chaptersClassName?: string
  /** Called with a chapter's USFM code when it's selected. */
  onSelectChapter: (chapterUsfm: string) => void
}

/**
 * Lists a book's real chapters (intro/front-matter pseudo-chapters excluded)
 * as selectable rows.
 */
export function ChapterNav({
  book,
  currentChapterUsfm,
  chaptersClassName,
  onSelectChapter,
}: ChapterNavProps) {
  const chapters = book.chapters.filter((chapter) => chapter.is_chapter)

  return (
    <nav>
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
