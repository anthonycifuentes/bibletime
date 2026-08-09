import { useCallback, useEffect, useRef, useState } from "react"
import type { ChangeEvent, DragEvent } from "react"

import { useTranslation } from "@/modules/core/i18n"
import type { MediaCapabilities, MediaDirectory, MediaLocation } from "@/modules/media/interfaces"
import {
  DOCUMENT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from "@/modules/media/lib/supported-formats"
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
  capabilities: MediaCapabilities
  onSelectLocation: (location: MediaLocation) => void
  onAddRoot: () => void
  onAddRootByPath: (directoryPath: string) => void
  /** Adds loose files, for a browser that cannot hand over a whole folder. */
  onAddFiles: (files: File[], rootId?: string) => void
  onRemoveRoot: (rootId: string) => void
  onRelocateRoot: (rootId: string) => void
  onReconnectRoot: (rootId: string) => void
}

/**
 * The picker's filter, built from the same allowlist the grid uses so the
 * two can never drift — a file the picker offers is always one the grid
 * will list.
 */
const FILE_PICKER_ACCEPT = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ...DOCUMENT_EXTENSIONS]
  .map((extension) => `.${extension}`)
  .join(",")

/** Bytes as something a person reads at a glance — a stash's size sits next to its name. */
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
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
  capabilities,
  onSelectLocation,
  onAddRoot,
  onAddRootByPath,
  onAddFiles,
  onRemoveRoot,
  onRelocateRoot,
  onReconnectRoot,
}: MediaExplorerTreeProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [children, setChildren] = useState<DirectoryCache>({})
  const [isDropTarget, setIsDropTarget] = useState(false)
  const filePickerRef = useRef<HTMLInputElement>(null)

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
   * A drop means two different things in the two builds, so it is resolved
   * by what the drop actually carries rather than by a build check: a
   * desktop drop exposes a real path and registers a whole folder, while a
   * browser drop hands over `File` objects that go into a stash.
   */
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDropTarget(false)

    const dropped = Array.from(event.dataTransfer.files)
    const paths = dropped
      .map((file) => (file as File & { path?: string }).path ?? "")
      .filter((path) => path.length > 0)

    if (paths.length > 0) {
      for (const path of paths) onAddRootByPath(path)
      return
    }

    if (dropped.length > 0) onAddFiles(dropped)
  }

  const handleFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? [])
    if (picked.length > 0) onAddFiles(picked)
    // Cleared so picking the same file twice in a row still fires a change.
    event.target.value = ""
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
                  // A stash has no subdirectories to open, and an unreadable
                  // root has nothing to list.
                  disabled={!root.isAvailable || root.kind === "stash"}
                  className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
                >
                  <HugeiconsIcon
                    icon={
                      root.state !== "ready"
                        ? Alert02Icon
                        : root.kind === "stash"
                          ? ImageIcon
                          : isExpanded
                            ? Folder02Icon
                            : Folder01Icon
                    }
                    size={14}
                    strokeWidth={2}
                    className={cn(
                      root.state === "unavailable" && "text-destructive",
                      root.state === "needs-permission" && "text-muted-foreground"
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectLocation({ kind: "directory", rootId: root.id, relativePath: "" })}
                  className="flex-1 truncate font-medium"
                >
                  {root.label}
                </button>
                {/* A stash grows browser storage, so its size is visible rather than discovered later. */}
                {root.storedBytes ? (
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(root.storedBytes)}</span>
                ) : null}
              </ContextMenuTrigger>
              <ContextMenuContent>
                {root.kind === "stash" ? (
                  <ContextMenuItem onClick={() => filePickerRef.current?.click()}>
                    <HugeiconsIcon icon={FolderAddIcon} strokeWidth={2} />
                    {t("media.addFiles")}
                  </ContextMenuItem>
                ) : (
                  <ContextMenuItem onClick={() => onRelocateRoot(root.id)}>
                    <HugeiconsIcon icon={FolderAddIcon} strokeWidth={2} />
                    {t("media.relocateRoot")}
                  </ContextMenuItem>
                )}
                <ContextMenuItem variant="destructive" onClick={() => onRemoveRoot(root.id)}>
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  {t("media.removeRoot")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            {/*
              The two unreadable states get different copy and different
              affordances, because they have different remedies: a lapsed
              permission is one click away from working, while a missing
              folder needs relocating or removing.
            */}
            {root.state === "needs-permission" ? (
              <div className="flex items-center gap-2 px-2 pb-1 pl-8">
                <p className="flex-1 text-xs text-muted-foreground">{t("media.rootNeedsPermission")}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => onReconnectRoot(root.id)}>
                  {t("media.reconnectRoot")}
                </Button>
              </div>
            ) : null}

            {root.state === "unavailable" ? (
              <p className="px-2 pb-1 pl-8 text-xs text-muted-foreground">{t("media.rootUnavailable")}</p>
            ) : null}

            {isExpanded
              ? (children[key] ?? []).map((child) => renderDirectory(root.id, child, 1))
              : null}
          </div>
        )
      })}

      {/*
        "Add folder" only appears where a folder can actually be handed over.
        Rendering it disabled in Safari would read as a broken app rather
        than as a browser limitation, which is what the hint below explains.
      */}
      {capabilities.canBrowseDirectories ? (
        <Button type="button" variant="outline" size="sm" className="mt-2 shrink-0" onClick={onAddRoot}>
          <HugeiconsIcon icon={FolderAddIcon} strokeWidth={2} />
          {t("media.addFolder")}
        </Button>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("shrink-0", capabilities.canBrowseDirectories ? "mt-1" : "mt-2")}
        onClick={() => filePickerRef.current?.click()}
      >
        <HugeiconsIcon icon={ImageIcon} strokeWidth={2} />
        {t("media.addFiles")}
      </Button>

      <input
        ref={filePickerRef}
        type="file"
        multiple
        accept={FILE_PICKER_ACCEPT}
        className="hidden"
        onChange={handleFilePicked}
      />

      {/* Says why the folder option is missing, so the limit reads as a browser fact. */}
      {!capabilities.canBrowseDirectories ? (
        <p className="px-2 py-2 text-xs text-muted-foreground">{t("media.noDirectoryPickerHint")}</p>
      ) : null}

      {roots.length === 0 && capabilities.canBrowseDirectories ? (
        <p className="px-2 py-2 text-xs text-muted-foreground">{t("media.noRootsHint")}</p>
      ) : null}
    </div>
  )
}
