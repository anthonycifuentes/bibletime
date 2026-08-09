import { Link } from "@tanstack/react-router"

import { useTranslation } from "@/modules/core/i18n"
import { LanguagePicker } from "@/modules/settings/components/language-picker"
import { ThemePicker } from "@/modules/settings/components/theme-picker"
import { AspectRatioPicker } from "@/modules/settings/components/aspect-ratio-picker"
import { ProjectStoragePanel } from "@/modules/settings/components/project-storage-panel"
import { MediaStoragePanel } from "@/modules/settings/components/media-storage-panel"
import { SystemInfoPanel } from "@/modules/settings/components/system-info-panel"
import { UpdatesPanel } from "@/modules/updates"
import { DonatePanel } from "@/modules/settings/components/donate-panel"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"

/** The Settings module's one and only screen: language, theme, system info, and support/donate. */
export function SettingsView() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link to="/library" />}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          <span className="sr-only">{t("templates.back")}</span>
        </Button>
        <h1 className="text-xl font-bold">{t("sidebar.settings")}</h1>
      </div>

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
          <CardTitle>{t("settings.projectStorage.label")}</CardTitle>
          <CardDescription>{t("settings.projectStorage.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectStoragePanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.media.label")}</CardTitle>
          <CardDescription>{t("settings.media.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MediaStoragePanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.updates.label")}</CardTitle>
          <CardDescription>{t("settings.updates.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatesPanel />
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
