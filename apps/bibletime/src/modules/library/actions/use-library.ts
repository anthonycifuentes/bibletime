import { useCallback, useEffect, useState } from "react"

import type { Folder, FolderItem } from "@/modules/library/interfaces"
import { getDescendantIds } from "@/modules/library/lib/build-folder-tree"
import type { FolderTreeNodeData } from "@/modules/library/lib/build-folder-tree"
import { getLibraryStorage } from "@/modules/library/services"
import type { TreeNodeNested } from "@workspace/ui/components/tree-view"
import { flattenTree } from "@workspace/ui/lib/tree-utils"

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
    async (
      name: string,
      parentId: string | null = null,
      insertAt: "end" | "start" = "end",
      initialItems: Omit<FolderItem, "id">[] = []
    ) => {
      if (!activeProjectId) return undefined

      const siblings = allFolders.filter(
        (folder) => folder.projectId === activeProjectId && (folder.parentId ?? null) === parentId
      )

      const position =
        insertAt === "start"
          ? Math.min(0, ...siblings.map((folder) => folder.position ?? 0)) - 1
          : siblings.length

      const folder: Folder = {
        id: createId("folder"),
        projectId: activeProjectId,
        parentId,
        position,
        name,
        // Any initial items are included in this same write — adding them via
        // `addItemToFolder` right after would race against this folder not
        // existing yet in the `allFolders` snapshot that call closed over.
        items: initialItems.map((item) => ({ ...item, id: createId("item") }) as FolderItem),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await storage.save(folder)
      await refresh()
      return folder
    },
    [activeProjectId, allFolders, refresh]
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

  /** Deletes a folder and its entire subtree (subfolders at every depth, and their slides) — matches the no-confirmation behavior a folder with no subfolders already has. */
  const deleteFolder = useCallback(
    async (folderId: string) => {
      const idsToRemove = [folderId, ...getDescendantIds(allFolders, folderId)]
      await Promise.all(idsToRemove.map((id) => storage.remove(id)))
      await refresh()
    },
    [allFolders, refresh]
  )

  /**
   * Persists the result of a folder-tree drag-and-drop: `TreeView`'s
   * `onItemsChange` hands back the *entire* reordered/reparented nested
   * tree (folders and their slides both, per `FolderTreeNodeData`), not a
   * targeted delta — trying to reverse-engineer "what one thing moved"
   * would be more code than just trusting the snapshot. Flattens it (via
   * the library's own `flattenTree`), regroups each folder's new siblings
   * by kind to derive per-folder `position` (folders and items are
   * counted separately, since they're stored as separate concepts —
   * `parentId`/`position` vs. a folder's own `items` array) and each
   * folder's new `items` order, then saves only the folders whose
   * `parentId`/`position`/`items` actually changed.
   */
  const applyFolderTree = useCallback(
    async (tree: TreeNodeNested<FolderTreeNodeData>[]) => {
      const flat = flattenTree(tree)

      const positionCounters = new Map<string, number>()
      const folderPositions = new Map<string, { parentId: string | null; position: number }>()
      const itemsByFolderId = new Map<string, FolderItem[]>()

      for (const node of flat) {
        const key = `${node.parentId ?? "root"}:${node.data.kind}`
        const position = positionCounters.get(key) ?? 0
        positionCounters.set(key, position + 1)

        if (node.data.kind === "folder") {
          folderPositions.set(node.data.folder.id, { parentId: node.parentId, position })
        } else if (node.parentId) {
          const items = itemsByFolderId.get(node.parentId) ?? []
          items.push(node.data.item)
          itemsByFolderId.set(node.parentId, items)
        }
      }

      const now = Date.now()
      const updates: Folder[] = []
      for (const folder of allFolders) {
        const nextPosition = folderPositions.get(folder.id)
        if (!nextPosition) continue

        const nextItems = itemsByFolderId.get(folder.id) ?? []
        const changed =
          (folder.parentId ?? null) !== nextPosition.parentId ||
          (folder.position ?? -1) !== nextPosition.position ||
          nextItems.length !== folder.items.length ||
          nextItems.some((item, index) => item.id !== folder.items[index]?.id)

        if (!changed) continue
        updates.push({
          ...folder,
          parentId: nextPosition.parentId,
          position: nextPosition.position,
          items: nextItems,
          updatedAt: now,
        })
      }

      if (updates.length === 0) return
      await Promise.all(updates.map((folder) => storage.save(folder)))
      await refresh()
    },
    [allFolders, refresh]
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

  /** Same as `addItemToFolder`, but appends every item in one `storage.save` — e.g. a verse split into several slides, which should land as one atomic write instead of N sequential ones. */
  const addItemsToFolder = useCallback(
    async (folderId: string, items: Omit<FolderItem, "id">[]) => {
      const existing = allFolders.find((folder) => folder.id === folderId)
      if (!existing || items.length === 0) return

      const newItems = items.map((item) => ({ ...item, id: createId("item") }) as FolderItem)
      await storage.save({ ...existing, items: [...existing.items, ...newItems], updatedAt: Date.now() })
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
    applyFolderTree,
    deleteFoldersInProject,
    addItemToFolder,
    addItemsToFolder,
    removeFolderItems,
    reorderFolderItems,
    applyTemplateToItems,
  }
}
