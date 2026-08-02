import type { Folder, FolderItem } from "@/modules/library/interfaces"
import type { TreeNodeNested } from "@workspace/ui/components/tree-view"

/** A tree node is either a folder (a group, may have subfolders and its own slides as children) or one of a folder's slides (always a leaf). */
export type FolderTreeNodeData =
  | { kind: "folder"; folder: Folder }
  | { kind: "item"; item: FolderItem }

const parentKey = (folder: Folder): string | null => folder.parentId ?? null

/**
 * Maps the flat `Folder[]` (each with its own `items`) into the nested
 * `TreeNodeNested<FolderTreeNodeData>[]` shape `TreeView` expects — one
 * homogeneous tree, subfolders before a folder's own slides within its
 * `children` (folders-before-files, matching the previous visual
 * convention). Sibling folders are sorted by `position`, falling back to
 * original array order when missing (folders saved before manual
 * reordering existed) — no migration needed. A folder's `items` are kept
 * in their existing array order.
 */
export function foldersToTreeNodes(folders: Folder[]): TreeNodeNested<FolderTreeNodeData>[] {
  const byParent = new Map<string | null, Folder[]>()
  folders.forEach((folder) => {
    const key = parentKey(folder)
    const siblings = byParent.get(key) ?? []
    siblings.push(folder)
    byParent.set(key, siblings)
  })

  const sortSiblings = (list: Folder[]) =>
    list
      .map((folder, index) => ({ folder, index }))
      .sort((a, b) => (a.folder.position ?? a.index) - (b.folder.position ?? b.index))
      .map(({ folder }) => folder)

  const buildLevel = (parentId: string | null): TreeNodeNested<FolderTreeNodeData>[] =>
    sortSiblings(byParent.get(parentId) ?? []).map((folder) => ({
      id: folder.id,
      data: { kind: "folder", folder },
      isGroup: true,
      children: [
        ...buildLevel(folder.id),
        ...folder.items.map(
          (item): TreeNodeNested<FolderTreeNodeData> => ({
            id: item.id,
            data: { kind: "item", item },
          })
        ),
      ],
    }))

  return buildLevel(null)
}

/** A folder's depth in the tree — 0 for a root folder. Derived, never stored, so reparenting never needs to touch any descendant's own record. */
export function getFolderDepth(folders: Folder[], folderId: string): number {
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  let depth = 0
  let current = byId.get(folderId)
  while (current?.parentId) {
    depth += 1
    current = byId.get(current.parentId)
  }
  return depth
}

/** Every id in `folderId`'s ancestor chain, closest parent first — used to auto-expand the path down to the console's currently open folder. */
export function getAncestorIds(folders: Folder[], folderId: string): string[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const ancestors: string[] = []
  let current = byId.get(folderId)
  while (current?.parentId) {
    ancestors.push(current.parentId)
    current = byId.get(current.parentId)
  }
  return ancestors
}

/** Every id in `folderId`'s subtree (children, grandchildren, ...), not including `folderId` itself — used for cascading delete and cycle prevention on move. */
export function getDescendantIds(folders: Folder[], folderId: string): string[] {
  const childrenOf = new Map<string, string[]>()
  folders.forEach((folder) => {
    if (!folder.parentId) return
    const siblings = childrenOf.get(folder.parentId) ?? []
    siblings.push(folder.id)
    childrenOf.set(folder.parentId, siblings)
  })

  const descendants: string[] = []
  const queue = [...(childrenOf.get(folderId) ?? [])]
  while (queue.length > 0) {
    const id = queue.shift()
    if (id === undefined) break
    descendants.push(id)
    queue.push(...(childrenOf.get(id) ?? []))
  }
  return descendants
}
