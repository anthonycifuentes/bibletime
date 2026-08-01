import { useCallback, useEffect, useState } from "react"

import type { Project } from "@/modules/library/interfaces"
import { getLibraryStorage, getProjectStorage } from "@/modules/library/services"

const ACTIVE_ID_STORAGE_KEY = "bibletime.activeProjectId"

const createId = (): string => `project-${Math.random().toString(36).slice(2, 10)}`

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
  const defaultProject: Project = { id: createId(), name: "My Project", createdAt: now, updatedAt: now }
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
      const project: Project = { id: createId(), name, createdAt: now, updatedAt: now }
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
    refresh,
  }
}
