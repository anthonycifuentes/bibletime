import type { LibraryStorageDriver, ProjectStorageDriver } from "@/modules/library/interfaces"
import { desktopLibraryStorage } from "./desktop-library-storage"
import { webLibraryStorage } from "./web-library-storage"
import { desktopProjectStorage } from "./desktop-project-storage"
import { webProjectStorage } from "./web-project-storage"

/**
 * Picks the filesystem-backed driver when running inside the Electron shell
 * (the preload bridge is present), else the browser-local web driver.
 */
export const getLibraryStorage = (): LibraryStorageDriver => {
  if (typeof window !== "undefined" && window.bibletime?.library) {
    return desktopLibraryStorage
  }
  return webLibraryStorage
}

/**
 * Picks the filesystem-backed driver when running inside the Electron shell
 * (the preload bridge is present), else the browser-local web driver.
 */
export const getProjectStorage = (): ProjectStorageDriver => {
  if (typeof window !== "undefined" && window.bibletime?.project) {
    return desktopProjectStorage
  }
  return webProjectStorage
}
