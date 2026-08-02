import type { BiblePassageItemData, Project } from "@/modules/library/interfaces"
import type { BottomTab } from "@/modules/library/actions/use-console-store"
import { BiblePickerPanel } from "@/modules/library/components/bible-picker-panel"
import { PlaceholderPicker } from "@/modules/library/components/placeholder-picker"
import { ProjectList } from "@/modules/library/components/project-list"
import { TemplateManager, useTemplates } from "@/modules/templates"
import { Tabs } from "@workspace/ui/components/tabs"
import type { TabItem } from "@workspace/ui/components/tabs"
import { useTranslation } from "@/modules/core/i18n"

export type { BottomTab }

interface BottomDrawerProps {
  activeTab: BottomTab
  onTabChange: (tab: BottomTab) => void
  projects: Project[]
  activeProjectId: string | null
  canWriteProjects: boolean
  onSwitchProject: (projectId: string) => void
  onCreateProject: (name: string) => void
  onRenameProject: (projectId: string, name: string) => void
  onDeleteProject: (projectId: string) => void
  onExportProject: (projectId: string) => void
  onOpenProjectFile: (contents: string) => Promise<unknown>
  openFolderId: string | null
  onAddVerse: (item: BiblePassageItemData, templateId: string | undefined) => void
  onAddVerses: (items: BiblePassageItemData[], templateId: string | undefined) => void
}

/**
 * The console shell's bottom panel: a persistent drawer, independent of the
 * sidebar (which always shows the active project's folders regardless of
 * what's selected here). Its own tab strip switches between content-source
 * browsers — Projects (create/rename/switch/delete), Bible, Songs, Media,
 * Templates — using one shared animated-indicator `Tabs` primitive.
 */
export function BottomDrawer({
  activeTab,
  onTabChange,
  projects,
  activeProjectId,
  canWriteProjects,
  onSwitchProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onExportProject,
  onOpenProjectFile,
  openFolderId,
  onAddVerse,
  onAddVerses,
}: BottomDrawerProps) {
  const { t } = useTranslation()
  const templatesState = useTemplates()

  const tabs: TabItem[] = [
    { value: "projects", label: t("nav.projects") },
    { value: "bible", label: t("sidebar.bible") },
    { value: "songs", label: t("sidebar.songs") },
    { value: "media", label: t("sidebar.media") },
    { value: "templates", label: t("sidebar.templates") },
  ]

  return (
    <div className="flex h-full flex-col border-t border-border">
      <Tabs
        items={tabs}
        value={activeTab}
        onValueChange={(value) => onTabChange(value as BottomTab)}
        label={t("library.bottomDrawerLabel")}
        className="shrink-0 rounded-none border-x-0 border-t-0"
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {activeTab === "projects" ? (
          <ProjectList
            projects={projects}
            activeProjectId={activeProjectId}
            canWrite={canWriteProjects}
            onSwitchProject={onSwitchProject}
            onCreateProject={onCreateProject}
            onRenameProject={onRenameProject}
            onDeleteProject={onDeleteProject}
            onExportProject={onExportProject}
            onOpenProjectFile={onOpenProjectFile}
          />
        ) : null}

        {activeTab === "bible" ? (
          <BiblePickerPanel
            hasOpenFolder={openFolderId !== null}
            onAddVerse={onAddVerse}
            onAddVerses={onAddVerses}
          />
        ) : null}

        {activeTab === "songs" ? (
          <PlaceholderPicker
            title={t("library.songsPlaceholderTitle")}
            description={t("library.songsPlaceholderDescription")}
          />
        ) : null}

        {activeTab === "media" ? (
          <PlaceholderPicker
            title={t("library.mediaPlaceholderTitle")}
            description={t("library.mediaPlaceholderDescription")}
          />
        ) : null}

        {activeTab === "templates" ? <TemplateManager {...templatesState} /> : null}
      </div>
    </div>
  )
}
