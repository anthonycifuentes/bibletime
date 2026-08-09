import { useTranslation } from "@/modules/core/i18n"
import { useUpdateCheck } from "@/modules/updates/actions/use-update-check"
import { useUpdateDownload } from "@/modules/updates/actions/use-update-download"
import { Button } from "@workspace/ui/components/button"

const INSTALL_GUIDE_URL =
  "https://github.com/anthonycifuentes/bibletime/blob/main/docs/install.md"

/** Bytes → a short human-readable size, matching `MediaStoragePanel`'s cache figure. */
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`
}

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
 * The durable home for version information: what's running, whether it's
 * current, and what to do about it if it isn't.
 *
 * In the web build this collapses to the version alone — a browser tab is
 * always served the latest deploy, so there's nothing to check or download.
 */
export function UpdatesPanel() {
  const { t, locale } = useTranslation()
  const {
    canCheck,
    currentVersion,
    lastCheckedAt,
    result,
    isChecking,
    availableUpdate,
    checkNow,
  } = useUpdateCheck()
  const { state: download, start, cancel, reveal } = useUpdateDownload()

  const formatCheckedAt = (timestamp: number) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(timestamp)

  const progressLabel = () => {
    if (download.status !== "downloading") return ""
    // No content length means no honest percentage — show what has arrived
    // rather than a number that's wrong.
    if (download.totalBytes === null) return formatBytes(download.receivedBytes)
    const percent = Math.min(
      100,
      Math.round((download.receivedBytes / download.totalBytes) * 100)
    )
    return `${percent}%`
  }

  return (
    <div className="flex flex-col gap-3">
      <InfoRow
        label={t("settings.updates.currentVersion")}
        value={currentVersion}
      />

      {!canCheck ? (
        <p className="text-sm text-muted-foreground">
          {t("settings.updates.webNote")}
        </p>
      ) : (
        <>
          {isChecking ? (
            <p className="text-sm">{t("settings.updates.checking")}</p>
          ) : null}

          {!isChecking && result?.status === "up-to-date" ? (
            <p className="text-sm">{t("settings.updates.upToDate")}</p>
          ) : null}

          {!isChecking && result?.status === "failed" ? (
            <p className="text-sm">{t("settings.updates.checkFailed")}</p>
          ) : null}

          {!isChecking && availableUpdate ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                {t("settings.updates.available", {
                  version: availableUpdate.availableVersion,
                })}
              </p>

              {download.status === "downloading" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.updates.downloading", {
                      progress: progressLabel(),
                    })}
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      // Indeterminate lengths get a fixed sliver rather than a
                      // bar that would imply a percentage nobody measured.
                      style={{
                        width:
                          download.totalBytes === null
                            ? "33%"
                            : `${Math.min(100, (download.receivedBytes / download.totalBytes) * 100)}%`,
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => void cancel()}
                  >
                    {t("settings.updates.cancel")}
                  </Button>
                </>
              ) : download.status === "completed" ? (
                <>
                  <p className="text-sm">
                    {t("settings.updates.downloaded", {
                      file: download.fileName,
                    })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void reveal()}
                    >
                      {t("settings.updates.reveal")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      nativeButton={false}
                      render={
                        <a
                          href={INSTALL_GUIDE_URL}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                    >
                      {t("settings.updates.installHelp")}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {download.status === "failed" ? (
                    <p className="text-sm text-muted-foreground">
                      {t("settings.updates.downloadFailed")}
                    </p>
                  ) : null}
                  {download.status === "cancelled" ? (
                    <p className="text-sm text-muted-foreground">
                      {t("settings.updates.cancelled")}
                    </p>
                  ) : null}

                  {availableUpdate.asset ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => void start(availableUpdate.asset!)}
                      >
                        {t(
                          download.status === "failed"
                            ? "settings.updates.retry"
                            : "settings.updates.download"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={
                          <a
                            href={availableUpdate.releaseUrl}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        {t("settings.updates.releaseNotes")}
                      </Button>
                    </div>
                  ) : (
                    // A release with no build for this platform is a real
                    // state — send the user somewhere useful instead of
                    // offering a download that can't happen.
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground">
                        {t("settings.updates.noAsset")}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="self-start"
                        nativeButton={false}
                        render={
                          <a
                            href={availableUpdate.releaseUrl}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        {t("settings.updates.openReleasePage")}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            {lastCheckedAt === null
              ? t("settings.updates.neverChecked")
              : t("settings.updates.lastChecked", {
                  when: formatCheckedAt(lastCheckedAt),
                })}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            disabled={isChecking}
            onClick={() => void checkNow()}
          >
            {t(
              result?.status === "failed"
                ? "settings.updates.retry"
                : "settings.updates.checkNow"
            )}
          </Button>
        </>
      )}
    </div>
  )
}
