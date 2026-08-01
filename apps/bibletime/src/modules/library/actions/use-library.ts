import { useCallback, useEffect, useState } from "react"

import type { Folder, FolderItem } from "@/modules/library/interfaces"
import { getLibraryStorage } from "@/modules/library/services"

const createId = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

// A stable singleton per platform (see `getLibraryStorage`), so this is safe to
// depend on directly below without re-resolving it on every render.
const storage = getLibraryStorage()

/**
 * The Library's folders and their ordered items: create/rename/delete a
 * folder, and add/remove/reorder items within one, plus applying a template
 * to a set of items. Meant to be called once at the console shell's root and
 * passed down, so every pane (folder tree, slide console, preview panel)
 * reads and mutates the same in-memory folder list rather than each keeping
 * its own copy that could drift out of sync.
 *
 * `activeProjectId` scopes the returned `folders` to whichever project is
 * currently active (see `useProjects`) — folders belonging to other
 * projects are loaded (so operations on them still work if referenced) but
 * never returned in `folders`, and `createFolder` requires a non-null
 * `activeProjectId` to stamp onto the new folder.
 */
export const useLibrary = (activeProjectId: string | null) => {
  const [allFolders, setAllFolders] = useState<Folder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await storage.list()
    setAllFolders(list)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Re-fetches whenever the active project changes — including the very
    // first time it flips from `null` to a real id once `useProjects`'s
    // migration finishes, since that migration patches folder records in
    // storage that this hook may have already fetched a stale copy of.
    void refresh()
  }, [refresh, activeProjectId])

  const folders = allFolders.filter((folder) => folder.projectId === activeProjectId)

  const createFolder = useCallback(
    async (name: string) => {
      if (!activeProjectId) return undefined

      const folder: Folder = {
        id: createId("folder"),
        projectId: activeProjectId,
        name,
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await storage.save(folder)
      await refresh()
      return folder
    },
    [activeProjectId, refresh]
  )

  const renameFolder = useCallback(
    async (folderId: string, name: string) => {
      const existing = allFolders.find((folder) => folder.id === folderId)
      if (!existing) return
      await storage.save({ ...existing, name, updatedAt: Date.now() })
      await refresh()
    },
    [allFolders, refresh]
  )

  const deleteFolder = useCallback(
    async (folderId: string) => {
      await storage.remove(folderId)
      await refresh()
    },
    [refresh]
  )

  /** Deletes every folder belonging to a project — used when a project itself is deleted, which may not be the active one. */
  const deleteFoldersInProject = useCallback(
    async (projectId: string) => {
      const targets = allFolders.filter((folder) => folder.projectId === projectId)
      await Promise.all(targets.map((folder) => storage.remove(folder.id)))
      await refresh()
    },
    [allFolders, refresh]
  )

  const addItemToFolder = useCallback(
    async (folderId: string, item: Omit<FolderItem, "id">) => {
      const existing = allFolders.find((folder) => folder.id === folderId)
      if (!existing) return

      const newItem = { ...item, id: createId("item") } as FolderItem
      await storage.save({ ...existing, items: [...existing.items, newItem], updatedAt: Date.now() })
      await refresh()
    },
    [allFolders, refresh]
  )

  const removeFolderItems = useCallback(
    async (folderId: string, itemIds: string[]) => {
      const existing = allFolders.find((folder) => folder.id === folderId)
      if (!existing) return

      const targetIds = new Set(itemIds)
      await storage.save({
        ...existing,
        items: existing.items.filter((item) => !targetIds.has(item.id)),
        updatedAt: Date.now(),
      })
      await refresh()
    },
    [allFolders, refresh]
  )

  const reorderFolderItems = useCallback(
    async (folderId: string, itemIds: string[]) => {
      const existing = allFolders.find((folder) => folder.id === folderId)
      if (!existing) return

      const itemsById = new Map(existing.items.map((item) => [item.id, item]))
      const items = itemIds.map((id) => itemsById.get(id)).filter((item) => item !== undefined)

      await storage.save({ ...existing, items, updatedAt: Date.now() })
      await refresh()
    },
    [allFolders, refresh]
  )

  const applyTemplateToItems = useCallback(
    async (folderId: string, itemIds: string[], templateId: string) => {
      const existing = allFolders.find((folder) => folder.id === folderId)
      if (!existing) return

      const targetIds = new Set(itemIds)
      const items = existing.items.map((item) =>
        targetIds.has(item.id) ? { ...item, templateId } : item
      )

      await storage.save({ ...existing, items, updatedAt: Date.now() })
      await refresh()
    },
    [allFolders, refresh]
  )

  return {
    folders,
    isLoading,
    canWrite: storage.canWrite,
    createFolder,
    renameFolder,
    deleteFolder,
    deleteFoldersInProject,
    addItemToFolder,
    removeFolderItems,
    reorderFolderItems,
    applyTemplateToItems,
  }
}
