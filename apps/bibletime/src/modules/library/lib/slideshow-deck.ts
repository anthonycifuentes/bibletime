import type { FolderItem } from "@/modules/library/interfaces"

/**
 * Where the cursor lands after the deck changed underneath a running
 * slideshow.
 *
 * The rule the whole slideshow rests on: a change to the folder moves the
 * *view*, never the *output*. Silently changing what a congregation is
 * looking at because someone fixed a typo in another pane is the failure
 * worth designing against, so this function decides where the cursor points
 * and says nothing about sending.
 *
 * - The current slide still exists → it stays current, wherever it moved to.
 *   Reordering follows the slide; inserting and deleting around it change
 *   only its index.
 * - The current slide is gone → the slide that took its index, else the last
 *   slide (the deleted one was at the end). This is the "nearest survivor"
 *   the notes pane and filmstrip then follow.
 * - The deck is empty → `undefined`, which is the view's empty state.
 *
 * `previousIndex` is where the current slide *was*, which is the only way to
 * know what "nearest" means once the item itself is gone.
 */
export const resolveDeckCursor = (
  items: FolderItem[],
  currentItemId: string | undefined,
  previousIndex: number
): string | undefined => {
  if (items.length === 0) return undefined

  if (currentItemId && items.some((item) => item.id === currentItemId)) {
    return currentItemId
  }

  const fallbackIndex = Math.min(Math.max(previousIndex, 0), items.length - 1)
  return items[fallbackIndex]?.id
}

/**
 * The slide a move lands on, clamped to the deck rather than wrapping.
 *
 * Not wrapping is deliberate: advancing past the last slide of a service
 * should do nothing, not restart the service from its title slide in front
 * of everyone. Returning the *same* index at a boundary is what lets the
 * caller detect "this move changed nothing" and skip sending.
 */
export const resolveMoveIndex = (
  total: number,
  currentIndex: number,
  move: "next" | "previous" | "first" | "last"
): number => {
  if (total === 0) return -1

  switch (move) {
    case "next":
      return Math.min(currentIndex + 1, total - 1)
    case "previous":
      return Math.max(currentIndex - 1, 0)
    case "first":
      return 0
    case "last":
      return total - 1
  }
}

/**
 * Parses a typed jump buffer into a 0-based deck index, or `null` when it
 * names no slide in this deck.
 *
 * The buffer is what the operator typed, so it is 1-based (the filmstrip and
 * the position readout both count from 1) and it is untrusted: `0`, `999`,
 * and an empty buffer all have to mean "no jump" rather than an index that
 * happens to be out of range.
 */
export const resolveJumpIndex = (buffer: string, total: number): number | null => {
  if (buffer === "") return null

  const position = Number.parseInt(buffer, 10)
  if (!Number.isFinite(position) || position < 1 || position > total) return null

  return position - 1
}
