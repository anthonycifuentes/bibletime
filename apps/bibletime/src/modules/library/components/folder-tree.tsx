import { useEffect, useState } from "react"
import type { FormEvent } from "react"

import type { Folder, FolderItem } from "@/modules/library/interfaces"
import {
  foldersToTreeNodes,
  getAncestorIds,
  getDescendantIds,
  getFolderDepth,
} from "@/modules/library/lib/build-folder-tree"
import type { FolderTreeNodeData } from "@/modules/library/lib/build-folder-tree"
import { Button } from "@workspace/ui/components/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import { Input } from "@workspace/ui/components/input"
import { TreeView } from "@workspace/ui/components/tree-view"
import type { TreeDragEvent, TreeNodeNested, TreeNodeRenderProps } from "@workspace/ui/components/tree-view"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Delete02Icon,
  Edit02Icon,
  Folder01Icon,
  Folder02Icon,
  FolderAddIcon,
  GalleryThumbnailsIcon,
  GripVerticalIcon,
  PaintBoardIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons"
import { useTranslation } from "@/modules/core/i18n"

/** A folder is nestable up to this many levels below root (0 = root, so 0/1/2 is 3 levels total). */
const MAX_DEPTH = 2

const folderItemLabel = (item: FolderItem): string => {
  switch (item.type) {
    case "bible-passage":
      return item.data.reference
    case "song":
      // The section's label ("Verse 1", "Chorus") — a song's slides all
      // share one title, so the title alone wouldn't tell them apart here.
      return item.data.sectionLabel
    case "note":
      return item.data.label
    case "media":
      return item.data.title
  }
}

interface FolderTreeProps {
  folders: Folder[]
  openFolderId: string | null
  canWrite: boolean
  onOpenFolder: (folderId: string | null) => void
  onCreateFolder: (name: string, parentId: string | null) => void
  onRenameFolder: (folderId: string, name: string) => void
  onDeleteFolder: (folderId: string) => void
  onApplyFolderTree: (tree: TreeNodeNested<FolderTreeNodeData>[]) => void
  /** Marks a slide "ready to present" (opens its folder and selects it) — the click behavior for a slide row. */
  onPrepareItem: (itemId: string, folderId: string) => void
  /** Same as `onPrepareItem`, but presents immediately too — the double-click shortcut and a context-menu action. */
  onPresentItem: (itemId: string, folderId: string) => void
  /** Removes a single slide — a context-menu action. */
  onDeleteItem: (itemId: string, folderId: string) => void
  /** Opens the per-slide style editor for a slide — a context-menu action. Takes the folder id because a tree slide need not live in the open folder. */
  onEditItemStyle: (itemId: string, folderId: string) => void
  /** Plain display name of the active project — switching/creating/deleting projects lives in the Projects tab, not here. */
  activeProjectName: string | undefined
  /** Files dropped from the Media tab's grid onto a folder row — appended to that folder, open or not. */
  onDropMediaOnFolder?: (folderId: string) => void
}

/**
 * The sidebar: a plain header naming the active project (not interactive —
 * switch/create/delete projects from the bottom drawer's Projects tab
 * instead) plus the "add folder" action, then a `TreeView` (up to 3 levels
 * deep) — each folder's slides shown as leaf nodes once its branch is
 * expanded. Selecting a folder opens it in the console (which also expands
 * its own node and its ancestors' nodes, since there's only ever one "open"
 * folder at a time); selecting the already-open folder closes it. Folders
 * can be dragged to reorder/reparent (subject to the 3-level cap and no
 * cycles); slides can be dragged to reorder within their folder or moved
 * into a different one. Keyboard navigation, ARIA tree semantics, and the
 * drag mechanics themselves all come from `TreeView` — this component only
 * supplies the domain-specific bits: the row markup and the drop rules.
 */
export function FolderTree({
  folders,
  openFolderId,
  canWrite,
  onOpenFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onApplyFolderTree,
  onPrepareItem,
  onPresentItem,
  onDeleteItem,
  onEditItemStyle,
  activeProjectName,
  onDropMediaOnFolder,
}: FolderTreeProps) {
  const { t } = useTranslation()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [creating, setCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingSubfolderParentId, setCreatingSubfolderParentId] = useState<string | null>(null)
  const [newSubfolderName, setNewSubfolderName] = useState("")
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([])

  const items = foldersToTreeNodes(folders)
  const folderById = new Map(folders.map((folder) => [folder.id, folder]))
  const folderIdByItemId = new Map<string, string>()
  folders.forEach((folder) => folder.items.forEach((item) => folderIdByItemId.set(item.id, folder.id)))

  // One-time reveal: when a folder is newly opened, fold it and its ancestor
  // chain into local expansion state. Additive and a one-shot effect (not a
  // continuous union) so the user can still collapse the open folder's own
  // row afterward — a continuous union would force it back open every render.
  useEffect(() => {
    if (!openFolderId) return
    const idsToReveal = [openFolderId, ...getAncestorIds(folders, openFolderId)]
    setExpandedFolderIds((current) => {
      const next = new Set(current)
      let changed = false
      for (const id of idsToReveal) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? Array.from(next) : current
    })
  }, [openFolderId])

  const expandedIds = expandedFolderIds

  const startRename = (folder: Folder) => {
    setRenamingId(folder.id)
    setRenameValue(folder.name)
  }

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = renameValue.trim()
    if (renamingId && trimmed) onRenameFolder(renamingId, trimmed)
    setRenamingId(null)
  }

  const submitNewFolder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = newFolderName.trim()
    if (trimmed) onCreateFolder(trimmed, null)
    setNewFolderName("")
    setCreating(false)
  }

  const startCreateSubfolder = (folder: Folder) => {
    // Opens the parent right away so the new subfolder — once created — is
    // immediately visible instead of landing inside a still-collapsed node.
    onOpenFolder(folder.id)
    setCreatingSubfolderParentId(folder.id)
  }

  const submitNewSubfolder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = newSubfolderName.trim()
    if (trimmed && creatingSubfolderParentId) onCreateFolder(trimmed, creatingSubfolderParentId)
    setNewSubfolderName("")
    setCreatingSubfolderParentId(null)
  }

  /**
   * Cycle prevention for folders is already enforced internally by the
   * library before it ever calls `onItemsChange` — checked again here too,
   * so the drop indicator itself doesn't promise a move that would
   * otherwise silently no-op. The interleaving rule (a folder can't sit
   * among a folder's slides; a slide can't become a sibling of folders) is
   * ours alone — the library has no concept of the two being different
   * kinds of children.
   */
  const canDrop = (event: TreeDragEvent<FolderTreeNodeData>): boolean => {
    const sourceIsFolder = event.source.data.kind === "folder"
    const targetIsFolder = event.target.data.kind === "folder"

    if (sourceIsFolder) {
      if (!targetIsFolder) return false
      if (event.projectedDepth > MAX_DEPTH) return false
      if (getDescendantIds(folders, event.source.id).includes(event.target.id)) return false
      return true
    }

    // Dragging a slide: fine relative to another slide; relative to a
    // folder, only "inside" (move into it) is valid, never a sibling.
    if (targetIsFolder && event.position !== "inside") return false
    return true
  }

  const renderNode = ({
    node,
    isExpanded,
    depth,
    select,
    toggle,
    handleRef,
  }: TreeNodeRenderProps<FolderTreeNodeData>) => {
    // A dedicated grip is required here — see tree-node.tsx: once a `handle`
    // is set, dragging can only start from it, but that's the only way to
    // keep the other buttons in this row (toggle, name, menu) fully
    // clickable without every click also racing to activate a drag.
    const grip = (
      <div
        ref={(element) => handleRef(element)}
        className="flex size-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground/40 active:cursor-grabbing group-hover:text-muted-foreground"
      >
        <HugeiconsIcon icon={GripVerticalIcon} size={12} strokeWidth={2} />
      </div>
    )

    if (node.data.kind === "item") {
      const item = node.data.item
      const owningFolderId = folderIdByItemId.get(item.id)

      const itemRowClassName =
        "group flex w-full items-center gap-1 rounded-md py-1 transition-colors duration-200 hover:bg-accent"

      const itemRowContent = (
        <>
          {grip}
          <button
            type="button"
            onClick={(event) => select(event)}
            onDoubleClick={() => owningFolderId && onPresentItem(item.id, owningFolderId)}
            className="flex-1 truncate text-left text-sm text-foreground"
          >
            <span className="truncate">{folderItemLabel(item)}</span>
          </button>
        </>
      )

      if (!canWrite || !owningFolderId) {
        return (
          <div style={{ paddingLeft: depth * 20 }} className={itemRowClassName}>
            {itemRowContent}
          </div>
        )
      }

      return (
        <ContextMenu>
          <ContextMenuTrigger style={{ paddingLeft: depth * 20 }} className={itemRowClassName}>
            {itemRowContent}
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onPrepareItem(item.id, owningFolderId)}>
              <HugeiconsIcon icon={GalleryThumbnailsIcon} strokeWidth={2} />
              {t("library.prepareSlide")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onPresentItem(item.id, owningFolderId)}>
              <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
              {t("library.present")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onEditItemStyle(item.id, owningFolderId)}>
              <HugeiconsIcon icon={PaintBoardIcon} strokeWidth={2} />
              {t("library.editStyle")}
            </ContextMenuItem>
            <ContextMenuItem variant="destructive" onClick={() => onDeleteItem(item.id, owningFolderId)}>
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              {t("library.deleteSlide")}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )
    }

    const folder = node.data.folder
    const isRenaming = renamingId === folder.id
    const isActiveInConsole = folder.id === openFolderId
    const canCreateSubfolder = depth < MAX_DEPTH

    const rowClassName = cn(
      "group flex w-full items-center gap-1 rounded-md py-1 transition-colors duration-200 hover:bg-accent",
      isActiveInConsole && "bg-accent"
    )

    const mediaDropProps = onDropMediaOnFolder
      ? {
          onDragOver: (event: React.DragEvent) => event.preventDefault(),
          onDrop: (event: React.DragEvent) => {
            event.preventDefault()
            event.stopPropagation()
            onDropMediaOnFolder(folder.id)
          },
        }
      : {}

    const rowContent = (
      <>
        {grip}
        <button
          type="button"
          onClick={() => toggle()}
          className="flex size-4 shrink-0 items-center justify-center"
        >
          <HugeiconsIcon
            icon={isExpanded ? Folder02Icon : Folder01Icon}
            size={16}
            strokeWidth={2}
            className="shrink-0"
          />
        </button>

        {isRenaming ? (
          <form onSubmit={submitRename} className="flex-1">
            <Input
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onBlur={() => setRenamingId(null)}
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={(event) => select(event)}
            className="flex-1 truncate py-0.5 text-left text-sm font-medium"
          >
            <span className="truncate">{folder.name}</span>
          </button>
        )}
      </>
    )

    if (!canWrite) {
      return (
        <div style={{ paddingLeft: depth * 20 }} className={rowClassName} {...mediaDropProps}>
          {rowContent}
        </div>
      )
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger
          style={{ paddingLeft: depth * 20 }}
          className={rowClassName}
          {...mediaDropProps}
        >
          {rowContent}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled={!canCreateSubfolder} onClick={() => startCreateSubfolder(folder)}>
            <HugeiconsIcon icon={FolderAddIcon} strokeWidth={2} />
            {t("library.newSubfolder")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => startRename(folder)}>
            <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
            {t("library.renameFolder")}
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={() => onDeleteFolder(folder.id)}>
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            {t("library.deleteFolder")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  }

  const renderDragOverlay = ({ node }: TreeNodeRenderProps<FolderTreeNodeData>) => (
    <div className="rounded-md border border-border bg-card px-2 py-1 text-sm shadow-lg">
      {node.data.kind === "folder" ? node.data.folder.name : folderItemLabel(node.data.item)}
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-semibold text-muted-foreground uppercase">
          {activeProjectName}
        </span>
        {canWrite ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setCreating((prev) => !prev)}
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            <span className="sr-only">{t("library.newFolder")}</span>
          </Button>
        ) : null}
      </div>

      {creating ? (
        <form onSubmit={submitNewFolder}>
          <Input
            autoFocus
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            onBlur={() => {
              if (!newFolderName.trim()) setCreating(false)
            }}
            placeholder={t("library.folderNamePlaceholder")}
          />
        </form>
      ) : null}

      {folders.length === 0 && !creating ? (
        <p className="text-sm text-muted-foreground">{t("library.noFolders")}</p>
      ) : (
        <TreeView<FolderTreeNodeData>
          items={items}
          onItemsChange={onApplyFolderTree}
          renderNode={renderNode}
          renderDragOverlay={renderDragOverlay}
          selectionMode="single"
          selectedIds={openFolderId ? [openFolderId] : []}
          onSelectedIdsChange={(ids) => {
            const id = ids[0]
            if (!id) {
              onOpenFolder(null)
              return
            }
            if (folderById.has(id)) {
              onOpenFolder(id === openFolderId ? null : id)
              return
            }
            const owningFolderId = folderIdByItemId.get(id)
            if (owningFolderId) onPrepareItem(id, owningFolderId)
          }}
          expandedIds={expandedIds}
          onExpandedIdsChange={setExpandedFolderIds}
          draggable
          droppable
          canDrop={canDrop}
          aria-label={t("library.folderTreeLabel")}
        />
      )}

      {creatingSubfolderParentId ? (
        <form
          onSubmit={submitNewSubfolder}
          style={{ paddingLeft: (getFolderDepth(folders, creatingSubfolderParentId) + 1) * 20 }}
        >
          <Input
            autoFocus
            value={newSubfolderName}
            onChange={(event) => setNewSubfolderName(event.target.value)}
            onBlur={() => {
              if (!newSubfolderName.trim()) setCreatingSubfolderParentId(null)
            }}
            placeholder={t("library.folderNamePlaceholder")}
          />
        </form>
      ) : null}
    </div>
  )
}
