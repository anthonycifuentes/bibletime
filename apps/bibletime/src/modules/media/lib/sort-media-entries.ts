import { normalizeText } from "@/modules/core/lib"
import type { MediaEntry, MediaViewSettings } from "@/modules/media/interfaces"

/**
 * Locale-aware name ordering with numeric collation, so `slide-2` sorts
 * before `slide-10` — the ordering a user expects from a folder of exported
 * deck pages, and the one a plain string comparison gets wrong.
 */
const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

export const sortMediaEntries = (entries: MediaEntry[], sortKey: MediaViewSettings["sortKey"]): MediaEntry[] => {
  const sorted = [...entries]

  switch (sortKey) {
    case "name":
      return sorted.sort((left, right) => byName.compare(left.name, right.name))
    case "date":
      // Newest first: the file just dropped in the folder is the one being
      // looked for far more often than the oldest one.
      return sorted.sort((left, right) => right.mtimeMs - left.mtimeMs)
    case "size":
      return sorted.sort((left, right) => right.size - left.size)
  }
}

/** Accent- and case-insensitive substring match on the file name, using `core`'s shared normalizer. */
export const filterMediaEntries = (entries: MediaEntry[], settings: MediaViewSettings): MediaEntry[] => {
  const search = normalizeText(settings.search)

  return entries.filter((entry) => {
    if (settings.kindFilter && entry.kind !== settings.kindFilter) return false
    if (!search) return true
    return normalizeText(entry.name).includes(search)
  })
}

/** Filter, then sort — the order the grid renders and the add actions iterate in. */
export const visibleMediaEntries = (entries: MediaEntry[], settings: MediaViewSettings): MediaEntry[] =>
  sortMediaEntries(filterMediaEntries(entries, settings), settings.sortKey)
