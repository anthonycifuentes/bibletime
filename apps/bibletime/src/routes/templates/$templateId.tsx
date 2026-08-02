import { createFileRoute, useBlocker, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import type { SlideTemplate } from "@/modules/presentation"
import { DEFAULT_SLIDE_TEMPLATE, SlidePreview, TemplateEditor } from "@/modules/presentation"
import { useAspectRatio } from "@/modules/core/aspect-ratio"
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
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, Copy01Icon } from "@hugeicons/core-free-icons"
import { useTranslation } from "@/modules/core/i18n"

export const Route = createFileRoute("/templates/$templateId")({
  component: TemplateEditorRoute,
  validateSearch: (search: Record<string, unknown>): { isNew?: boolean } => ({
    isNew: search.isNew === true ? true : undefined,
  }),
})

const isBundled = (id: string): boolean => id.startsWith("bundled-")

/**
 * The dedicated template editor page — where creating (via `/templates/new`
 * redirecting here) and editing an existing template both actually happen.
 * Edits are held as a local draft and only written to storage on explicit
 * Save, unlike the rest of the app (which autosaves) — this page is the one
 * deliberate exception, so it also needs its own unsaved-changes guard.
 */
function TemplateEditorRoute() {
  const { templateId } = Route.useParams()
  const { isNew } = Route.useSearch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { ratio } = useAspectRatio()
  const { templates, isLoading, canWrite, supportsVideoBackground, create, update, remove } = useTemplates()

  const existing = templates.find((item) => item.id === templateId)
  const [draftName, setDraftName] = useState(existing?.name ?? "")
  const [draftTemplate, setDraftTemplate] = useState<SlideTemplate>(existing?.template ?? DEFAULT_SLIDE_TEMPLATE)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  // `/templates/new` creates a real record before this page even renders, purely
  // so there's always something to edit — but until the user actually clicks
  // Save once, nothing here should count as a deliberate save from their point
  // of view: the record should still read as discardable, not "already saved".
  const [hasSavedOnce, setHasSavedOnce] = useState(!isNew)

  // Re-syncs only when navigating to a *different* template (`existing.id`
  // changes) — not on every `existing` object-identity change, since Save
  // itself causes one of those (via `useTemplates`'s refresh) and by then
  // the draft already holds exactly what was just persisted.
  useEffect(() => {
    if (existing) {
      setDraftName(existing.name)
      setDraftTemplate(existing.template)
      setHasSavedOnce(!isNew)
    }
  }, [existing?.id])

  const isDirty = existing
    ? !hasSavedOnce ||
      draftName.trim() !== existing.name ||
      JSON.stringify(draftTemplate) !== JSON.stringify(existing.template)
    : false

  /** Removes the record entirely — used both by "Cancel" (never explicitly saved) and "Delete" (an existing template), which are the same operation with different framing. */
  const removeTemplate = async () => {
    if (!existing) return
    await remove(existing.id)
  }

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: () => isDirty,
    withResolver: true,
  })

  const handleBack = () => void navigate({ to: "/library" })

  const handleDuplicate = async () => {
    if (!existing) return
    const saved = await create(t("templates.copyOf", { name: existing.name }))
    await update(saved.id, { template: existing.template })
    void navigate({ to: "/templates/$templateId", params: { templateId: saved.id }, replace: true })
  }

  const handleSave = () => {
    if (!existing || !isDirty) return
    // Falls back to the last-saved name rather than persisting a blank one.
    void update(existing.id, { name: draftName.trim() || existing.name, template: draftTemplate })
    setHasSavedOnce(true)
    // Drops `?isNew` now that this record is a deliberate save, so a later
    // reload doesn't re-read it as still-discardable. A direct history edit
    // (not `navigate()`) — the router treats this as a no-op since the
    // matched route/params haven't changed, so it never re-serializes the
    // URL on its own; this only needs the address bar to reflect reality
    // for the next reload, not a router-level transition.
    if (isNew && typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", window.location.pathname)
    }
  }

  const handleDeleteButtonClick = () => setDeleteDialogOpen(true)

  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false)
    void (async () => {
      await removeTemplate()
      void navigate({ to: "/library" })
    })()
  }

  /** The blocker's "Discard changes" already resumes whatever navigation was blocked — this only needs to clean up storage, not navigate anywhere itself. */
  const handleDiscardNavigation = () => {
    if (!hasSavedOnce) void removeTemplate()
    blocker.proceed?.()
  }

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">{t("templates.loading")}</p>
  }

  if (!existing) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">{t("templates.notFound")}</p>
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={handleBack}>
          {t("templates.backToTemplates")}
        </Button>
      </div>
    )
  }

  // Bundled templates (and any driver that can't write at all) are shown
  // read-only — a live `TemplateEditor` whose changes silently went nowhere
  // would just look broken, so this offers a duplicate-to-edit path instead.
  const isReadOnly = isBundled(existing.id) || !canWrite

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div className={cn("flex items-center gap-3", isReadOnly && "mx-auto w-full max-w-2xl")}>
        <Button type="button" variant="ghost" size="icon-sm" onClick={handleBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          <span className="sr-only">{t("templates.back")}</span>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{isReadOnly ? existing.name : t("templates.edit")}</h1>
          <p className="text-sm text-muted-foreground">
            {isReadOnly ? t("templates.readOnlyDescription") : t("templates.editDescription")}
          </p>
        </div>

        {!isReadOnly ? (
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="lg" onClick={handleDeleteButtonClick}>
              {hasSavedOnce ? t("templates.delete") : t("templates.cancel")}
            </Button>
            <Button type="button" size="lg" disabled={!isDirty} onClick={handleSave}>
              {t("templates.save")}
            </Button>
          </div>
        ) : null}
      </div>

      {isReadOnly ? (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <SlidePreview
            template={existing.template}
            text={t("templates.sampleText")}
            className="rounded-3xl px-8 py-10 ring-1 ring-border"
            style={{ aspectRatio: ratio }}
          />
          <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => void handleDuplicate()}>
            <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
            {t("templates.duplicateToEdit")}
          </Button>
        </div>
      ) : (
        <div className="@container">
          <div className="flex flex-col gap-6 @4xl:grid @4xl:grid-cols-[380px_1fr] @4xl:items-start">
            <div className="order-last flex flex-col gap-6 @4xl:order-none @4xl:sticky @4xl:top-6 @4xl:max-h-[calc(100vh-3rem)] @4xl:overflow-y-auto @4xl:pr-2">
              <Field>
                <FieldLabel>{t("templates.nameLabel")}</FieldLabel>
                <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
              </Field>

              <TemplateEditor
                template={draftTemplate}
                onChange={(patch) => setDraftTemplate((previous) => ({ ...previous, ...patch }))}
                onReset={() => setDraftTemplate(DEFAULT_SLIDE_TEMPLATE)}
                canUseVideoBackground={supportsVideoBackground}
              />
            </div>

            <div className="order-first flex items-center justify-center @4xl:order-none @4xl:sticky @4xl:top-6 @4xl:min-h-[calc(100vh-3rem)]">
              <SlidePreview
                template={draftTemplate}
                text={t("templates.sampleText")}
                className="w-full rounded-3xl bg-background px-8 py-10 ring-1 ring-border"
                style={{ aspectRatio: ratio }}
              />
            </div>
          </div>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasSavedOnce ? t("templates.deleteConfirmTitle") : t("templates.cancelConfirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {hasSavedOnce
                ? t("templates.deleteConfirmDescription", { name: existing.name })
                : t("templates.cancelConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("library.cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDelete}>
              {hasSavedOnce ? t("templates.delete") : t("templates.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasSavedOnce ? t("templates.unsavedChangesTitle") : t("templates.cancelConfirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {hasSavedOnce
                ? t("templates.unsavedChangesDescription")
                : t("templates.cancelConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => blocker.reset?.()}>
              {t("templates.keepEditing")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDiscardNavigation}>
              {t("templates.discardChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
