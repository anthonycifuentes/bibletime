import { useCallback, useEffect, useState } from "react"

import type { Folder, Project } from "@/modules/library/interfaces"
import { getLibraryStorage, getProjectStorage } from "@/modules/library/services"
import { downloadProjectFile, parseProjectFile } from "@/modules/library/services/project-file"

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

  /** Bundles a project and its folders/slides into one downloadable JSON file — the counterpart to `openProjectFile`. */
  const exportProject = useCallback(
    async (id: string) => {
      const project = projects.find((candidate) => candidate.id === id)
      if (!project) return

      // Reads directly from storage rather than `useLibrary`'s `folders` —
      // that hook only ever loads the *active* project's folders, and the
      // project being exported may not be the active one.
      const allFolders = await libraryStorage.list()
      const folders = allFolders.filter((folder) => folder.projectId === id)
      downloadProjectFile(project, folders)
    },
    [projects]
  )

  /**
   * Creates a brand-new project from a previously-exported project file's
   * contents — a fresh id for the project and for every one of its folders
   * and items, so opening the same file twice (or into an app that already
   * has data) never collides with anything that already exists. Throws if
   * `contents` isn't a valid project file (see `parseProjectFile`), leaving
   * the caller to surface that error — no project is created in that case.
   */
  const openProjectFile = useCallback(
    async (contents: string) => {
      const file = parseProjectFile(contents)

      const now = Date.now()
      const project: Project = { id: createId("project"), name: file.project.name, createdAt: now, updatedAt: now }
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
    exportProject,
    openProjectFile,
    refresh,
  }
}
