import type { Book } from "@/modules/bible/interfaces"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

interface BookListProps {
  books: Book[]
  /** The currently selected book's USFM code, if any (highlights it). */
  selectedBookUsfm?: string
  /** Called with a book's USFM code when its row is clicked. */
  onSelectBook: (bookUsfm: string) => void
  /**
   * Grid classes for the list. Defaults to a viewport-responsive multi-column
   * grid for full-width contexts. Callers embedding this in a narrow column
   * (e.g. the console's books column) should override with a single-column
   * layout instead.
   */
  className?: string
}

/** Renders the bundled translation's books, in canonical order, as selectable rows. */
export function BookList({ books, selectedBookUsfm, onSelectBook, className }: BookListProps) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
        className
      )}
    >
      {books.map((book) => {
        const isActive = book.book_usfm === selectedBookUsfm

        return (
          <li key={book.book_usfm}>
            <Button
              variant={isActive ? "default" : "outline"}
              className={cn("w-full justify-start", isActive && "pointer-events-none")}
              onClick={() => onSelectBook(book.book_usfm)}
            >
              {book.name}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
