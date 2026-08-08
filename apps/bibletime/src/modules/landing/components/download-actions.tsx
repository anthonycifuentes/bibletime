import { Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon } from "@hugeicons/core-free-icons"

import { useTranslation } from "@/modules/core/i18n"
import { CONSOLE_ROUTE, RELEASES_URL } from "@/modules/landing/lib/landing-content"
import { Button } from "@workspace/ui/components/button"

/**
 * The page's two actions, and the only two. Download goes to the Releases
 * index — free, no account, nothing to sign up for — and the secondary
 * action opens the console for anyone who doesn't want to install anything.
 */
export function DownloadActions() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="lg"
          nativeButton={false}
          className="[&_svg]:text-signal"
          render={<a href={RELEASES_URL} target="_blank" rel="noreferrer" />}
        >
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
          {t("landing.download")}
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

      <p className="text-sm text-muted-foreground">
        <span className="font-bold text-signal">{t("landing.downloadNote")}</span>{" "}
        {t("landing.platforms")}
      </p>
    </div>
  )
}
