import type { UpdateDriver } from "@/modules/updates/interfaces"

/** The version Vite baked in at build time — the only version a browser tab can be running. */
const currentVersion = __APP_VERSION__

/**
 * Web build: the browser is served the latest deploy on every load, so
 * there is nothing to check for and nothing to download.
 *
 * It reports a permanent "up to date" rather than throwing, so the shared
 * components render a sensible state without scattering platform checks —
 * the same reason `web-bible-version-downloads` exists.
 */
export const webUpdates: UpdateDriver = {
  canCheck: false,
  getState: async () => ({
    currentVersion,
    lastCheckedAt: null,
    lastSeenVersion: null,
    dismissedVersion: null,
  }),
  check: async () => ({
    status: "up-to-date",
    currentVersion,
    checkedAt: Date.now(),
  }),
  download: async () => ({
    status: "failed",
    detail: "Downloads are not available in the web version.",
  }),
  cancelDownload: async () => {},
  revealDownload: async () => {},
  dismiss: async () => {},
  onDownloadProgress: () => () => {},
}
