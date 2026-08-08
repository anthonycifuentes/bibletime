import type { MediaLocation, MediaViewSettings } from "@/modules/media/interfaces"

/**
 * Where the grid points before the user picks anything. "All" rather than a
 * root, so a library with several roots shows something on first open
 * instead of an empty pane.
 */
export const DEFAULT_MEDIA_LOCATION: MediaLocation = { kind: "all" }

/** Name-sorted, unfiltered, at a tile size that fits roughly six across a default-width grid. */
export const DEFAULT_MEDIA_VIEW_SETTINGS: MediaViewSettings = {
  sortKey: "name",
  kindFilter: null,
  search: "",
  thumbnailSize: 160,
}
