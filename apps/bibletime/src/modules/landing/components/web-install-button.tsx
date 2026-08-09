import { useTranslation } from "@/modules/core/i18n"
import { useWebInstall } from "@/modules/landing/actions/use-web-install"

/**
 * "Install it as an app", handed to the browser.
 *
 * `<install>` renders its own button: the browser owns the label, its
 * wording, its language and its look, which is exactly why it can trust the
 * click and skip the `beforeinstallprompt` choreography. Nothing here styles
 * its interior — a permission-style element that's been dressed up to look
 * like something else is one the browser is entitled to disable.
 *
 * With no attributes it installs the app this page's manifest declares, which
 * needs that manifest to carry an `id` — see `public/manifest.json`.
 */
export function WebInstallButton() {
  const { t } = useTranslation()
  const { isOffered, state, ref } = useWebInstall()

  if (state === "installed") {
    return <p className="text-sm text-muted-foreground">{t("landing.installDone")}</p>
  }

  if (!isOffered || state === "unavailable") return null

  return (
    <div className="flex flex-col items-start gap-2">
      <install ref={ref} />
      <p className="text-sm text-muted-foreground">
        {state === "dismissed" ? t("landing.installDismissed") : t("landing.installHint")}
      </p>
    </div>
  )
}
