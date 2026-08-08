import { useState } from "react"

import { useTranslation } from "@/modules/core/i18n"
import { SlideFrame } from "@/modules/presentation"
import type { SlideTemplate } from "@/modules/presentation"
import { useSongs } from "@/modules/songs/actions/use-songs"
import { SongEditorDialog } from "@/modules/songs/components/song-editor-dialog"
import type { SongEditorValues } from "@/modules/songs/components/song-editor-dialog"
import { SongList } from "@/modules/songs/components/song-list"
import { SongSectionList } from "@/modules/songs/components/song-section-list"
import { SongWebSearchDialog } from "@/modules/songs/components/song-web-search-dialog"
import type { Song, SongSearchResult, SongSection } from "@/modules/songs/interfaces"
import { parseLyrics } from "@/modules/songs/lib/parse-lyrics"
import type { SectionLabeler } from "@/modules/songs/lib/parse-lyrics"
import { useTemplates } from "@/modules/templates"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

/** One section of a song, resolved into what a Library slide needs. Mirrors how the Bible tab hands a verse over. */
export interface SongSlidePayload {
  songId: string
  title: string
  sectionLabel: string
  text: string
  sectionIndex: number
}

interface SongsPickerPanelProps {
  /** Whether a Library folder is currently open — "Add slide" needs one; "Add to library" creates its own folder and doesn't. */
  hasOpenFolder: boolean
  query: string
  selectedSongId: string | null
  selectedSectionIndex: number | null
  onQueryChange: (query: string) => void
  onSelectSong: (songId: string | null) => void
  onSelectSection: (index: number | null) => void
  /** Adds every section of a song as one new Library folder named after it. */
  onAddSong: (title: string, slides: SongSlidePayload[], templateId: string | undefined) => void
  /** Appends a single section to the currently open folder. */
  onAddSongSection: (slide: SongSlidePayload, templateId: string | undefined) => void
  /** Sends a section straight to the presentation output — the library module owns `setLiveSlide`, so this panel asks rather than reaching for it. */
  onPresentSection: (text: string, template: SlideTemplate) => void
}

const sectionText = (section: SongSection): string => section.lines.join("\n")

/**
 * The Songs tab: three columns — the repertoire with a search box, the
 * selected song's sections, and a live preview with the add/present actions.
 * Modeled on `BiblePickerPanel`'s browse → select → preview → explicitly-add
 * grammar, minus the split-count control: a song's sections already define
 * its slides, and the way to change that split is to edit the song's blank
 * lines, not to re-split here.
 */
export function SongsPickerPanel({
  hasOpenFolder,
  query,
  selectedSongId,
  selectedSectionIndex,
  onQueryChange,
  onSelectSong,
  onSelectSection,
  onAddSong,
  onAddSongSection,
  onPresentSection,
}: SongsPickerPanelProps) {
  const { t } = useTranslation()
  const { songs, canWrite, create, update, remove } = useSongs()
  const { activeId, activeTemplate, templates } = useTemplates()

  const [editorSong, setEditorSong] = useState<Song | undefined>(undefined)
  const [editorOpen, setEditorOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Song | undefined>(undefined)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined)

  // Defaults to the app-wide active template until the user picks a different
  // one here — picking one here is a one-off choice for this song, it does
  // not change what the Templates tab reports as active.
  const effectiveTemplateId = selectedTemplateId ?? activeId
  const effectiveTemplate =
    templates.find((template) => template.id === effectiveTemplateId)?.template ?? activeTemplate

  /** The labels `parseLyrics` stamps onto inferred sections, in the language the user is writing in. */
  const labeler: SectionLabeler = {
    verse: (number) => t("songs.verseLabel", { number }),
    chorus: t("songs.chorusLabel"),
  }

  const selectedSong = songs.find((song) => song.id === selectedSongId)
  const selectedSection =
    selectedSectionIndex === null ? undefined : selectedSong?.sections[selectedSectionIndex]

  const toSlide = (song: Song, section: SongSection, index: number): SongSlidePayload => ({
    songId: song.id,
    title: song.title,
    sectionLabel: section.label,
    text: sectionText(section),
    sectionIndex: index,
  })

  const handleSave = (values: SongEditorValues) => {
    const sections = parseLyrics(values.lyrics, labeler)
    if (sections.length === 0) return

    void (async () => {
      if (editorSong) {
        // `update` patches, so `source` (and anything else not listed here)
        // survives — an imported song keeps its provenance through edits.
        await update(editorSong.id, {
          title: values.title,
          author: values.author || undefined,
          sections,
        })
      } else {
        const created = await create({
          title: values.title,
          author: values.author || undefined,
          sections,
        })
        onSelectSong(created.id)
      }
      setEditorOpen(false)
      setEditorSong(undefined)
    })()
  }

  /** Creates the imported song, then hands it straight to the editor so the user can fix formatting before using it. */
  const handleImport = (result: SongSearchResult) => {
    const lyrics = result.plainLyrics?.trim() ?? ""
    if (lyrics === "") return

    void (async () => {
      const created = await create({
        title: result.title,
        author: result.artist,
        source: { provider: "lrclib", id: result.id },
        sections: parseLyrics(lyrics, labeler),
      })
      setSearchOpen(false)
      onSelectSong(created.id)
      setEditorSong(created)
      setEditorOpen(true)
    })()
  }

  /**
   * Renames one section's label on the song itself, so every future add
   * carries it. Slides already added to a folder keep the label they were
   * created with — same rule as their text (see `SongItemData`).
   */
  const handleRenameSection = (index: number, label: string) => {
    if (!selectedSong) return
    const trimmed = label.trim()
    if (trimmed === "" || trimmed === selectedSong.sections[index]?.label) return

    void update(selectedSong.id, {
      sections: selectedSong.sections.map((section, position) =>
        position === index ? { ...section, label: trimmed } : section
      ),
    })
  }

  const handleDelete = () => {
    if (!pendingDelete) return
    void (async () => {
      await remove(pendingDelete.id)
      if (selectedSongId === pendingDelete.id) onSelectSong(null)
      setPendingDelete(undefined)
    })()
  }

  const presentSection = (index: number) => {
    const section = selectedSong?.sections[index]
    if (!section) return
    onPresentSection(sectionText(section), effectiveTemplate)
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[minmax(200px,260px)_1fr_minmax(240px,300px)]">
      <SongList
        songs={songs}
        selectedSongId={selectedSongId}
        query={query}
        canWrite={canWrite}
        onQueryChange={onQueryChange}
        onSelectSong={onSelectSong}
        onNewSong={() => {
          setEditorSong(undefined)
          setEditorOpen(true)
        }}
        onSearchWeb={() => setSearchOpen(true)}
      />

      <SongSectionList
        song={selectedSong}
        selectedIndex={selectedSectionIndex}
        canWrite={canWrite}
        onSelectSection={onSelectSection}
        onPresentSection={(index) => {
          onSelectSection(index)
          presentSection(index)
        }}
        onRenameSection={handleRenameSection}
        onEdit={() => {
          setEditorSong(selectedSong)
          setEditorOpen(true)
        }}
        onDelete={() => setPendingDelete(selectedSong)}
      />

      <div className="flex min-h-0 flex-col gap-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase">
          {t("songs.preview")}
        </h2>

        {templates.length > 0 ? (
          <Select
            items={templates.map((template) => ({ value: template.id, label: template.name }))}
            value={effectiveTemplateId}
            onValueChange={(value) => setSelectedTemplateId(value as string)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
          {/* No `reference` — a song slide projects its lyrics and nothing
              else; the section label is console chrome, not slide content. */}
          <SlideFrame
            template={effectiveTemplate}
            text={selectedSection ? sectionText(selectedSection) : undefined}
            emptyMessage={t("songs.selectSectionHint")}
            frameClassName="h-full w-full"
          />
        </div>

        {!hasOpenFolder ? (
          <p className="text-xs text-muted-foreground">{t("songs.openFolderHint")}</p>
        ) : null}

        <Button
          type="button"
          disabled={!selectedSong || selectedSong.sections.length === 0}
          onClick={() => {
            if (!selectedSong) return
            onAddSong(
              selectedSong.title,
              selectedSong.sections.map((section, index) => toSlide(selectedSong, section, index)),
              effectiveTemplateId
            )
          }}
        >
          {t("songs.addToLibrary")}
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={!hasOpenFolder || !selectedSection}
            onClick={() => {
              if (!selectedSong || !selectedSection || selectedSectionIndex === null) return
              onAddSongSection(
                toSlide(selectedSong, selectedSection, selectedSectionIndex),
                effectiveTemplateId
              )
            }}
          >
            {t("songs.addSlide")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={!selectedSection}
            onClick={() => {
              if (selectedSectionIndex !== null) presentSection(selectedSectionIndex)
            }}
          >
            {t("songs.present")}
          </Button>
        </div>
      </div>

      <SongEditorDialog
        open={editorOpen}
        song={editorSong}
        onSave={handleSave}
        onClose={() => {
          setEditorOpen(false)
          setEditorSong(undefined)
        }}
      />

      <SongWebSearchDialog
        open={searchOpen}
        onImport={handleImport}
        onClose={() => setSearchOpen(false)}
      />

      <Dialog
        open={pendingDelete !== undefined}
        onOpenChange={(open) => (open ? undefined : setPendingDelete(undefined))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("songs.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("songs.deleteConfirmDescription", { name: pendingDelete?.title ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(undefined)}>
              {t("songs.cancel")}
            </Button>
            <Button type="button" onClick={handleDelete}>
              {t("songs.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
