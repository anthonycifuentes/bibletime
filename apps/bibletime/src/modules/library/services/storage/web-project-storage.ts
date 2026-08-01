import type { Project, ProjectStorageDriver } from "@/modules/library/interfaces"

const STORAGE_KEY = "bibletime.library.projects"

const isBrowser = typeof window !== "undefined"

const readProjects = (): Project[] => {
  if (!isBrowser) return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Project[]) : []
  } catch {
    return []
  }
}

const writeProjects = (projects: Project[]): void => {
  if (!isBrowser) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

/** Web build: projects are persisted to this browser's own `localStorage` — per-browser, not portable. */
export const webProjectStorage: ProjectStorageDriver = {
  canWrite: true,
  list: async () => readProjects(),
  save: async (project) => {
    const next = [...readProjects().filter((item) => item.id !== project.id), project]
    writeProjects(next)
  },
  remove: async (id) => {
    writeProjects(readProjects().filter((item) => item.id !== id))
  },
}
