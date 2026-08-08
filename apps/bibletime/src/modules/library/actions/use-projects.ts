import { useCallback, useEffect, useState } from "react"

import type { Folder, Project, ProjectSaveResult } from "@/modules/library/interfaces"
import { getLibraryStorage, getProjectStorage } from "@/modules/library/services"
import {
  downloadProjectFile,
  parseProjectFile,
  projectFileName,
  serializeProjectFile,
} from "@/modules/library/services/project-file"

const ACTIVE_ID_STORAGE_KEY = "bibletime.activeProjectId"

const createId = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const isBrowser = typeof window !== "undefined"

// Stable singletons per platform, mirrors `useLibrary`/`useTemplates`.
const projectStorage = getProjectStorage()
const libraryStorage = getLibraryStorage()

/**
 * Ensures at least one project exists — migrating any folder saved before
 * `Project` existed (no `projectId`) into one auto-created default project —
 * then returns the up-to-date project list. A no-op once every folder has a
 * `projectId`, so this is safe to run on every load.
 */
const ensureMigratedProjects = async (): Promise<Project[]> => {
  const [projects, folders] = await Promise.all([projectStorage.list(), libraryStorage.list()])
  const orphanFolders = folders.filter((folder) => !folder.projectId)

  if (projects.length > 0 || orphanFolders.length === 0) return projects

  const now = Date.now()
  const defaultProject: Project = { id: createId("project"), name: "My Project", createdAt: now, updatedAt: now }
  await projectStorage.save(defaultProject)

  await Promise.all(
    orphanFolders.map((folder) => libraryStorage.save({ ...folder, projectId: defaultProject.id, updatedAt: now }))
  )

  return [defaultProject, ...projects]
}

/**
 * The Library's projects: list/create/rename/delete, and which one is
 * active — mirrors `useTemplates()`'s shape. Meant to be called once at the
 * console shell's root; the active project id is passed to `useLibrary` so
 * folder listing/creation can be scoped to it.
 */
export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await ensureMigratedProjects()
    setProjects(list)
    setIsLoading(false)
    return list
  }, [])

  useEffect(() => {
    void (async () => {
      const list = await refresh()
      const storedId = isBrowser ? window.localStorage.getItem(ACTIVE_ID_STORAGE_KEY) : null
      const validId = list.find((project) => project.id === storedId)?.id
      setActiveId(validId ?? list.at(0)?.id ?? null)
    })()
  }, [refresh])

  const setActive = useCallback((id: string) => {
    setActiveId(id)
    if (isBrowser) window.localStorage.setItem(ACTIVE_ID_STORAGE_KEY, id)
  }, [])

  const create = useCallback(
    async (name: string) => {
      const now = Date.now()
      const project: Project = { id: createId("project"), name, createdAt: now, updatedAt: now }
      await projectStorage.save(project)
      await refresh()
      setActive(project.id)
      return project
    },
    [refresh, setActive]
  )

  const rename = useCallback(
    async (id: string, name: string) => {
      const existing = projects.find((project) => project.id === id)
      if (!existing) return
      await projectStorage.save({ ...existing, name, updatedAt: Date.now() })
      await refresh()
    },
    [projects, refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      await projectStorage.remove(id)
      const remaining = await refresh()
      if (activeId !== id) return

      const next = remaining.at(0)
      if (next) {
        setActive(next.id)
      } else {
        setActiveId(null)
        if (isBrowser) window.localStorage.removeItem(ACTIVE_ID_STORAGE_KEY)
      }
    },
    [activeId, refresh, setActive]
  )

  /**
   * A project's own folders, read directly from storage rather than from
   * `useLibrary`'s `folders` — that hook only ever loads the *active*
   * project's folders, and the project being saved may not be the active one.
   */
  const foldersOf = useCallback(
    async (projectId: string): Promise<Folder[]> =>
      (await libraryStorage.list()).filter((folder) => folder.projectId === projectId),
    []
  )

  /** Records which file a project is now bound to, so the next "Save" needs no dialog. */
  const bindFilePath = useCallback(
    async (project: Project, filePath: string) => {
      await projectStorage.save({ ...project, filePath, updatedAt: Date.now() })
      await refresh()
    },
    [refresh]
  )

  /**
   * Writes the project to a location the user picks. On desktop that's a
   * native save dialog (and the project is bound to whatever they chose); on
   * web, where there is no filesystem to pick from, it stays the browser
   * download it has always been.
   */
  const saveProjectAs = useCallback(
    async (id: string): Promise<ProjectSaveResult> => {
      const project = projects.find((candidate) => candidate.id === id)
      if (!project) return { status: "failed", error: `Unknown project: ${id}` }

      const folders = await foldersOf(id)
      const bridge = window.bibletime?.project

      if (!bridge?.saveFileDialog) {
        downloadProjectFile(project, folders)
        return { status: "saved" }
      }

      const result = await bridge.saveFileDialog(
        // Seeded with the current binding when there is one, so "Save as…"
        // opens where the file already lives rather than somewhere unrelated.
        project.filePath ?? projectFileName(project),
        serializeProjectFile(project, folders)
      )
      if (result.canceled) return { status: "canceled" }
      if (!result.ok) return { status: "failed", error: result.error }

      await bindFilePath(project, result.path)
      return { status: "saved", path: result.path }
    },
    [bindFilePath, foldersOf, projects]
  )

  /**
   * Writes the project back to the file it is bound to, with no dialog. Falls
   * through to `saveProjectAs` when there is no binding yet (a first save), and
   * reports a stale binding as a recoverable failure — the caller shows the
   * reason and then offers the dialog, rather than silently reopening it.
   */
  const saveProject = useCallback(
    async (id: string): Promise<ProjectSaveResult> => {
      const project = projects.find((candidate) => candidate.id === id)
      if (!project) return { status: "failed", error: `Unknown project: ${id}` }

      const bridge = window.bibletime?.project
      if (!bridge?.saveToPath || !project.filePath) return saveProjectAs(id)

      const folders = await foldersOf(id)
      const result = await bridge.saveToPath(project.filePath, serializeProjectFile(project, folders))
      if (result.ok) return { status: "saved", path: result.path }

      return { status: "failed", error: result.error, retryWithDialog: true }
    },
    [foldersOf, projects, saveProjectAs]
  )

  /** Bundles a project and its folders/slides into one file — the counterpart to `openProjectFile`. Kept as the name the existing "Export" menu item calls, now sharing one save path with it rather than diverging. */
  const exportProject = useCallback((id: string) => saveProject(id), [saveProject])

  /**
   * Creates a brand-new project from a previously-exported project file's
   * contents — a fresh id for the project and for every one of its folders
   * and items, so opening the same file twice (or into an app that already
   * has data) never collides with anything that already exists. Throws if
   * `contents` isn't a valid project file (see `parseProjectFile`), leaving
   * the caller to surface that error — no project is created in that case.
   *
   * `filePath` (desktop only — the web file picker never sees a path) binds
   * the new project to the file it came from, so a later "Save" writes back
   * there. The project is still a *copy* in managed storage: nothing is
   * written to that file until the user explicitly saves.
   */
  const openProjectFile = useCallback(
    async (contents: string, filePath?: string) => {
      const file = parseProjectFile(contents)

      const now = Date.now()
      const project: Project = {
        id: createId("project"),
        name: file.project.name,
        createdAt: now,
        updatedAt: now,
        ...(filePath ? { filePath } : {}),
      }
      await projectStorage.save(project)

      const idMap = new Map(file.folders.map((folder) => [folder.id, createId("folder")]))
      const newFolders: Folder[] = file.folders.map((folder) => ({
        ...folder,
        id: idMap.get(folder.id)!,
        projectId: project.id,
        parentId: folder.parentId ? (idMap.get(folder.parentId) ?? null) : null,
        items: folder.items.map((item) => ({ ...item, id: createId("item") })),
        createdAt: now,
        updatedAt: now,
      }))
      await Promise.all(newFolders.map((folder) => libraryStorage.save(folder)))

      await refresh()
      setActive(project.id)
      return project
    },
    [refresh, setActive]
  )

  return {
    projects,
    isLoading,
    canWrite: projectStorage.canWrite,
    activeId,
    activeProject: projects.find((project) => project.id === activeId),
    setActive,
    create,
    rename,
    remove,
    saveProject,
    saveProjectAs,
    exportProject,
    openProjectFile,
    refresh,
  }
}
