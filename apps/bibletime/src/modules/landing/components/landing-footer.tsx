import { Link } from "@tanstack/react-router"

import { useTranslation } from "@/modules/core/i18n"
import { CONSOLE_ROUTE, REPOSITORY_URL } from "@/modules/landing/lib/landing-content"

/** One row: what it costs, where the code is, and a way into the app. */
export function LandingFooter() {
  const { t } = useTranslation()

  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
      <span>{t("landing.footer.free")}</span>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {t("landing.footer.source")}
        </a>
        <Link
          to={CONSOLE_ROUTE}
          className="rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {t("landing.footer.console")}
        </Link>
      </div>
    </footer>
  )
}
