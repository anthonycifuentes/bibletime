import { Link } from "@tanstack/react-router"

import { useTranslation } from "@/modules/core/i18n"
import { useUpdateCheck } from "@/modules/updates/actions/use-update-check"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, DownloadCircle01Icon } from "@hugeicons/core-free-icons"

/**
 * A strip under the header announcing that a newer BibleTime exists.
 *
 * Deliberately not a dialog: someone who just opened the app is usually
 * about to prepare a service, and blocking that to talk about an update is
 * the wrong trade. It sits in the console shell so it's visible from every
 * tab, and it renders nothing at all unless there is genuinely something
 * newer that the user hasn't already waved away.
 */
export function UpdateBanner() {
  const { t } = useTranslation()
  const { availableUpdate, shouldShowBanner, dismiss } = useUpdateCheck()

  if (!shouldShowBanner || !availableUpdate) return null

  return (
    <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-2 text-sm">
      <HugeiconsIcon
        icon={DownloadCircle01Icon}
        strokeWidth={2}
        className="size-4 shrink-0"
      />

      <p className="min-w-0 flex-1 truncate">
        {t("updates.banner.title", {
          version: availableUpdate.availableVersion,
        })}
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link to="/settings" />}
      >
        {t("updates.banner.action")}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => void dismiss()}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        <span className="sr-only">{t("updates.banner.dismiss")}</span>
      </Button>
    </div>
  )
}
