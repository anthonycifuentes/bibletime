import { useRef, useState } from "react"
import type { FormEvent } from "react"

import type { Project } from "@/modules/library/interfaces"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Input } from "@workspace/ui/components/input"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Folder01Icon,
  FolderCodeIcon,
  GlobeIcon,
  LaptopIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { useTranslation } from "@/modules/core/i18n"

interface ProjectLauncherProps {
  projects: Project[]
  canWrite: boolean
  onCreateProject: (name: string) => void
  onSwitchProject: (projectId: string) => void
  /** Reads a previously-exported project file's contents and creates a new project from it — throws on invalid input. */
  onOpenProjectFile: (contents: string, filePath?: string) => Promise<unknown>
}

// Mirrors `SystemInfoPanel`'s desktop/web detection: the Electron preload
// bridge is only present inside the desktop shell.
const isDesktopRuntime = typeof window !== "undefined" && Boolean(window.bibletime?.versions)

const RECENT_PROJECTS_LIMIT = 5

/**
 * The "start a project" screen: shown full-shell when no project exists
 * yet, and reused inside the sidebar's "New project" dialog so switching
 * back to a recent project stays one click away without losing whatever's
 * currently open.
 */
export function ProjectLauncher({
  projects,
  canWrite,
  onCreateProject,
  onSwitchProject,
  onOpenProjectFile,
}: ProjectLauncherProps) {
  const { t } = useTranslation()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const recentProjects = [...projects]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, RECENT_PROJECTS_LIMIT)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onCreateProject(trimmed)
    setName("")
    setCreating(false)
  }

  const handleOpenContents = async (contents: string, filePath?: string) => {
    try {
      await onOpenProjectFile(contents, filePath)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t("library.openProjectError"))
    }
  }

  const handleOpenClick = async () => {
    if (window.bibletime?.project.openFileDialog) {
      const opened = await window.bibletime.project.openFileDialog()
      if (opened) await handleOpenContents(opened.contents, opened.path)
      return
    }
    fileInputRef.current?.click()
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Empty className="border-none p-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={FolderCodeIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>{t("library.createProjectTitle")}</EmptyTitle>
          <EmptyDescription>{t("library.createProjectDescription")}</EmptyDescription>
        </EmptyHeader>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HugeiconsIcon
            icon={isDesktopRuntime ? LaptopIcon : GlobeIcon}
            strokeWidth={2}
            className="size-3.5 shrink-0"
          />
          {isDesktopRuntime ? t("library.projectStorageDesktop") : t("library.projectStorageWeb")}
        </div>

        {canWrite ? (
          <EmptyContent>
            {creating ? (
              <form onSubmit={submit} className="w-full max-w-64">
                <Input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={() => {
                    if (!name.trim()) setCreating(false)
                  }}
                  placeholder={t("library.projectNamePlaceholder")}
                />
              </form>
            ) : (
              <div className="flex gap-2">
                <Button type="button" onClick={() => setCreating(true)}>
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  {t("library.newProject")}
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleOpenClick()}>
                  <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} />
                  {t("library.openProject")}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void file.text().then(handleOpenContents)
                  }}
                />
              </div>
            )}
          </EmptyContent>
        ) : null}
      </Empty>

      {recentProjects.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">{t("library.recentProjects")}</h3>
          <div className="flex flex-col gap-1">
            {recentProjects.map((project) => (
              <Button
                key={project.id}
                type="button"
                variant="outline"
                className="justify-start gap-2"
                onClick={() => onSwitchProject(project.id)}
              >
                <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
                <span className="truncate">{project.name}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
