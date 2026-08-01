import type { BibleVersionDownloadDriver } from "@/modules/bible/interfaces"

export const desktopBibleVersionDownloads: BibleVersionDownloadDriver = {
  canDownload: true,
  list: async () => {
    return window.bibletime!.bibleVersionDownloads.list()
  },
  download: async (entry) => {
    return window.bibletime!.bibleVersionDownloads.download(entry)
  },
  read: async (versionId) => {
    return window.bibletime!.bibleVersionDownloads.read(versionId)
  },
  remove: async (versionId) => {
    return window.bibletime!.bibleVersionDownloads.remove(versionId)
  },
}
