import { useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { useTranslation } from "@/modules/core/i18n"

/**
 * Where projects (and their folders/slides) are saved on disk — desktop
 * only, since the web build has no filesystem to relocate anything on.
 * Changing it moves everything already saved into the new location (see
 * `apps/desktop/src/main.ts`'s `changeProjectsDataDir`) before switching to
 * it, so nothing already saved becomes invisible after the change.
 */
export function ProjectStoragePanel() {
  const { t } = useTranslation()
  const [state, setState] = useState<{ path: string; isDefault: boolean } | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  // `window` doesn't exist during SSR — same reasoning as `SystemInfoPanel`.
  const projectSettings = typeof window !== "undefined" ? window.bibletime?.projectSettings : undefined

  useEffect(() => {
    if (!projectSettings) return
    void projectSettings.get().then(setState)
  }, [projectSettings])

  if (!projectSettings) {
    return <p className="text-sm text-muted-foreground">{t("settings.projectStorage.webNote")}</p>
  }

  const handleChange = async () => {
    setIsBusy(true)
    try {
      const next = await projectSettings.choose()
      if (next) setState(next)
    } finally {
      setIsBusy(false)
    }
  }

  const handleReset = async () => {
    setIsBusy(true)
    try {
      setState(await projectSettings.resetToDefault())
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="truncate rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
        {state?.path ?? "…"}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => void handleChange()}>
          {t("settings.projectStorage.change")}
        </Button>
        {state && !state.isDefault ? (
          <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => void handleReset()}>
            {t("settings.projectStorage.resetToDefault")}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
