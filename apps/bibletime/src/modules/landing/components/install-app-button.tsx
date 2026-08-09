import { HugeiconsIcon } from "@hugeicons/react"
import { ComputerAddIcon } from "@hugeicons/core-free-icons"

import { useTranslation } from "@/modules/core/i18n"
import { useInstallApp } from "@/modules/landing/actions/use-install-app"
import { Button } from "@workspace/ui/components/button"

/**
 * "Add it to your desktop" — the browser version installed as an app, in its
 * own window, with its own icon.
 *
 * Renders nothing at all unless the browser has actually offered a prompt, so
 * the row never carries a button that would do nothing when clicked.
 */
export function InstallAppButton() {
  const { t } = useTranslation()
  const { state, install } = useInstallApp()

  if (state === "installed") {
    return <p className="text-sm text-muted-foreground">{t("landing.installDone")}</p>
  }

  // The prompt is single-use: once it's been dismissed there's nothing left to
  // click, so point at the way in that's still there rather than a dead button.
  if (state === "dismissed") {
    return <p className="text-sm text-muted-foreground">{t("landing.installDismissed")}</p>
  }

  if (state === "unavailable") return null

  return (
    <Button
      size="lg"
      variant="outline"
      onClick={install}
      disabled={state === "prompting"}
      title={t("landing.installAppHint")}
    >
      <HugeiconsIcon icon={ComputerAddIcon} strokeWidth={2} />
      {t("landing.installApp")}
    </Button>
  )
}
