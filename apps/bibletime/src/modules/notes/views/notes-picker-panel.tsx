import { useState } from "react"

import { NoteEditorDialog } from "@/modules/notes/components/note-editor-dialog"
import type { NoteEditorValues } from "@/modules/notes/components/note-editor-dialog"
import { NoteList } from "@/modules/notes/components/note-list"
import type { NoteDraft, NoteSlidePayload } from "@/modules/notes/interfaces"
import { noteLabel } from "@/modules/notes/lib/note-label"
import { useTranslation } from "@/modules/core/i18n"
import { SlideFrame } from "@/modules/presentation"
import type { SlideTemplate } from "@/modules/presentation"
import { useTemplates } from "@/modules/templates"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

interface NotesPickerPanelProps {
  drafts: NoteDraft[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreateDraft: (values: NoteEditorValues) => void
  onUpdateDraft: (id: string, values: NoteEditorValues) => void
  onDeleteDraft: (id: string) => void
  /** Appends the selected note to the open folder — or, with nothing open, to a folder created for it. */
  onAddSlide: (slide: NoteSlidePayload, templateId: string | undefined) => void
  /** Adds every draft in the list as one new folder of slides. */
  onAddAsFolder: (
    name: string,
    slides: NoteSlidePayload[],
    templateId: string | undefined
  ) => void
  /** Sends the selected note straight to the output — the library module owns `setLiveSlide`, so this panel asks rather than reaching for it. */
  onPresent: (text: string, heading: string | undefined, template: SlideTemplate) => void
}

const toSlide = (draft: NoteDraft): NoteSlidePayload => {
  const heading = draft.heading?.trim()

  return {
    // Normalized away rather than stored empty, so "no heading" is one
    // representable state instead of two the renderer would have to agree on.
    heading: heading === "" ? undefined : heading,
    text: draft.text,
    label: noteLabel(draft),
  }
}

/**
 * The Notes tab: what's been written this session on the left, the
 * slide it produces on the right, and the three things you can do with it.
 *
 * Shorter than the Songs tab by one column and by a whole storage layer —
 * there is no library to search, because notes aren't kept. The
 * interaction grammar is otherwise the same one the Bible and Songs tabs
 * use: select, preview, then explicitly add or present.
 */
export function NotesPickerPanel({
  drafts,
  selectedId,
  onSelect,
  onCreateDraft,
  onUpdateDraft,
  onDeleteDraft,
  onAddSlide,
  onAddAsFolder,
  onPresent,
}: NotesPickerPanelProps) {
  const { t } = useTranslation()
  const { activeId, activeTemplate, templates } = useTemplates()

  const [editorDraftId, setEditorDraftId] = useState<string | undefined>(undefined)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined)

  // Defaults to the app-wide active template until the user picks one here;
  // picking one here is a one-off choice for this tab and does not change
  // what the Templates tab reports as active.
  const effectiveTemplateId = selectedTemplateId ?? activeId
  const effectiveTemplate =
    templates.find((template) => template.id === effectiveTemplateId)?.template ?? activeTemplate

  const selectedDraft = drafts.find((draft) => draft.id === selectedId)
  const editorDraft = drafts.find((draft) => draft.id === editorDraftId)

  const handleSave = (values: NoteEditorValues) => {
    if (editorDraft) {
      onUpdateDraft(editorDraft.id, values)
    } else {
      onCreateDraft(values)
    }
    setEditorOpen(false)
    setEditorDraftId(undefined)
  }

  const openEditor = (draftId?: string) => {
    setEditorDraftId(draftId)
    setEditorOpen(true)
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[minmax(240px,1fr)_minmax(260px,340px)]">
      <NoteList
        drafts={drafts}
        selectedId={selectedId}
        onSelect={onSelect}
        onNew={() => openEditor()}
        onEdit={(id) => {
          onSelect(id)
          openEditor(id)
        }}
        onDelete={onDeleteDraft}
      />

      <div className="flex min-h-0 flex-col gap-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase">
          {t("notes.preview")}
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
          <SlideFrame
            template={effectiveTemplate}
            text={selectedDraft?.text}
            reference={selectedDraft ? toSlide(selectedDraft).heading : undefined}
            emptyMessage={t("notes.selectHint")}
            frameClassName="h-full w-full"
          />
        </div>

        <Button
          type="button"
          disabled={!selectedDraft}
          onClick={() => {
            if (!selectedDraft) return
            onAddSlide(toSlide(selectedDraft), effectiveTemplateId)
          }}
        >
          {t("notes.addSlide")}
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={drafts.length === 0}
            onClick={() => {
              if (drafts.length === 0) return
              const slides = drafts.map(toSlide)
              // A one-draft folder takes that note's own name; any
              // more and there's no single note to name it after.
              const name =
                slides.length === 1 && slides[0]
                  ? slides[0].label
                  : t("notes.defaultFolderName")
              onAddAsFolder(name, slides, effectiveTemplateId)
            }}
          >
            {drafts.length > 1
              ? t("notes.addAsFolderCount", { count: drafts.length })
              : t("notes.addAsFolder")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={!selectedDraft}
            onClick={() => {
              if (!selectedDraft) return
              onPresent(selectedDraft.text, toSlide(selectedDraft).heading, effectiveTemplate)
            }}
          >
            {t("notes.present")}
          </Button>
        </div>
      </div>

      <NoteEditorDialog
        open={editorOpen}
        draft={editorDraft}
        template={effectiveTemplate}
        onSave={handleSave}
        onClose={() => {
          setEditorOpen(false)
          setEditorDraftId(undefined)
        }}
      />
    </div>
  )
}
