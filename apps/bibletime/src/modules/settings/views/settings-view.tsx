import { useTranslation } from "@/modules/core/i18n"
import { LanguagePicker } from "@/modules/settings/components/language-picker"
import { ThemePicker } from "@/modules/settings/components/theme-picker"
import { AspectRatioPicker } from "@/modules/settings/components/aspect-ratio-picker"
import { SystemInfoPanel } from "@/modules/settings/components/system-info-panel"
import { DonatePanel } from "@/modules/settings/components/donate-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

/** The Settings module's one and only screen: language, theme, system info, and support/donate. */
export function SettingsView() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-xl font-bold">{t("sidebar.settings")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language.label")}</CardTitle>
          <CardDescription>{t("settings.language.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguagePicker />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.theme.label")}</CardTitle>
          <CardDescription>{t("settings.theme.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePicker />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.aspectRatio.label")}</CardTitle>
          <CardDescription>{t("settings.aspectRatio.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AspectRatioPicker />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.systemInfo.label")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SystemInfoPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.donate.label")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DonatePanel />
        </CardContent>
      </Card>
    </div>
  )
}
