import { NotesPickerPanel } from "@/modules/notes"
import type { NoteSlidePayload } from "@/modules/notes"
import type { BiblePassageItemData, Project, ProjectSaveResult } from "@/modules/library/interfaces"
import type { BottomTab } from "@/modules/library/actions/use-console-store"
import { useConsoleStore } from "@/modules/library/actions/use-console-store"
import { BiblePickerPanel } from "@/modules/library/components/bible-picker-panel"
import { ProjectList } from "@/modules/library/components/project-list"
import { MediaPickerPanel } from "@/modules/media"
import type { MediaSlideData } from "@/modules/media"
import type { SlideTemplate } from "@/modules/presentation"
import { SongsPickerPanel } from "@/modules/songs"
import type { SongSlidePayload } from "@/modules/songs"
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
  onSaveProject: (projectId: string) => Promise<ProjectSaveResult>
  onSaveProjectAs: (projectId: string) => Promise<ProjectSaveResult>
  onOpenProjectFile: (contents: string, filePath?: string) => Promise<unknown>
  openFolderId: string | null
  onAddVerse: (item: BiblePassageItemData, templateId: string | undefined) => void
  onAddVerses: (items: BiblePassageItemData[], templateId: string | undefined) => void
  /** Appends media slides to the open folder, creating one at the root when none is open. */
  onAddMedia: (slides: MediaSlideData[], templateId: string | undefined) => void
  /** Creates a folder named `name` holding `slides`, in one write — a deck's pages, or a multi-file selection. */
  onAddMediaFolder: (name: string, slides: MediaSlideData[], templateId: string | undefined) => void
  /** Sends a media slide straight to the output — this module owns `setLiveSlide`, so the panel asks rather than reaching for it. */
  onPresentMedia: (slide: MediaSlideData, templateId: string | undefined) => void
  /** Adds a whole song as its own new folder of slides, named after the song. */
  onAddSong: (title: string, slides: SongSlidePayload[], templateId: string | undefined) => void
  /** Appends one of a song's sections to the currently open folder. */
  onAddSongSection: (slide: SongSlidePayload, templateId: string | undefined) => void
  onPresentSong: (text: string, template: SlideTemplate) => void
  /** Appends one note to the open folder, creating one at the root when none is open. */
  onAddNote: (slide: NoteSlidePayload, templateId: string | undefined) => void
  /** Creates a folder named `name` holding every note written this session, in one write. */
  onAddNotesAsFolder: (
    name: string,
    slides: NoteSlidePayload[],
    templateId: string | undefined
  ) => void
  onPresentNote: (
    text: string,
    heading: string | undefined,
    template: SlideTemplate
  ) => void
}

/**
 * The console shell's bottom panel: a persistent drawer, independent of the
 * sidebar (which always shows the active project's folders regardless of
 * what's selected here). Its own tab strip switches between content-source
 * browsers — Projects (create/rename/switch/delete), Bible, Songs,
 * Notes, Media, Templates — using one shared animated-indicator
 * `Tabs` primitive.
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
  onSaveProject,
  onSaveProjectAs,
  onOpenProjectFile,
  openFolderId,
  onAddVerse,
  onAddVerses,
  onAddSong,
  onAddSongSection,
  onPresentSong,
  onAddMedia,
  onAddMediaFolder,
  onPresentMedia,
  onAddNote,
  onAddNotesAsFolder,
  onPresentNote,
}: BottomDrawerProps) {
  const { t } = useTranslation()
  const templatesState = useTemplates()

  // Read here rather than threaded down from `ConsoleView` — this is the
  // same module's own shell store, and the Songs tab's browsing state lives
  // in it so switching tabs and back doesn't reset the query or selection.
  const songQuery = useConsoleStore((state) => state.songQuery)
  const selectedSongId = useConsoleStore((state) => state.selectedSongId)
  const selectedSongSectionIndex = useConsoleStore((state) => state.selectedSongSectionIndex)
  const setSongQuery = useConsoleStore((state) => state.setSongQuery)
  const selectSong = useConsoleStore((state) => state.selectSong)
  const selectSongSection = useConsoleStore((state) => state.selectSongSection)
  const noteDrafts = useConsoleStore((state) => state.noteDrafts)
  const selectedNoteId = useConsoleStore((state) => state.selectedNoteId)
  const createNote = useConsoleStore((state) => state.createNote)
  const updateNote = useConsoleStore((state) => state.updateNote)
  const deleteNote = useConsoleStore((state) => state.deleteNote)
  const selectNote = useConsoleStore((state) => state.selectNote)
  const mediaLocation = useConsoleStore((state) => state.mediaLocation)
  const mediaSelectedReferences = useConsoleStore((state) => state.mediaSelectedReferences)
  const mediaLastSelectedReference = useConsoleStore((state) => state.mediaLastSelectedReference)
  const mediaView = useConsoleStore((state) => state.mediaView)
  const setMediaLocation = useConsoleStore((state) => state.setMediaLocation)
  const setMediaSelection = useConsoleStore((state) => state.setMediaSelection)
  const setMediaView = useConsoleStore((state) => state.setMediaView)

  const tabs: TabItem[] = [
    { value: "projects", label: t("nav.projects") },
    { value: "bible", label: t("sidebar.bible") },
    { value: "songs", label: t("sidebar.songs") },
    { value: "notes", label: t("sidebar.notes") },
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
            onSaveProject={onSaveProject}
            onSaveProjectAs={onSaveProjectAs}
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
          <SongsPickerPanel
            hasOpenFolder={openFolderId !== null}
            query={songQuery}
            selectedSongId={selectedSongId}
            selectedSectionIndex={selectedSongSectionIndex}
            onQueryChange={setSongQuery}
            onSelectSong={selectSong}
            onSelectSection={selectSongSection}
            onAddSong={onAddSong}
            onAddSongSection={onAddSongSection}
            onPresentSection={onPresentSong}
          />
        ) : null}

        {activeTab === "notes" ? (
          <NotesPickerPanel
            drafts={noteDrafts}
            selectedId={selectedNoteId}
            onSelect={selectNote}
            onCreateDraft={createNote}
            onUpdateDraft={updateNote}
            onDeleteDraft={deleteNote}
            onAddSlide={onAddNote}
            onAddAsFolder={onAddNotesAsFolder}
            onPresent={onPresentNote}
          />
        ) : null}

        {activeTab === "media" ? (
          <MediaPickerPanel
            hasOpenFolder={openFolderId !== null}
            location={mediaLocation}
            selectedReferences={mediaSelectedReferences}
            lastSelectedReference={mediaLastSelectedReference}
            view={mediaView}
            onLocationChange={setMediaLocation}
            onSelectionChange={setMediaSelection}
            onViewChange={setMediaView}
            onAddMedia={onAddMedia}
            onAddMediaFolder={onAddMediaFolder}
            onPresentMedia={onPresentMedia}
          />
        ) : null}

        {activeTab === "templates" ? <TemplateManager {...templatesState} /> : null}
      </div>
    </div>
  )
}
