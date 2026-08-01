import { useTranslation } from "@/modules/core/i18n"
import { useTheme } from "@/modules/core/theme"
import type { Theme } from "@/modules/core/theme"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const THEME_LABEL_KEY = {
  light: "settings.theme.light",
  dark: "settings.theme.dark",
  system: "settings.theme.system",
} as const

/** A 3-option picker (Light/Dark/System) driving the app's active theme. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const options = Object.keys(THEME_LABEL_KEY) as Theme[]

  return (
    <Select
      items={options.map((option) => ({ value: option, label: t(THEME_LABEL_KEY[option]) }))}
      value={theme}
      onValueChange={(value) => setTheme(value as Theme)}
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {t(THEME_LABEL_KEY[option])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
