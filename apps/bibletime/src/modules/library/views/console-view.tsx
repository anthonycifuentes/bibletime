import { useState } from "react"

import { useConsoleStore } from "@/modules/library/actions/use-console-store"
import { useProjectAutosave } from "@/modules/library/actions/use-project-autosave"
import { useLibrary } from "@/modules/library/actions/use-library"
import { useProjects } from "@/modules/library/actions/use-projects"
import { BottomDrawer } from "@/modules/library/components/bottom-drawer"
import { FolderTree } from "@/modules/library/components/folder-tree"
import { PreviewPanel } from "@/modules/library/components/preview-panel"
import { ProjectLauncher } from "@/modules/library/components/project-launcher"
import { SlideConsole } from "@/modules/library/components/slide-console"
import { SlideStyleDialog } from "@/modules/library/components/slide-style-dialog"
import { getDescendantIds, getFolderDepth } from "@/modules/library/lib/build-folder-tree"
import { resolveFolderItemContent } from "@/modules/library/lib/resolve-folder-item-content"
import type { MediaSlideData } from "@/modules/media"
import { setLiveSlide } from "@/modules/library/services"
import { readMediaDragPayload } from "@/modules/media"
import { useTemplates } from "@/modules/templates"
import { HeaderBar } from "@/modules/core/layout"
import { useTranslation } from "@/modules/core/i18n"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"

/** A folder is nestable up to this many levels below root (0 = root, so 0/1/2 is 3 levels total) — mirrors `FolderTree`'s own cap. */
const MAX_FOLDER_DEPTH = 2

/**
 * The app's one console shell: a persistent header, a sidebar that always
 * shows the Library (the currently open folder's tree) no matter what else
 * is going on, an always-open-folder-driven slide console, a persistent
 * preview panel, and a bottom drawer whose own tab strip (Library, Bible,
 * Songs, Notes, Media, Templates) switches a content-source browser
 * independently of the sidebar. `useLibrary`/`useTemplates` are each called once here and
 * passed down, so every pane reads and mutates the same in-memory data.
 */
export function ConsoleView() {
  const { t } = useTranslation()
  const projects = useProjects()
  const library = useLibrary(projects.activeId ?? null)

  // Mirrors the active project onto its bound file as it changes. Mounted
  // here because this is where both halves of what gets written — the
  // project and its folders — are already held.
  const { saveState, flushPendingSave } = useProjectAutosave({
    project: projects.activeProject,
    folders: library.folders,
    saveProject: projects.saveProject,
  })
  const templatesState = useTemplates()
  const bottomTab = useConsoleStore((state) => state.bottomTab)
  const setBottomTab = useConsoleStore((state) => state.setBottomTab)

  const openFolderId = useConsoleStore((state) => state.openFolderId)
  const selectedItemIds = useConsoleStore((state) => state.selectedItemIds)
  const lastSelectedItemId = useConsoleStore(
    (state) => state.lastSelectedItemId
  )
  const openFolder = useConsoleStore((state) => state.openFolder)
  const selectItem = useConsoleStore((state) => state.selectItem)
  const selectAll = useConsoleStore((state) => state.selectAll)
  const clearSelection = useConsoleStore((state) => state.clearSelection)

  const openedFolder = library.folders.find(
    (folder) => folder.id === openFolderId
  )
  const previewItem = openedFolder?.items.find(
    (item) => item.id === lastSelectedItemId
  )

  /**
   * Which slides the per-slide style editor is open for, and which one's
   * current style it starts from. Held here rather than inside `SlideConsole`
   * (where the template picker lives) because all three entry points funnel
   * into it — including the sidebar tree's, which is outside the console and
   * can target a slide in a folder that isn't the open one, so the folder id
   * travels with the request instead of being read off the open folder.
   */
  const [styleEditor, setStyleEditor] = useState<{
    folderId: string
    itemIds: string[]
    seedItemId: string
  } | null>(null)

  const styleEditorFolder = library.folders.find(
    (folder) => folder.id === styleEditor?.folderId
  )
  const styleEditorItem = styleEditorFolder?.items.find(
    (item) => item.id === styleEditor?.seedItemId
  )

  const openStyleEditor = (
    folderId: string,
    itemIds: string[],
    seedItemId: string | undefined
  ) => {
    // The bulk action supplies no seed, so it falls back to the last-selected
    // slide — but only when that slide is actually one of the targets.
    // `selectItem` stamps `lastSelectedItemId` even when an additive click
    // *deselects* a slide, so it can point outside the selection, and seeding
    // the preview from a slide the save won't touch would just misinform.
    const preferred =
      seedItemId ??
      (lastSelectedItemId && itemIds.includes(lastSelectedItemId)
        ? lastSelectedItemId
        : undefined)
    const seed = preferred ?? itemIds.at(-1)
    if (!seed) return
    setStyleEditor({ folderId, itemIds, seedItemId: seed })
  }

  /** Resolves a slide from whichever folder it's actually in (not necessarily the open one — a sidebar-tree slide's folder may not be) and sends it to the presentation output. */
  const presentFolderItem = (folderId: string, itemId: string) => {
    const targetFolder = library.folders.find(
      (candidate) => candidate.id === folderId
    )
    const item = targetFolder?.items.find(
      (folderItem) => folderItem.id === itemId
    )
    if (!item) return

    const content = resolveFolderItemContent(item, templatesState.templates)
    setLiveSlide({
      text: content.text,
      reference: content.reference,
      versionLabel: content.versionLabel,
      template: content.template,
    })
    window.open("/present", "bibletime-present")
  }

  /** Selects a slide card (marks it "ready to present" in the preview panel) and immediately sends it to the presentation output — the console grid's double-click shortcut. */
  const onPresentItem = (itemId: string) => {
    selectItem(itemId, { additive: false })
    if (openFolderId) presentFolderItem(openFolderId, itemId)
  }

  /** Marks a sidebar-tree slide "ready to present" — opens its folder (so the console/preview panel reflect it) and selects it, without presenting. */
  const onPrepareTreeItem = (itemId: string, folderId: string) => {
    openFolder(folderId)
    selectItem(itemId, { additive: false })
  }

  /** Opens the style editor for a sidebar-tree slide — its folder may not be the open one, so it's opened (and the slide selected) first, exactly as `onPrepareTreeItem` does. */
  const onEditTreeItemStyle = (itemId: string, folderId: string) => {
    openFolder(folderId)
    selectItem(itemId, { additive: false })
    openStyleEditor(folderId, [itemId], itemId)
  }

  /** Same as `onPrepareTreeItem`, but immediately presents too — the sidebar tree's double-click shortcut. */
  const onPresentTreeItem = (itemId: string, folderId: string) => {
    openFolder(folderId)
    selectItem(itemId, { additive: false })
    presentFolderItem(folderId, itemId)
  }

  /**
   * Appends media slides to a folder, creating one at the root when there
   * is none — shared by the Media tab's Add action and by dropping files
   * onto the slide console or the folder tree.
   */
  const addMediaSlides = (
    slides: MediaSlideData[],
    templateId: string | undefined,
    targetFolderId: string | null
  ) => {
    if (slides.length === 0) return
    const items = slides.map((data) => ({ type: "media" as const, templateId, data }))

    if (targetFolderId) {
      void library.addItemsToFolder(targetFolderId, items)
      return
    }

    void (async () => {
      const folder = await library.createFolder(t("library.newFolder"), null, "start", items)
      if (folder) openFolder(folder.id)
    })()
  }

  /** Accepts a drag from the Media tab's grid onto a folder (or the open one). */
  const onDropMediaOnFolder = (folderId: string | null) => {
    const slides = readMediaDragPayload()
    addMediaSlides(slides, templatesState.activeId, folderId)
  }

  /**
   * Where a generated folder (a song's, a deck's, a media selection's) gets
   * created: under the open folder when there is one, at the root when
   * there isn't — and as a *sibling* of the open folder when nesting inside
   * it would exceed the tree's 3-level cap, so content is never rejected
   * for being added while a deep folder is open.
   */
  const generatedFolderParentId = (): string | null => {
    if (!openFolderId) return null
    return getFolderDepth(library.folders, openFolderId) < MAX_FOLDER_DEPTH
      ? openFolderId
      : (openedFolder?.parentId ?? null)
  }

  if (!projects.isLoading && projects.projects.length === 0) {
    return (
      <div className="flex h-svh flex-col">
        <HeaderBar />
        <div className="flex flex-1 items-center justify-center p-6">
          <ProjectLauncher
            projects={projects.projects}
            canWrite={projects.canWrite}
            onCreateProject={(name) => void projects.create(name)}
            onSwitchProject={projects.setActive}
            onOpenProjectFile={projects.openProjectFile}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-svh flex-col">
      <HeaderBar />

      <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
        <ResizablePanel minSize="30%">
          <div className="flex h-full min-h-0">
            <aside className="w-56 shrink-0 overflow-y-auto border-r border-border p-4">
              <FolderTree
                folders={library.folders}
                openFolderId={openFolderId}
                canWrite={library.canWrite}
                onOpenFolder={openFolder}
                onCreateFolder={(name, parentId) =>
                  void library.createFolder(name, parentId)
                }
                onRenameFolder={(folderId, name) =>
                  void library.renameFolder(folderId, name)
                }
                onDeleteFolder={(folderId) => {
                  const removedIds = new Set([
                    folderId,
                    ...getDescendantIds(library.folders, folderId),
                  ])
                  if (openFolderId && removedIds.has(openFolderId))
                    openFolder(null)
                  void library.deleteFolder(folderId)
                }}
                onApplyFolderTree={(tree) => void library.applyFolderTree(tree)}
                onPrepareItem={onPrepareTreeItem}
                onPresentItem={onPresentTreeItem}
                onDeleteItem={(itemId, folderId) =>
                  void library.removeFolderItems(folderId, [itemId])
                }
                onEditItemStyle={onEditTreeItemStyle}
                onDropMediaOnFolder={onDropMediaOnFolder}
                activeProjectName={
                  projects.projects.find(
                    (project) => project.id === projects.activeId
                  )?.name
                }
              />
            </aside>

            <main className="min-w-0 flex-1 overflow-hidden">
              <SlideConsole
                folder={openedFolder}
                hasFolders={library.folders.length > 0}
                canWrite={library.canWrite}
                onCreateFolder={(name) => void library.createFolder(name)}
                templates={templatesState.templates}
                selectedItemIds={selectedItemIds}
                onSelectItem={(itemId, additive) =>
                  selectItem(itemId, { additive })
                }
                onPresentItem={onPresentItem}
                onSelectAll={selectAll}
                onClearSelection={clearSelection}
                onReorder={(itemIds) => {
                  if (openFolderId)
                    void library.reorderFolderItems(openFolderId, itemIds)
                }}
                onRemove={(itemIds) => {
                  if (openFolderId)
                    void library.removeFolderItems(openFolderId, itemIds)
                }}
                onRenameItem={(itemId, label) => {
                  if (openFolderId)
                    void library.renameFolderItem(openFolderId, itemId, label)
                }}
                onDropMedia={() => onDropMediaOnFolder(openFolderId)}
                onApplyTemplate={(itemIds, templateId) => {
                  if (openFolderId)
                    void library.applyTemplateToItems(
                      openFolderId,
                      itemIds,
                      templateId
                    )
                }}
                onEditStyle={(itemIds, seedItemId) => {
                  if (openFolderId)
                    openStyleEditor(openFolderId, itemIds, seedItemId)
                }}
              />
            </main>

            <aside className="w-96 shrink-0 overflow-y-auto border-l border-border">
              <PreviewPanel
                item={previewItem}
                templates={templatesState.templates}
              />
            </aside>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="420px" minSize="42px" maxSize="100%">
          <BottomDrawer
            activeTab={bottomTab}
            onTabChange={setBottomTab}
            projects={projects.projects}
            activeProjectId={projects.activeId}
            canWriteProjects={projects.canWrite}
            onSwitchProject={projects.setActive}
            onCreateProject={(name) => void projects.create(name)}
            onRenameProject={(projectId, name) =>
              void projects.rename(projectId, name)
            }
            onDeleteProject={(projectId) => {
              if (projectId === projects.activeId && openFolderId)
                openFolder(null)
              void (async () => {
                await library.deleteFoldersInProject(projectId)
                await projects.remove(projectId)
              })()
            }}
            // Flushes any queued autosave first, so an explicit Save never
            // leaves a debounced write pending behind it.
            onSaveProject={async (projectId) => {
              await flushPendingSave()
              return projects.saveProject(projectId)
            }}
            onSaveProjectAs={projects.saveProjectAs}
            projectSaveState={saveState}
            onOpenProjectFile={projects.openProjectFile}
            openFolderId={openFolderId}
            onAddVerse={(data, templateId) => {
              if (openFolderId) {
                void library.addItemToFolder(openFolderId, {
                  type: "bible-passage",
                  templateId,
                  data,
                })
                return
              }

              // No folder open: create one at the start of the root list,
              // with the converted verse as its first item in the same
              // write (see `createFolder`'s `initialItems`), so the item
              // always has a folder to live in.
              void (async () => {
                const folder = await library.createFolder(
                  t("library.newFolder"),
                  null,
                  "start",
                  [{ type: "bible-passage", templateId, data }]
                )
                if (folder) openFolder(folder.id)
              })()
            }}
            onAddVerses={(items, templateId) => {
              if (openFolderId)
                void library.addItemsToFolder(
                  openFolderId,
                  items.map((data) => ({
                    type: "bible-passage",
                    templateId,
                    data,
                  }))
                )
            }}
            onAddSong={(title, slides, templateId) => {
              // A song becomes a folder: the folder and every one of its
              // slides land in a single write (see `createFolder`'s
              // `initialItems`), then it's opened so the user immediately
              // sees the slides they just created.
              void (async () => {
                const folder = await library.createFolder(
                  title,
                  generatedFolderParentId(),
                  "end",
                  slides.map((data) => ({ type: "song", templateId, data }))
                )
                if (folder) openFolder(folder.id)
              })()
            }}
            onAddSongSection={(slide, templateId) => {
              if (openFolderId)
                void library.addItemToFolder(openFolderId, {
                  type: "song",
                  templateId,
                  data: slide,
                })
            }}
            onPresentSong={(text, template) => {
              // No `reference` — a song slide projects its lyrics alone.
              setLiveSlide({ text, template })
              window.open("/present", "bibletime-present")
            }}
            onAddMedia={(slides, templateId) => addMediaSlides(slides, templateId, openFolderId)}
            onAddMediaFolder={(name, slides, templateId) => {
              // A deck (or a multi-file selection) becomes a folder: the
              // folder and every slide land in a single write, then it's
              // opened so the user sees the slides they just created.
              void (async () => {
                const folder = await library.createFolder(
                  name,
                  generatedFolderParentId(),
                  "end",
                  slides.map((data) => ({ type: "media", templateId, data }))
                )
                if (folder) openFolder(folder.id)
              })()
            }}
            onPresentMedia={(slide, templateId) => {
              const template =
                templatesState.templates.find((saved) => saved.id === templateId)?.template ??
                templatesState.activeTemplate
              setLiveSlide({ media: slide, template })
              window.open("/present", "bibletime-present")
            }}
            onAddNote={(data, templateId) => {
              if (openFolderId) {
                void library.addItemToFolder(openFolderId, {
                  type: "note",
                  templateId,
                  data,
                })
                return
              }

              // Same fallback a converted verse takes: with nothing open,
              // create a folder at the start of the root list holding this
              // slide, so the note always has somewhere to live.
              void (async () => {
                const folder = await library.createFolder(t("library.newFolder"), null, "start", [
                  { type: "note", templateId, data },
                ])
                if (folder) openFolder(folder.id)
              })()
            }}
            onAddNotesAsFolder={(name, slides, templateId) => {
              // The whole session's notes become one folder in a
              // single write, then it's opened so the user sees them.
              void (async () => {
                const folder = await library.createFolder(
                  name,
                  generatedFolderParentId(),
                  "end",
                  slides.map((data) => ({ type: "note", templateId, data }))
                )
                if (folder) openFolder(folder.id)
              })()
            }}
            onPresentNote={(text, heading, template) => {
              // Unlike a song, an note keeps its heading on the
              // projected slide — it's the line that says what this is.
              setLiveSlide({ text, reference: heading, template })
              window.open("/present", "bibletime-present")
            }}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {styleEditor && styleEditorItem ? (
        <SlideStyleDialog
          open
          onOpenChange={(open) => {
            if (!open) setStyleEditor(null)
          }}
          item={styleEditorItem}
          targetCount={styleEditor.itemIds.length}
          templates={templatesState.templates}
          canUseVideoBackground={templatesState.supportsVideoBackground}
          onSave={(override) =>
            void library.applyStyleOverrideToItems(
              styleEditor.folderId,
              styleEditor.itemIds,
              override
            )
          }
        />
      ) : null}
    </div>
  )
}
