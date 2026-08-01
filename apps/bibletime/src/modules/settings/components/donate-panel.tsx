import { useTranslation } from "@/modules/core/i18n"
import { Button } from "@workspace/ui/components/button"

/** Placeholder donation link — swap for the real destination in a later change. */
const DONATE_URL_PLACEHOLDER = "https://example.com/donate"

/** Static support/donate section. Every value here is a placeholder pending real donation details. */
export function DonatePanel() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("settings.donate.description")}</p>
      <p className="text-xs text-muted-foreground italic">{t("settings.donate.placeholderNote")}</p>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        nativeButton={false}
        render={<a href={DONATE_URL_PLACEHOLDER} target="_blank" rel="noreferrer" />}
      >
        {t("settings.donate.link")}
      </Button>
    </div>
  )
}
