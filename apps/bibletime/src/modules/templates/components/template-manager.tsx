import { useNavigate } from "@tanstack/react-router"
import type { MouseEvent } from "react"

import { SlidePreview } from "@/modules/presentation"
import type { useTemplates } from "@/modules/templates/actions/use-templates"
import { TemplateLibraryToolbar } from "@/modules/templates/components/template-library-toolbar"
import { Button } from "@workspace/ui/components/button"
import { Pill } from "@workspace/ui/components/pill"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Copy01Icon,
  Delete02Icon,
  Download03Icon,
  Edit02Icon,
} from "@hugeicons/core-free-icons"

type TemplatesState = ReturnType<typeof useTemplates>

const isBundled = (id: string): boolean => id.startsWith("bundled-")

/** A representative line of sample text, so a template's card actually shows how it reads. */
const SAMPLE_TEXT = "Amor, gozo, paz, paciencia, benignidad."

const CARD_SELECTED_RING =
  "ring-2 ring-ring ring-offset-2 ring-offset-background"

/** Stops a card action (duplicate/edit/export/delete) from also selecting the card underneath it. */
const stop = (event: MouseEvent) => event.stopPropagation()

/**
 * The template library: a card gallery to browse/apply saved templates,
 * and — where the platform allows it (`canWrite`) — create, duplicate,
 * import, and export them as JSON files. Creating and editing both happen
 * on their own page (`/templates/new` and `/templates/$templateId`), not
 * inline here. `@container` (not viewport breakpoints) drives the grid's
 * column count, since this same component renders both in the Bible
 * console's narrow settings drawer and the full-width `/templates` page.
 */
export function TemplateManager({
  templates,
  canWrite,
  activeId,
  setActive,
  create,
  update,
  remove,
  exportTemplate,
  importTemplate,
  /** False when an ancestor (e.g. the `/templates` page header) already renders its own toolbar. */
  showToolbar = true,
}: TemplatesState & { showToolbar?: boolean }) {
  const navigate = useNavigate()

  const handleDuplicate = async (
    name: string,
    template: (typeof templates)[number]["template"]
  ) => {
    const saved = await create(`Copia de ${name}`)
    await update(saved.id, { template })
    void navigate({
      to: "/templates/$templateId",
      params: { templateId: saved.id },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {showToolbar ? (
        <TemplateLibraryToolbar
          canWrite={canWrite}
          importTemplate={importTemplate}
        />
      ) : null}

      <div className="@container">
        <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @3xl:grid-cols-3 @4xl:grid-cols-4 @5xl:grid-cols-5 @7xl:grid-cols-6">
          {templates.map((item) => {
            const active = item.id === activeId
            const bundled = isBundled(item.id)

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setActive(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    setActive(item.id)
                  }
                }}
                className={cn(
                  "flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background",
                  active && CARD_SELECTED_RING
                )}
              >
                <SlidePreview
                  template={item.template}
                  text={SAMPLE_TEXT}
                  className="aspect-video rounded-none border-b border-border px-6 py-6"
                  scale={0.32}
                />

                <div className="flex flex-col gap-2 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm font-medium">
                      {item.name}
                    </span>
                    {active ? <Pill variant="signal">Activa</Pill> : null}
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      onClick={(event) => {
                        stop(event)
                        setActive(item.id)
                      }}
                    >
                      Usar
                    </Button>
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={(event) => {
                          stop(event)
                          void handleDuplicate(item.name, item.template)
                        }}
                      >
                        <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
                        <span className="sr-only">Duplicar</span>
                      </Button>
                    ) : null}
                    {canWrite && !bundled ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={(event) => {
                          stop(event)
                          void navigate({
                            to: "/templates/$templateId",
                            params: { templateId: item.id },
                          })
                        }}
                      >
                        <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
                        <span className="sr-only">Editar</span>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={(event) => {
                        stop(event)
                        exportTemplate(item.id)
                      }}
                    >
                      <HugeiconsIcon icon={Download03Icon} strokeWidth={2} />
                      <span className="sr-only">Exportar</span>
                    </Button>
                    {canWrite && !bundled ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={(event) => {
                          stop(event)
                          void remove(item.id)
                        }}
                      >
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
