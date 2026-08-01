import type { BibleVersionDownloadDriver } from "@/modules/bible/interfaces"

import { desktopBibleVersionDownloads } from "./desktop-bible-version-downloads"
import { webBibleVersionDownloads } from "./web-bible-version-downloads"

/**
 * Picks the filesystem-backed driver when running inside the Electron shell
 * (the preload bridge is present), else the no-op web driver.
 */
export const getBibleVersionDownloads = (): BibleVersionDownloadDriver => {
  if (typeof window !== "undefined" && window.bibletime?.bibleVersionDownloads) {
    return desktopBibleVersionDownloads
  }
  return webBibleVersionDownloads
}
