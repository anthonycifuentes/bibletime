import { useTranslation } from "@/modules/core/i18n"

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

/**
 * Platform, and (only inside the Electron desktop shell) Electron/Chrome/Node
 * versions read from the `window.bibletime` preload bridge. Shows a "Web"
 * platform label when that bridge is absent (the plain web build).
 *
 * The app's own version lives in the Updates panel above, which owns
 * everything about which version you're running and whether it's current.
 */
export function SystemInfoPanel() {
  const { t } = useTranslation()

  // `window` doesn't exist during SSR — this panel only ever shows real
  // values once mounted on the client, same reasoning as the locale/theme
  // providers' SSR-safe defaults.
  const bibletime = typeof window !== "undefined" ? window.bibletime : undefined
  const versions = bibletime?.versions

  return (
    <div className="flex flex-col gap-2">
      <InfoRow
        label={t("settings.systemInfo.platform")}
        value={versions ? t("settings.systemInfo.platformDesktop") : t("settings.systemInfo.platformWeb")}
      />
      {versions ? (
        <>
          <InfoRow label={t("settings.systemInfo.electron")} value={versions.electron ?? "—"} />
          <InfoRow label={t("settings.systemInfo.chrome")} value={versions.chrome ?? "—"} />
          <InfoRow label={t("settings.systemInfo.node")} value={versions.node} />
        </>
      ) : null}
    </div>
  )
}
