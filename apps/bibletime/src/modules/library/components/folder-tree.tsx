import { useState } from "react"
import type { FormEvent } from "react"

import type { Folder, FolderItem } from "@/modules/library/interfaces"
import { Button } from "@workspace/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ChevronRightIcon,
  Delete02Icon,
  Edit02Icon,
  Folder01Icon,
  Folder02Icon,
  MoreVerticalIcon,
  StarSquareIcon,
} from "@hugeicons/core-free-icons"
import { useTranslation } from "@/modules/core/i18n"

const folderItemLabel = (item: FolderItem): string => {
  switch (item.type) {
    case "bible-passage":
      return item.data.reference
    case "song":
    case "media":
      return item.data.title
  }
}

interface FolderTreeProps {
  folders: Folder[]
  openFolderId: string | null
  canWrite: boolean
  onOpenFolder: (folderId: string | null) => void
  onCreateFolder: (name: string) => void
  onRenameFolder: (folderId: string, name: string) => void
  onDeleteFolder: (folderId: string) => void
  /** Plain display name of the active project — switching/creating/deleting projects lives in the Projects tab, not here. */
  activeProjectName: string | undefined
}

/**
 * The sidebar: a plain header naming the active project (not interactive —
 * switch/create/delete projects from the bottom drawer's Projects tab
 * instead) plus the "add folder" action, then per the provided
 * `CollapsibleFileTree` reference, each folder is a collapsible node (its
 * ordered items as read-only leaf rows underneath — selection/reordering
 * happens in the slide console once the folder is open, not here).
 * Clicking a folder's name opens it in the slide console; clicking an item
 * row opens its folder too, as a shortcut into that item's neighborhood.
 */
export function FolderTree({
  folders,
  openFolderId,
  canWrite,
  onOpenFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  activeProjectName,
}: FolderTreeProps) {
  const { t } = useTranslation()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [creating, setCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

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
    if (trimmed) onCreateFolder(trimmed)
    setNewFolderName("")
    setCreating(false)
  }

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
      ) : null}

      <div className="flex flex-col gap-1">
        {folders.map((folder) => {
          const isOpen = folder.id === openFolderId
          const isRenaming = renamingId === folder.id

          return (
            <Collapsible
              key={folder.id}
              open={isOpen}
              onOpenChange={(open) => onOpenFolder(open ? folder.id : null)}
            >
              <div
                className={cn(
                  "group flex w-full items-center gap-1 rounded-md hover:bg-accent",
                  isOpen && "bg-accent"
                )}
              >
                <CollapsibleTrigger
                  render={<Button variant="ghost" size="icon-xs" className="group shrink-0" />}
                >
                  <HugeiconsIcon
                    icon={ChevronRightIcon}
                    strokeWidth={2}
                    className="transition-transform group-data-[panel-open]:rotate-90"
                  />
                </CollapsibleTrigger>

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
                    onClick={() => onOpenFolder(folder.id)}
                    className="flex flex-1 items-center gap-2 truncate py-1.5 text-left text-sm font-medium"
                  >
                    <HugeiconsIcon
                      icon={isOpen ? Folder02Icon : Folder01Icon}
                      strokeWidth={2}
                      className="shrink-0"
                    />
                    <span className="truncate">{folder.name}</span>
                  </button>
                )}

                {canWrite ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-xs" className="shrink-0" />}
                    >
                      <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
                      <span className="sr-only">{folder.name}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => startRename(folder)}>
                        <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
                        {t("library.renameFolder")}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => onDeleteFolder(folder.id)}>
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                        {t("library.deleteFolder")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>

              <CollapsibleContent className="mt-1 ml-6">
                <div className="flex flex-col gap-1">
                  {folder.items.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">{t("library.emptyFolder")}</p>
                  ) : (
                    folder.items.map((item) => (
                      <Button
                        key={item.id}
                        type="button"
                        variant="link"
                        size="sm"
                        className="w-full justify-start gap-2 text-foreground"
                        onClick={() => onOpenFolder(folder.id)}
                      >
                        <HugeiconsIcon icon={StarSquareIcon} strokeWidth={2} />
                        <span className="truncate">{folderItemLabel(item)}</span>
                      </Button>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
