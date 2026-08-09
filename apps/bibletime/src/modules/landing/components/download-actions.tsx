import { Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon } from "@hugeicons/core-free-icons"

import type { DownloadTargetId, PlatformFamily } from "@/modules/landing/interfaces"
import { useTranslation } from "@/modules/core/i18n"
import { useDetectedDownload } from "@/modules/landing/actions/use-detected-download"
import { CONSOLE_ROUTE, RELEASES_URL } from "@/modules/landing/lib/landing-content"
import { DOWNLOAD_TARGETS, getDownloadTarget } from "@/modules/landing/lib/downloads"
import { PlatformIcon } from "@/modules/landing/components/platform-icon"
import { WebInstallButton } from "@/modules/landing/components/web-install-button"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const FAMILY_OF: Record<DownloadTargetId, PlatformFamily> = {
  windows: "windows",
  "macos-arm64": "macos",
  "macos-x64": "macos",
  linux: "linux",
}

/** The icon row: one entry per platform, the Mac one following detection. */
const useSecondaryTargets = (primaryId: DownloadTargetId | null) => {
  const macId: DownloadTargetId = primaryId === "macos-x64" ? "macos-x64" : "macos-arm64"
  return (["windows", macId, "linux"] as const)
    .map(getDownloadTarget)
    .filter((target) => target.id !== primaryId)
}

export function DownloadActions() {
  const { t } = useTranslation()
  const { family, targetId } = useDetectedDownload()

  const primary = targetId ? getDownloadTarget(targetId) : null
  const secondary = useSecondaryTargets(targetId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="lg"
          nativeButton={false}
          className="[&_svg]:text-signal"
          render={
            <a
              href={primary?.url ?? RELEASES_URL}
              // A direct asset link is a file, not a page: `download` keeps
              // the browser from navigating away from the landing page.
              // The Releases fallback is a page, so it opens in a new tab.
              {...(primary ? { download: "" } : { target: "_blank", rel: "noreferrer" })}
            />
          }
        >
          {primary && family ? (
            <PlatformIcon family={family} />
          ) : (
            <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
          )}
          {primary && family
            ? t("landing.downloadFor", { platform: t(primary.labelKey) })
            : t("landing.download")}
        </Button>

        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          render={<Link to={CONSOLE_ROUTE} />}
        >
          {t("landing.openInBrowser")}
        </Button>
      </div>

      {primary ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-signal">{t("landing.downloadNote")}</span>{" "}
          {t(primary.hintKey)}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-signal">{t("landing.downloadNote")}</span>{" "}
          {t("landing.platforms")}
        </p>
      )}

      {/* Sits with the other ways in, under the note about the download and
          above the per-platform installers: it's the option for someone who
          doesn't want a file at all. Renders nothing where the browser has
          no `<install>` element, which today is most of them. */}
      <WebInstallButton />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {primary ? t("landing.otherPlatforms") : t("landing.allPlatforms")}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {(primary ? secondary : DOWNLOAD_TARGETS.filter((x) => x.id !== "macos-x64")).map(
            (target) => (
              <a
                key={target.id}
                href={target.url}
                download=""
                title={`${t(target.labelKey)} — ${t(target.hintKey)}`}
                aria-label={t("landing.downloadFor", { platform: t(target.labelKey) })}
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl border border-border bg-card",
                  "text-muted-foreground transition-colors",
                  "hover:border-signal hover:text-signal",
                  "focus-visible:ring-2 focus-visible:ring-signal focus-visible:outline-none"
                )}
              >
                <PlatformIcon family={FAMILY_OF[target.id]} />
              </a>
            )
          )}

          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            className="ml-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("landing.allReleases")}
          </a>
        </div>
      </div>
    </div>
  )
}
