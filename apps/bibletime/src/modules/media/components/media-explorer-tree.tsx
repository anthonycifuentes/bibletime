import { useCallback, useEffect, useState } from "react"
import type { DragEvent } from "react"

import { useTranslation } from "@/modules/core/i18n"
import type { MediaDirectory, MediaLocation } from "@/modules/media/interfaces"
import { listDirectory } from "@/modules/media/services"
import type { MediaRootStatus } from "@/modules/media/services"
import { Button } from "@workspace/ui/components/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Delete02Icon,
  FolderAddIcon,
  Folder01Icon,
  Folder02Icon,
  ImageIcon,
  StarIcon,
} from "@hugeicons/core-free-icons"

interface MediaExplorerTreeProps {
  roots: MediaRootStatus[]
  location: MediaLocation
  onSelectLocation: (location: MediaLocation) => void
  onAddRoot: () => void
  onAddRootByPath: (directoryPath: string) => void
  onRemoveRoot: (rootId: string) => void
  onRelocateRoot: (rootId: string) => void
}

/** Lazily-loaded subdirectories, keyed by `<rootId>:<relativePath>` — a media root can be a whole Pictures library, so nothing is walked until it's opened. */
type DirectoryCache = Record<string, MediaDirectory[] | undefined>

const cacheKey = (rootId: string, relativePath: string) => `${rootId}:${relativePath}`

/**
 * The Media tab's first column: the two synthetic views that span roots
 * (All, Favorites), then each registered root as an expandable directory
 * tree.
 *
 * Hand-rolled rather than built on `TreeView` (as `FolderTree` is): that
 * component takes a fully-materialized nested array, which here would mean
 * walking every subdirectory of every root up front — the one thing a
 * filesystem browser must not do. Children load on expand instead.
 */
export function MediaExplorerTree({
  roots,
  location,
  onSelectLocation,
  onAddRoot,
  onAddRootByPath,
  onRemoveRoot,
  onRelocateRoot,
}: MediaExplorerTreeProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [children, setChildren] = useState<DirectoryCache>({})
  const [isDropTarget, setIsDropTarget] = useState(false)

  const loadChildren = useCallback(async (rootId: string, relativePath: string) => {
    const key = cacheKey(rootId, relativePath)
    try {
      const listing = await listDirectory(rootId, relativePath)
      setChildren((current) => ({ ...current, [key]: listing.directories }))
    } catch {
      setChildren((current) => ({ ...current, [key]: [] }))
    }
  }, [])

  const toggle = useCallback(
    (rootId: string, relativePath: string) => {
      const key = cacheKey(rootId, relativePath)
      setExpanded((current) => {
        const next = new Set(current)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
          if (!children[key]) void loadChildren(rootId, relativePath)
        }
        return next
      })
    },
    [children, loadChildren]
  )

  // A root removed elsewhere shouldn't leave its subtree cached and expanded.
  useEffect(() => {
    const liveRootIds = new Set(roots.map((root) => root.id))
    setExpanded((current) => {
      const next = new Set([...current].filter((key) => liveRootIds.has(key.split(":")[0] ?? "")))
      return next.size === current.size ? current : next
    })
  }, [roots])

  const isDirectorySelected = (rootId: string, relativePath: string) =>
    location.kind === "directory" && location.rootId === rootId && location.relativePath === relativePath

  const rowClassName = (isSelected: boolean) =>
    cn(
      "group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors duration-200 hover:bg-accent",
      isSelected && "bg-accent"
    )

  const renderDirectory = (rootId: string, directory: MediaDirectory, depth: number) => {
    const key = cacheKey(rootId, directory.relativePath)
    const isExpanded = expanded.has(key)

    return (
      <div key={key}>
        <div style={{ paddingLeft: depth * 14 }} className={rowClassName(isDirectorySelected(rootId, directory.relativePath))}>
          <button
            type="button"
            onClick={() => toggle(rootId, directory.relativePath)}
            className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
          >
            <HugeiconsIcon icon={isExpanded ? Folder02Icon : Folder01Icon} size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => onSelectLocation({ kind: "directory", rootId, relativePath: directory.relativePath })}
            className="flex-1 truncate"
          >
            {directory.name}
          </button>
        </div>

        {isExpanded
          ? (children[key] ?? []).map((child) => renderDirectory(rootId, child, depth + 1))
          : null}
      </div>
    )
  }

  /**
   * Dropping a folder from the OS file manager registers it as a root —
   * the desktop-native way to add one, next to the picker button.
   */
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDropTarget(false)

    for (const file of Array.from(event.dataTransfer.files)) {
      // Chromium exposes the real path on a dropped entry only in Electron;
      // a file (rather than a folder) drop is ignored rather than guessed at.
      const path = (window.bibletime ? (file as File & { path?: string }).path : undefined) ?? ""
      if (path) onAddRootByPath(path)
    }
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-1 overflow-y-auto rounded-md",
        isDropTarget && "outline-2 outline-dashed outline-ring"
      )}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDropTarget(true)
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={handleDrop}
    >
      <button
        type="button"
        onClick={() => onSelectLocation({ kind: "all" })}
        className={rowClassName(location.kind === "all")}
      >
        <HugeiconsIcon icon={ImageIcon} size={14} strokeWidth={2} className="shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">{t("media.allFiles")}</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectLocation({ kind: "favorites" })}
        className={rowClassName(location.kind === "favorites")}
      >
        <HugeiconsIcon icon={StarIcon} size={14} strokeWidth={2} className="shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">{t("media.favorites")}</span>
      </button>

      <div className="my-1 h-px shrink-0 bg-border" />

      {roots.map((root) => {
        const key = cacheKey(root.id, "")
        const isExpanded = expanded.has(key)

        return (
          <div key={root.id}>
            <ContextMenu>
              <ContextMenuTrigger className={rowClassName(isDirectorySelected(root.id, ""))}>
                <button
                  type="button"
                  onClick={() => toggle(root.id, "")}
                  disabled={!root.isAvailable}
                  className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
                >
                  <HugeiconsIcon
                    icon={root.isAvailable ? (isExpanded ? Folder02Icon : Folder01Icon) : Alert02Icon}
                    size={14}
                    strokeWidth={2}
                    className={cn(!root.isAvailable && "text-destructive")}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectLocation({ kind: "directory", rootId: root.id, relativePath: "" })}
                  className="flex-1 truncate font-medium"
                >
                  {root.label}
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onRelocateRoot(root.id)}>
                  <HugeiconsIcon icon={FolderAddIcon} strokeWidth={2} />
                  {t("media.relocateRoot")}
                </ContextMenuItem>
                <ContextMenuItem variant="destructive" onClick={() => onRemoveRoot(root.id)}>
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  {t("media.removeRoot")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            {/* An unreachable root says so in place, with its two remedies one right-click away. */}
            {!root.isAvailable ? (
              <p className="px-2 pb-1 pl-8 text-xs text-muted-foreground">{t("media.rootUnavailable")}</p>
            ) : null}

            {isExpanded
              ? (children[key] ?? []).map((child) => renderDirectory(root.id, child, 1))
              : null}
          </div>
        )
      })}

      <Button type="button" variant="outline" size="sm" className="mt-2 shrink-0" onClick={onAddRoot}>
        <HugeiconsIcon icon={FolderAddIcon} strokeWidth={2} />
        {t("media.addFolder")}
      </Button>

      {roots.length === 0 ? (
        <p className="px-2 py-2 text-xs text-muted-foreground">{t("media.noRootsHint")}</p>
      ) : null}
    </div>
  )
}
