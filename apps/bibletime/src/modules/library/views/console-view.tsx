import { useState } from "react"

import { useConsoleStore } from "@/modules/library/actions/use-console-store"
import { useLibrary } from "@/modules/library/actions/use-library"
import { useProjects } from "@/modules/library/actions/use-projects"
import { BottomDrawer } from "@/modules/library/components/bottom-drawer"
import type { BottomTab } from "@/modules/library/components/bottom-drawer"
import { FolderTree } from "@/modules/library/components/folder-tree"
import { PreviewPanel } from "@/modules/library/components/preview-panel"
import { ProjectLauncher } from "@/modules/library/components/project-launcher"
import { SlideConsole } from "@/modules/library/components/slide-console"
import { useTemplates } from "@/modules/templates"
import { HeaderBar } from "@/modules/core/layout"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"

/**
 * The app's one console shell: a persistent header, a sidebar that always
 * shows the Library (the currently open folder's tree) no matter what else
 * is going on, an always-open-folder-driven slide console, a persistent
 * preview panel, and a bottom drawer whose own tab strip (Library, Bible,
 * Songs, Media, Templates) switches a content-source browser independently
 * of the sidebar. `useLibrary`/`useTemplates` are each called once here and
 * passed down, so every pane reads and mutates the same in-memory data.
 */
export function ConsoleView() {
  const projects = useProjects()
  const library = useLibrary(projects.activeId ?? null)
  const templatesState = useTemplates()
  const [bottomTab, setBottomTab] = useState<BottomTab>("projects")

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
                onCreateFolder={(name) => void library.createFolder(name)}
                onRenameFolder={(folderId, name) =>
                  void library.renameFolder(folderId, name)
                }
                onDeleteFolder={(folderId) => {
                  if (folderId === openFolderId) openFolder(null)
                  void library.deleteFolder(folderId)
                }}
                activeProjectName={
                  projects.projects.find((project) => project.id === projects.activeId)?.name
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
                onApplyTemplate={(itemIds, templateId) => {
                  if (openFolderId)
                    void library.applyTemplateToItems(
                      openFolderId,
                      itemIds,
                      templateId
                    )
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

        <ResizablePanel defaultSize="320px" minSize="160px" maxSize="70%">
          <BottomDrawer
            activeTab={bottomTab}
            onTabChange={setBottomTab}
            projects={projects.projects}
            activeProjectId={projects.activeId}
            canWriteProjects={projects.canWrite}
            onSwitchProject={projects.setActive}
            onCreateProject={(name) => void projects.create(name)}
            onRenameProject={(projectId, name) => void projects.rename(projectId, name)}
            onDeleteProject={(projectId) => {
              if (projectId === projects.activeId && openFolderId) openFolder(null)
              void (async () => {
                await library.deleteFoldersInProject(projectId)
                await projects.remove(projectId)
              })()
            }}
            openFolderId={openFolderId}
            onAddVerse={(data, templateId) => {
              if (openFolderId)
                void library.addItemToFolder(openFolderId, {
                  type: "bible-passage",
                  templateId,
                  data,
                })
            }}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
