import { useNavigate } from "@tanstack/react-router"
import type { MouseEvent } from "react"

import { useTranslation } from "@/modules/core/i18n"
import { SlidePreview } from "@/modules/presentation"
import type { useTemplates } from "@/modules/templates/actions/use-templates"
import { TemplateLibraryToolbar } from "@/modules/templates/components/template-library-toolbar"
import { Button } from "@workspace/ui/components/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Pill } from "@workspace/ui/components/pill"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Copy01Icon,
  Delete02Icon,
  Download03Icon,
  Edit02Icon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons"

type TemplatesState = ReturnType<typeof useTemplates>
type SavedTemplateItem = TemplatesState["templates"][number]

/** One entry shared by both menus a card opens — the "⋮" button and right-click. */
interface CardAction {
  key: string
  label: string
  icon: typeof Copy01Icon
  destructive?: boolean
  run: () => void
}

const isBundled = (id: string): boolean => id.startsWith("bundled-")

/** A representative line of sample text, so a template's card actually shows how it reads. */
const SAMPLE_TEXT = "Amor, gozo, paz, paciencia, benignidad."

const CARD_SELECTED_RING =
  "ring-2 ring-ring ring-offset-2 ring-offset-background"

/** Stops the overflow button from also selecting the card underneath it. */
const stop = (event: MouseEvent) => event.stopPropagation()

/**
 * The template library: a card gallery to browse/apply saved templates,
 * and — where the platform allows it (`canWrite`) — create, duplicate,
 * import, and export them as JSON files. Creating and editing both happen
 * on their own page (`/templates/new` and `/templates/$templateId`), not
 * inline here. A card's face carries no action buttons: clicking it makes
 * the template active, and everything else (edit/duplicate/export/delete)
 * lives in one menu reachable two ways — the "⋮" button in the preview's
 * top-right corner, or right-click anywhere on the card. `@container` (not
 * viewport breakpoints) drives the grid's column count, since this same
 * component renders both in the Bible console's narrow settings drawer and
 * the full-width `/templates` page.
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
  const { t } = useTranslation()

  const handleDuplicate = async (
    name: string,
    template: SavedTemplateItem["template"]
  ) => {
    const saved = await create(t("templates.copyOf", { name }))
    await update(saved.id, { template })
    void navigate({
      to: "/templates/$templateId",
      params: { templateId: saved.id },
    })
  }

  /** Bundled templates ship with the app: they can be duplicated and exported, never edited or deleted in place. */
  const actionsFor = (item: SavedTemplateItem): CardAction[] => {
    const editable = canWrite && !isBundled(item.id)

    const entries: (CardAction | null)[] = [
      editable
        ? {
            key: "edit",
            label: t("templates.edit"),
            icon: Edit02Icon,
            run: () =>
              void navigate({
                to: "/templates/$templateId",
                params: { templateId: item.id },
              }),
          }
        : null,
      canWrite
        ? {
            key: "duplicate",
            label: t("templates.duplicate"),
            icon: Copy01Icon,
            run: () => void handleDuplicate(item.name, item.template),
          }
        : null,
      {
        key: "export",
        label: t("templates.export"),
        icon: Download03Icon,
        run: () => exportTemplate(item.id),
      },
      editable
        ? {
            key: "delete",
            label: t("templates.delete"),
            icon: Delete02Icon,
            destructive: true,
            run: () => void remove(item.id),
          }
        : null,
    ]

    return entries.filter((action): action is CardAction => action !== null)
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
            const actions = actionsFor(item)

            return (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger
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
                    "relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background",
                    active && CARD_SELECTED_RING
                  )}
                >
                  <SlidePreview
                    template={item.template}
                    text={SAMPLE_TEXT}
                    className="aspect-video rounded-none border-b border-border px-6 py-6"
                    scale={0.32}
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          // The card behind it is one big button — a click or
                          // Enter on the menu must not also re-select it.
                          onClick={stop}
                          onKeyDown={(event) => event.stopPropagation()}
                          className="absolute top-2 right-2 z-10 rounded-full border border-border bg-background/70 text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
                        />
                      }
                    >
                      <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
                      <span className="sr-only">
                        {t("templates.moreActions")}
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map((action) => (
                        <DropdownMenuItem
                          key={action.key}
                          variant={action.destructive ? "destructive" : "default"}
                          onClick={action.run}
                        >
                          <HugeiconsIcon icon={action.icon} strokeWidth={2} />
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex items-center gap-2 p-3">
                    <span className="flex-1 truncate text-sm font-medium">
                      {item.name}
                    </span>
                    {active ? (
                      <Pill variant="signal">{t("templates.active")}</Pill>
                    ) : null}
                  </div>
                </ContextMenuTrigger>

                <ContextMenuContent>
                  {actions.map((action) => (
                    <ContextMenuItem
                      key={action.key}
                      variant={action.destructive ? "destructive" : "default"}
                      onClick={action.run}
                    >
                      <HugeiconsIcon icon={action.icon} strokeWidth={2} />
                      {action.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </div>
      </div>
    </div>
  )
}
