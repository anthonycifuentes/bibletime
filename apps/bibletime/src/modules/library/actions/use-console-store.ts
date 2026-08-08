import { create } from "zustand"

import type { NoteDraft } from "@/modules/notes"
import { DEFAULT_MEDIA_LOCATION, DEFAULT_MEDIA_VIEW_SETTINGS } from "@/modules/media"
import type { MediaLocation, MediaViewSettings } from "@/modules/media"

const createNoteId = (): string => `note-${Math.random().toString(36).slice(2, 10)}`

export type BottomTab =
  | "projects"
  | "bible"
  | "songs"
  | "notes"
  | "media"
  | "templates"

interface ConsoleState {
  /** The Library folder currently open in the slide console/preview panel. */
  openFolderId: string | null
  /** Multi-select over the open folder's slide list. */
  selectedItemIds: Set<string>
  /** The most recently selected item — what the preview panel shows. */
  lastSelectedItemId: string | null
  /** Which bottom-drawer tab is active — kept here (not route-local state) so it survives navigating away to the template editor route and back. */
  bottomTab: BottomTab
  /** The Songs tab's search query — kept here, like `bottomTab`, so switching tabs and back doesn't clear what the user typed. */
  songQuery: string
  /** The song selected in the Songs tab, whose sections the middle column lists. */
  selectedSongId: string | null
  /** Which of the selected song's sections is previewed, or `null` when none is (the state right after picking a song). */
  selectedSongSectionIndex: number | null
  /**
   * The notes written this session, oldest first. Deliberately the
   * only content the console holds that is never written to storage — an
   * note becomes durable by being added to a folder, not by being
   * typed. Lost on reload, by design (see the change's `design.md`).
   */
  noteDrafts: NoteDraft[]
  /** Which draft the Notes tab previews, or `null` when none is. */
  selectedNoteId: string | null
  /** Where the Media tab's grid is pointed — a directory inside a root, or one of the views that span roots. */
  mediaLocation: MediaLocation
  /** The Media tab's selected files, by reference. */
  mediaSelectedReferences: string[]
  /** The most recently selected media file — what the Media tab's preview column shows. */
  mediaLastSelectedReference: string | null
  /** Sort, kind filter, name search, and tile size — kept here, like `songQuery`, so a tab round-trip doesn't reset them. */
  mediaView: MediaViewSettings
  openFolder: (folderId: string | null) => void
  selectItem: (itemId: string, options?: { additive?: boolean }) => void
  selectAll: (itemIds: string[]) => void
  clearSelection: () => void
  setBottomTab: (tab: BottomTab) => void
  setSongQuery: (query: string) => void
  selectSong: (songId: string | null) => void
  selectSongSection: (index: number | null) => void
  /** Appends a draft and selects it, returning nothing — the panel reads it back off the list. */
  createNote: (values: { heading: string; text: string }) => void
  updateNote: (id: string, values: { heading: string; text: string }) => void
  deleteNote: (id: string) => void
  selectNote: (id: string | null) => void
  setMediaLocation: (location: MediaLocation) => void
  setMediaSelection: (references: string[], lastReference: string | null) => void
  setMediaView: (view: MediaViewSettings) => void
}

/**
 * Shell-level state shared across every pane of the console (folder tree,
 * slide console, preview panel) — a module-level store rather than
 * component state, so the open folder, slide selection, and active bottom
 * tab survive navigating to a different top-level route (e.g. the template
 * editor) and back, which remounts the console shell's component tree; this
 * store does not remount with it.
 */
export const useConsoleStore = create<ConsoleState>((set) => ({
  openFolderId: null,
  selectedItemIds: new Set(),
  lastSelectedItemId: null,
  bottomTab: "projects",
  songQuery: "",
  selectedSongId: null,
  selectedSongSectionIndex: null,
  noteDrafts: [],
  selectedNoteId: null,
  mediaLocation: DEFAULT_MEDIA_LOCATION,
  mediaSelectedReferences: [],
  mediaLastSelectedReference: null,
  mediaView: DEFAULT_MEDIA_VIEW_SETTINGS,

  openFolder: (folderId) =>
    set({ openFolderId: folderId, selectedItemIds: new Set(), lastSelectedItemId: null }),

  setBottomTab: (tab) => set({ bottomTab: tab }),

  setSongQuery: (query) => set({ songQuery: query }),

  // Picking a different song clears the section selection rather than
  // carrying an index across songs, where it would point at unrelated lyrics.
  selectSong: (songId) => set({ selectedSongId: songId, selectedSongSectionIndex: null }),

  selectSongSection: (index) => set({ selectedSongSectionIndex: index }),

  // A new draft is appended (creation order is the list's order, and the
  // order its slides land in) and selected, so the preview immediately shows
  // what was just written.
  createNote: ({ heading, text }) =>
    set((state) => {
      const draft: NoteDraft = {
        id: createNoteId(),
        heading: heading.trim() === "" ? undefined : heading.trim(),
        text,
      }
      return {
        noteDrafts: [...state.noteDrafts, draft],
        selectedNoteId: draft.id,
      }
    }),

  updateNote: (id, { heading, text }) =>
    set((state) => ({
      noteDrafts: state.noteDrafts.map((draft) =>
        draft.id === id
          ? { ...draft, heading: heading.trim() === "" ? undefined : heading.trim(), text }
          : draft
      ),
    })),

  // Deleting the selected draft clears the selection rather than moving it to
  // a neighbour — the preview going empty is the honest signal that what it
  // was showing is gone.
  deleteNote: (id) =>
    set((state) => ({
      noteDrafts: state.noteDrafts.filter((draft) => draft.id !== id),
      selectedNoteId:
        state.selectedNoteId === id ? null : state.selectedNoteId,
    })),

  selectNote: (id) => set({ selectedNoteId: id }),

  // Moving the grid clears the selection rather than carrying references
  // across directories, where they'd point at files no longer listed.
  setMediaLocation: (location) =>
    set({ mediaLocation: location, mediaSelectedReferences: [], mediaLastSelectedReference: null }),

  setMediaSelection: (references, lastReference) =>
    set({ mediaSelectedReferences: references, mediaLastSelectedReference: lastReference }),

  setMediaView: (view) => set({ mediaView: view }),

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
