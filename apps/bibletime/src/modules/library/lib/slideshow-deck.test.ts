import { describe, expect, it } from "vitest"

import type { FolderItem } from "@/modules/library/interfaces"
import {
  resolveDeckCursor,
  resolveJumpIndex,
  resolveMoveIndex,
} from "@/modules/library/lib/slideshow-deck"

/** A deck of ids — the only field any of these functions reads. */
const deck = (...ids: string[]): FolderItem[] =>
  ids.map((id) => ({
    id,
    type: "note" as const,
    data: { text: id, label: id },
  }))

describe("resolveDeckCursor", () => {
  it("keeps the current slide when it is still in the deck", () => {
    expect(resolveDeckCursor(deck("a", "b", "c"), "b", 1)).toBe("b")
  })

  it("follows the current slide through a reorder", () => {
    // 'b' moved from index 1 to index 2 — the cursor follows the slide, not
    // the position, which is the whole reason the cursor is an id.
    expect(resolveDeckCursor(deck("a", "c", "b"), "b", 1)).toBe("b")
  })

  it("is unmoved by an insertion before the current slide", () => {
    expect(resolveDeckCursor(deck("z", "a", "b", "c"), "b", 2)).toBe("b")
  })

  it("falls to the slide that took the deleted one's index", () => {
    expect(resolveDeckCursor(deck("a", "c"), "b", 1)).toBe("c")
  })

  it("falls to the last slide when the deleted one was at the end", () => {
    expect(resolveDeckCursor(deck("a", "b"), "c", 2)).toBe("b")
  })

  it("returns undefined for an emptied deck", () => {
    expect(resolveDeckCursor([], "b", 1)).toBeUndefined()
  })

  it("clamps a stale index rather than reading past the deck", () => {
    expect(resolveDeckCursor(deck("a"), "gone", 9)).toBe("a")
  })

  it("seeds from the first slide when there is no cursor yet", () => {
    expect(resolveDeckCursor(deck("a", "b"), undefined, 0)).toBe("a")
  })
})

describe("resolveMoveIndex", () => {
  it("advances and goes back one slide", () => {
    expect(resolveMoveIndex(5, 2, "next")).toBe(3)
    expect(resolveMoveIndex(5, 2, "previous")).toBe(1)
  })

  it("stops at the last slide instead of wrapping to the first", () => {
    expect(resolveMoveIndex(5, 4, "next")).toBe(4)
  })

  it("stops at the first slide instead of wrapping to the last", () => {
    expect(resolveMoveIndex(5, 0, "previous")).toBe(0)
  })

  it("jumps to the ends", () => {
    expect(resolveMoveIndex(5, 2, "first")).toBe(0)
    expect(resolveMoveIndex(5, 2, "last")).toBe(4)
  })

  it("names no slide in an empty deck", () => {
    expect(resolveMoveIndex(0, 0, "next")).toBe(-1)
    expect(resolveMoveIndex(0, 0, "last")).toBe(-1)
  })
})

describe("resolveJumpIndex", () => {
  it("converts a typed 1-based number to a 0-based index", () => {
    expect(resolveJumpIndex("1", 12)).toBe(0)
    expect(resolveJumpIndex("12", 12)).toBe(11)
  })

  it("rejects an empty buffer", () => {
    expect(resolveJumpIndex("", 12)).toBeNull()
  })

  it("rejects zero, which names no slide", () => {
    expect(resolveJumpIndex("0", 12)).toBeNull()
  })

  it("rejects a number past the end of the deck", () => {
    expect(resolveJumpIndex("13", 12)).toBeNull()
    expect(resolveJumpIndex("999", 12)).toBeNull()
  })

  it("rejects a buffer that is not a number", () => {
    expect(resolveJumpIndex("abc", 12)).toBeNull()
  })

  it("names nothing in an empty deck", () => {
    expect(resolveJumpIndex("1", 0)).toBeNull()
  })
})
