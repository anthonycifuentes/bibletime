import { create } from "zustand"

interface ConsoleState {
  /** The Library folder currently open in the slide console/preview panel. */
  openFolderId: string | null
  /** Multi-select over the open folder's slide list. */
  selectedItemIds: Set<string>
  /** The most recently selected item — what the preview panel shows. */
  lastSelectedItemId: string | null
  openFolder: (folderId: string | null) => void
  selectItem: (itemId: string, options?: { additive?: boolean }) => void
  selectAll: (itemIds: string[]) => void
  clearSelection: () => void
}

/**
 * Shell-level state shared across every pane of the console (folder tree,
 * slide console, preview panel) — a module-level store rather than
 * component state, so the open folder and slide selection survive a tab
 * switch (each of the five bottom-nav tabs is its own route, which remounts
 * the console shell's component tree; this store does not remount with it).
 */
export const useConsoleStore = create<ConsoleState>((set) => ({
  openFolderId: null,
  selectedItemIds: new Set(),
  lastSelectedItemId: null,

  openFolder: (folderId) =>
    set({ openFolderId: folderId, selectedItemIds: new Set(), lastSelectedItemId: null }),

  selectItem: (itemId, options) =>
    set((state) => {
      if (!options?.additive) {
        return { selectedItemIds: new Set([itemId]), lastSelectedItemId: itemId }
      }

      const next = new Set(state.selectedItemIds)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return { selectedItemIds: next, lastSelectedItemId: itemId }
    }),

  selectAll: (itemIds) =>
    set({ selectedItemIds: new Set(itemIds), lastSelectedItemId: itemIds.at(-1) ?? null }),

  clearSelection: () => set({ selectedItemIds: new Set(), lastSelectedItemId: null }),
}))
