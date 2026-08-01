import { useCallback, useEffect, useState } from "react"

import { DEFAULT_SLIDE_TEMPLATE, normalizeSlideTemplate } from "@/modules/presentation"
import type { SavedTemplate } from "@/modules/templates/interfaces"
import { downloadTemplateFile, getTemplateStorage, parseTemplateFile } from "@/modules/templates/services"

const ACTIVE_ID_STORAGE_KEY = "bibletime.activeTemplateId"

const createId = (): string => `custom-${Math.random().toString(36).slice(2, 10)}`

const isBrowser = typeof window !== "undefined"

// A stable singleton per platform (see `getTemplateStorage`), so this is safe to
// depend on directly in the hooks below without re-fetching it on every render.
const storage = getTemplateStorage()

/**
 * The template library: list/create/update/remove, which one is active,
 * and JSON import/export. Backed by whichever `TemplateStorageDriver` fits
 * the current platform — `canWrite` tells the UI whether create/edit/
 * delete/import should even be offered.
 */
export const useTemplates = () => {
  const [templates, setTemplates] = useState<SavedTemplate[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await storage.list()
    // Normalizes each template's shape on read so templates saved before a
    // field existed (underlineColor, current font ids) still render correctly.
    setTemplates(list.map((item) => ({ ...item, template: normalizeSlideTemplate(item.template) })))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    if (isBrowser) setActiveId(window.localStorage.getItem(ACTIVE_ID_STORAGE_KEY))
  }, [refresh])

  const setActive = useCallback((id: string) => {
    setActiveId(id)
    if (isBrowser) window.localStorage.setItem(ACTIVE_ID_STORAGE_KEY, id)
  }, [])

  const create = useCallback(
    async (name: string) => {
      const saved: SavedTemplate = {
        id: createId(),
        name,
        template: DEFAULT_SLIDE_TEMPLATE,
        updatedAt: Date.now(),
      }
      await storage.save(saved)
      await refresh()
      setActive(saved.id)
      return saved
    },
    [refresh, setActive]
  )

  const update = useCallback(
    async (id: string, patch: Partial<Pick<SavedTemplate, "name" | "template">>) => {
      const existing = templates.find((item) => item.id === id)
      if (!existing) return

      const next: SavedTemplate = { ...existing, ...patch, updatedAt: Date.now() }
      await storage.save(next)
      await refresh()
    },
    [templates, refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      await storage.remove(id)
      await refresh()
      if (activeId === id) setActive("")
    },
    [activeId, refresh, setActive]
  )

  const exportTemplate = useCallback(
    (id: string) => {
      const found = templates.find((item) => item.id === id)
      if (found) downloadTemplateFile(found)
    },
    [templates]
  )

  const importTemplate = useCallback(
    async (file: File) => {
      const text = await file.text()
      const parsed = parseTemplateFile(text)
      const saved: SavedTemplate = {
        id: createId(),
        name: parsed.name,
        template: parsed.template,
        updatedAt: Date.now(),
      }
      await storage.save(saved)
      await refresh()
      setActive(saved.id)
      return saved
    },
    [refresh, setActive]
  )

  const activeTemplateEntry = templates.find((item) => item.id === activeId) ?? templates.at(0)

  return {
    templates,
    isLoading,
    canWrite: storage.canWrite,
    supportsVideoBackground: storage.supportsVideoBackground,
    activeId: activeTemplateEntry?.id,
    activeTemplate: activeTemplateEntry?.template ?? DEFAULT_SLIDE_TEMPLATE,
    setActive,
    create,
    update,
    remove,
    exportTemplate,
    importTemplate,
    refresh,
  }
}
