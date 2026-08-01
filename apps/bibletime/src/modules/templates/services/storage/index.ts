import type { TemplateStorageDriver } from "@/modules/templates/interfaces"
import { desktopTemplateStorage } from "./desktop-template-storage"
import { webTemplateStorage } from "./web-template-storage"

/**
 * Picks the filesystem-backed driver when running inside the Electron shell
 * (the preload bridge is present), else the read-only web gallery.
 */
export const getTemplateStorage = (): TemplateStorageDriver => {
  if (typeof window !== "undefined" && window.bibletime?.templates) {
    return desktopTemplateStorage
  }
  return webTemplateStorage
}
