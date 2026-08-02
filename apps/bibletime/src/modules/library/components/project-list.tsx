import { useRef, useState } from "react"
import type { FormEvent } from "react"

import type { Project } from "@/modules/library/interfaces"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Delete02Icon,
  Download03Icon,
  Edit02Icon,
  Folder01Icon,
  Folder02Icon,
  MoreVerticalIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { useTranslation } from "@/modules/core/i18n"

interface ProjectListProps {
  projects: Project[]
  activeProjectId: string | null
  canWrite: boolean
  onSwitchProject: (projectId: string) => void
  onCreateProject: (name: string) => void
  onRenameProject: (projectId: string, name: string) => void
  onDeleteProject: (projectId: string) => void
  onExportProject: (projectId: string) => void
  /** Reads a previously-exported project file's contents and creates a new project from it — throws on invalid input. */
  onOpenProjectFile: (contents: string) => Promise<unknown>
}

/**
 * The bottom drawer's "Projects" tab: this is where projects themselves are
 * created, renamed, switched to, and deleted — the sidebar only ever shows
 * the currently active project's name and folders, it doesn't let you
 * change or add projects directly. Deleting a project cascades to every
 * folder inside it, so it goes through a confirmation dialog first.
 */
export function ProjectList({
  projects,
  activeProjectId,
  canWrite,
  onSwitchProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onExportProject,
  onOpenProjectFile,
}: ProjectListProps) {
  const { t } = useTranslation()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [creating, setCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const pendingDeleteProject = projects.find((project) => project.id === pendingDeleteId)

  const handleOpenContents = async (contents: string) => {
    try {
      await onOpenProjectFile(contents)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t("library.openProjectError"))
    }
  }

  const handleOpenClick = async () => {
    // Desktop: a native "Open" file dialog, not limited to any one folder on
    // disk. Web: browsers have no filesystem access, so fall back to a
    // standard file input — same split `TemplateLibraryToolbar` already uses.
    if (window.bibletime?.project.openFileDialog) {
      const contents = await window.bibletime.project.openFileDialog()
      if (contents) await handleOpenContents(contents)
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileInputChange = async (file: File | undefined) => {
    if (!file) return
    await handleOpenContents(await file.text())
  }

  const startRename = (project: Project) => {
    setRenamingId(project.id)
    setRenameValue(project.name)
  }

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = renameValue.trim()
    if (renamingId && trimmed) onRenameProject(renamingId, trimmed)
    setRenamingId(null)
  }

  const submitNewProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = newProjectName.trim()
    if (trimmed) onCreateProject(trimmed)
    setNewProjectName("")
    setCreating(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase">{t("nav.projects")}</h2>
        {canWrite ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void handleOpenClick()}>
              <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} />
              {t("library.openProject")}
            </Button>
            <Button type="button" size="sm" onClick={() => setCreating((prev) => !prev)}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
              {t("library.newProject")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => void handleFileInputChange(event.target.files?.[0])}
            />
          </div>
        ) : null}
      </div>

      {creating ? (
        <form onSubmit={submitNewProject} className="max-w-64">
          <Input
            autoFocus
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            onBlur={() => {
              if (!newProjectName.trim()) setCreating(false)
            }}
            placeholder={t("library.projectNamePlaceholder")}
          />
        </form>
      ) : null}

      {projects.length === 0 && !creating ? (
        <p className="text-sm text-muted-foreground">{t("library.noProjects")}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId
          const isRenaming = renamingId === project.id

          if (isRenaming) {
            return (
              <form key={project.id} onSubmit={submitRename} className="max-w-48">
                <Input
                  autoFocus
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={() => setRenamingId(null)}
                />
              </form>
            )
          }

          return (
            <div key={project.id} className="flex items-center gap-1">
              <Button
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={cn(isActive && "pointer-events-none")}
                onClick={() => onSwitchProject(project.id)}
              >
                <HugeiconsIcon icon={isActive ? Folder02Icon : Folder01Icon} strokeWidth={2} />
                {project.name}
              </Button>

              {canWrite ? (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                    <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
                    <span className="sr-only">{project.name}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => startRename(project)}>
                      <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
                      {t("library.renameProject")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExportProject(project.id)}>
                      <HugeiconsIcon icon={Download03Icon} strokeWidth={2} />
                      {t("library.exportProject")}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setPendingDeleteId(project.id)}>
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                      {t("library.deleteProject")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          )
        })}
      </div>

      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("library.deleteProjectConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("library.deleteProjectConfirmDescription", { name: pendingDeleteProject?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDeleteId(null)}>
              {t("library.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (pendingDeleteId) onDeleteProject(pendingDeleteId)
                setPendingDeleteId(null)
              }}
            >
              {t("library.deleteProject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
