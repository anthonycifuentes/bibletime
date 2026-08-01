import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { DEFAULT_SLIDE_TEMPLATE, SlidePreview, TemplateEditor } from "@/modules/presentation"
import { useAspectRatio } from "@/modules/core/aspect-ratio"
import { useTemplates } from "@/modules/templates"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, Copy01Icon } from "@hugeicons/core-free-icons"
import { useTranslation } from "@/modules/core/i18n"

export const Route = createFileRoute("/templates/$templateId")({
  component: TemplateEditorRoute,
})

const isBundled = (id: string): boolean => id.startsWith("bundled-")

/**
 * The dedicated template editor page — where creating (via `/templates/new`
 * redirecting here) and editing an existing template both actually happen.
 * Every change auto-saves immediately, same as everywhere else in this app;
 * there's no separate "save" step to forget.
 */
function TemplateEditorRoute() {
  const { templateId } = Route.useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { ratio } = useAspectRatio()
  const { templates, isLoading, canWrite, supportsVideoBackground, create, update } = useTemplates()

  const existing = templates.find((item) => item.id === templateId)
  const [name, setName] = useState(existing?.name ?? "")

  useEffect(() => {
    if (existing) setName(existing.name)
  }, [existing])

  const handleBack = () => void navigate({ to: "/library" })

  const handleDuplicate = async () => {
    if (!existing) return
    const saved = await create(t("templates.copyOf", { name: existing.name }))
    await update(saved.id, { template: existing.template })
    void navigate({ to: "/templates/$templateId", params: { templateId: saved.id }, replace: true })
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon-sm" onClick={handleBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          <span className="sr-only">{t("templates.back")}</span>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{isReadOnly ? existing.name : t("templates.edit")}</h1>
          <p className="text-sm text-muted-foreground">
            {isReadOnly ? t("templates.readOnlyDescription") : t("templates.autosaveDescription")}
          </p>
        </div>
      </div>

      {isReadOnly ? (
        <div className="flex flex-col gap-4">
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
        <>
          <SlidePreview
            template={existing.template}
            text={t("templates.sampleText")}
            className="sticky top-6 z-10 rounded-3xl bg-background px-8 py-10 ring-1 ring-border"
            style={{ aspectRatio: ratio }}
          />

          <Field>
            <FieldLabel>{t("templates.nameLabel")}</FieldLabel>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => {
                if (name.trim() && name !== existing.name) {
                  void update(existing.id, { name: name.trim() })
                }
              }}
            />
          </Field>

          <TemplateEditor
            template={existing.template}
            onChange={(patch) =>
              void update(existing.id, { template: { ...existing.template, ...patch } })
            }
            onReset={() => void update(existing.id, { template: DEFAULT_SLIDE_TEMPLATE })}
            canUseVideoBackground={supportsVideoBackground}
          />
        </>
      )}
    </div>
  )
}
