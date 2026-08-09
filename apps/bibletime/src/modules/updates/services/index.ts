import type { UpdateDriver } from "@/modules/updates/interfaces"

import { desktopUpdates } from "./desktop-updates"
import { webUpdates } from "./web-updates"

/**
 * Picks the main-process-backed driver when running inside the Electron
 * shell (the preload bridge is present), else the inert web driver.
 */
export const getUpdates = (): UpdateDriver => {
  if (typeof window !== "undefined" && window.bibletime?.updates) {
    return desktopUpdates
  }
  return webUpdates
}
