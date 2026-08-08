import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable"

import type { Folder } from "@/modules/library/interfaces"
import type { SavedTemplate } from "@/modules/templates"
import { SlideCard } from "@/modules/library/components/slide-card"
import { TemplatePickerDialog } from "@/modules/library/components/template-picker-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Input } from "@workspace/ui/components/input"
import { OverflowActions } from "@workspace/ui/components/overflow-actions"
import type { OverflowActionItem } from "@workspace/ui/components/overflow-actions"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Folder01Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons"
import { useTranslation } from "@/modules/core/i18n"

interface SlideConsoleProps {
  folder: Folder | undefined
  /** Whether any Library folder exists yet — distinguishes "no project started" from "folders exist, none open". */
  hasFolders: boolean
  canWrite: boolean
  onCreateFolder: (name: string) => void
  templates: SavedTemplate[]
  selectedItemIds: Set<string>
  onSelectItem: (itemId: string, additive: boolean) => void
  onPresentItem: (itemId: string) => void
  onSelectAll: (itemIds: string[]) => void
  onClearSelection: () => void
  onReorder: (itemIds: string[]) => void
  onRemove: (itemIds: string[]) => void
  /** Renames one slide's caption from its context menu — song slides only. */
  onRenameItem: (itemId: string, label: string) => void
  onApplyTemplate: (itemIds: string[], templateId: string) => void
  /** Files dropped from the Media tab's grid — appended to this folder. */
  onDropMedia?: () => void
}

/**
 * The console shell's main container: the currently open folder's items,
 * in order, as a selectable slide list — independent of which bottom-nav
 * tab is active (per `console-shell-navigation`, the open folder and its
 * slides persist across tab switches).
 */
export function SlideConsole({
  folder,
  hasFolders,
  canWrite,
  onCreateFolder,
  templates,
  selectedItemIds,
  onSelectItem,
  onPresentItem,
  onSelectAll,
  onClearSelection,
  onReorder,
  onRemove,
  onRenameItem,
  onApplyTemplate,
  onDropMedia,
}: SlideConsoleProps) {
  const { t } = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [actionsExpanded, setActionsExpanded] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  const submitNewFolder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = newFolderName.trim()
    if (trimmed) onCreateFolder(trimmed)
    setNewFolderName("")
    setCreatingFolder(false)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!folder || !over || active.id === over.id) return

    const oldIndex = folder.items.findIndex((item) => item.id === active.id)
    const newIndex = folder.items.findIndex((item) => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    onReorder(
      arrayMove(folder.items, oldIndex, newIndex).map((item) => item.id)
    )
  }

  const items = folder?.items
  const hasSelection = selectedItemIds.size > 0

  /**
   * Every bulk action is always rendered — unavailable ones are disabled
   * rather than unmounted, so the rail's width doesn't jump as the selection
   * changes and the user can see which actions exist before selecting.
   */
  const bulkActions = useMemo<OverflowActionItem[]>(
    () => [
      {
        id: "select-all",
        label: t("library.selectAll"),
        disabled: (items?.length ?? 0) === 0,
      },
      {
        id: "clear-selection",
        label: t("library.clearSelection"),
        disabled: !hasSelection,
      },
      {
        id: "apply-template",
        label: t("library.applyTemplate"),
        disabled: !hasSelection,
      },
      {
        id: "remove",
        label: t("library.removeSelected"),
        disabled: !hasSelection,
      },
    ],
    [items, hasSelection, t]
  )

  const runBulkAction = (action: OverflowActionItem) => {
    if (!folder) return

    switch (action.id) {
      case "select-all":
        onSelectAll(folder.items.map((item) => item.id))
        break
      case "clear-selection":
        onClearSelection()
        break
      case "remove":
        onRemove([...selectedItemIds])
        break
      case "apply-template":
        setPickerOpen(true)
        break
    }
  }

  if (!folder) {
    if (!hasFolders) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>{t("library.startProjectTitle")}</EmptyTitle>
              <EmptyDescription>
                {t("library.startProjectDescription")}
              </EmptyDescription>
            </EmptyHeader>
            {canWrite ? (
              <EmptyContent>
                {creatingFolder ? (
                  <form onSubmit={submitNewFolder} className="w-full max-w-64">
                    <Input
                      autoFocus
                      value={newFolderName}
                      onChange={(event) => setNewFolderName(event.target.value)}
                      onBlur={() => {
                        if (!newFolderName.trim()) setCreatingFolder(false)
                      }}
                      placeholder={t("library.folderNamePlaceholder")}
                    />
                  </form>
                ) : (
                  <Button type="button" onClick={() => setCreatingFolder(true)}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                    {t("library.newFolder")}
                  </Button>
                )}
              </EmptyContent>
            ) : null}
          </Empty>
        </div>
      )
    }

    return (
      <div className="flex h-full items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Layers01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>{t("library.noFolderOpenTitle")}</EmptyTitle>
            <EmptyDescription>{t("library.noFolderOpen")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div
      className="flex h-full flex-col gap-3 overflow-hidden p-4"
      // Plain HTML5 drag events rather than dnd-kit: the drag starts in the
      // Media tab, a different component tree with no shared dnd context,
      // and pointer-based dnd-kit can't span the two. The two systems don't
      // collide — dnd-kit listens to pointer events, this to drag events.
      onDragOver={(event) => {
        if (onDropMedia) event.preventDefault()
      }}
      onDrop={(event) => {
        if (!onDropMedia) return
        event.preventDefault()
        onDropMedia()
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h1 className="truncate text-lg font-bold">{folder.name}</h1>
        <OverflowActions
          primaryActions={[]}
          overflowActions={bulkActions}
          expanded={actionsExpanded}
          onExpandedChange={setActionsExpanded}
          onAction={runBulkAction}
          collapseOnAction={false}
          size="sm"
          openLabel={t("library.showExtraActions")}
          closeLabel={t("library.hideExtraActions")}
        />
      </div>

      {folder.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("library.emptyFolder")}
        </p>
      ) : (
        <div className="@container overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={folder.items.map((item) => item.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @3xl:grid-cols-3 @4xl:grid-cols-4 @5xl:grid-cols-5">
                {folder.items.map((item) => (
                  <SlideCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItemIds.has(item.id)}
                    templates={templates}
                    onSelect={onSelectItem}
                    onPresent={onPresentItem}
                    onDelete={(itemId) => onRemove([itemId])}
                    onRename={onRenameItem}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <TemplatePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onApply={(templateId) =>
          onApplyTemplate([...selectedItemIds], templateId)
        }
      />
    </div>
  )
}
