import { Link } from "@tanstack/react-router"

import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Settings02Icon } from "@hugeicons/core-free-icons"
import { useTranslation } from "@/modules/core/i18n"

/**
 * The console shell's top bar — full-width, persistent across every
 * bottom-nav tab (it never changes when `activeTab` changes). Hosts app
 * branding and the Settings entry point, since Settings is not a content
 * tab and has no place in the fixed five-tab bottom navigation.
 */
export function HeaderBar() {
  const { t } = useTranslation()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <Link to="/library" className="truncate text-xl font-extrabold text-black dark:text-white">
        BibleTime
      </Link>

      <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link to="/settings" />}>
        <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
        <span className="sr-only">{t("sidebar.settings")}</span>
      </Button>
    </header>
  )
}
