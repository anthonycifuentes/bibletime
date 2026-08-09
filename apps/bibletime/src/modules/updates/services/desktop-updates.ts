import type { UpdateAsset, UpdateDriver } from "@/modules/updates/interfaces"

/** Every call here assumes the preload bridge exists — `getUpdates()` is what guarantees that. */
const bridge = () => window.bibletime!.updates

/** Desktop: checks and downloads run in the main process, which owns the network and the filesystem. */
export const desktopUpdates: UpdateDriver = {
  canCheck: true,
  getState: () => bridge().getState(),
  check: () => bridge().check(),
  download: (asset: UpdateAsset) => bridge().download(asset),
  cancelDownload: () => bridge().cancelDownload(),
  revealDownload: () => bridge().revealDownload(),
  dismiss: (version: string) => bridge().dismiss(version),
  onDownloadProgress: (callback) => bridge().onDownloadProgress(callback),
}
