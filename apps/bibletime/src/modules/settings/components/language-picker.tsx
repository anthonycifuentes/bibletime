import { useTranslation } from "@/modules/core/i18n"
import type { Locale } from "@/modules/core/i18n"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const LOCALE_LABEL_KEY = {
  en: "settings.language.en",
  es: "settings.language.es",
  pt: "settings.language.pt",
} as const

/** A 3-option picker (English/Spanish/Portuguese) driving the app's active UI locale. */
export function LanguagePicker() {
  const { locale, setLocale, t } = useTranslation()
  const options = Object.keys(LOCALE_LABEL_KEY) as Locale[]

  return (
    <Select
      items={options.map((option) => ({ value: option, label: t(LOCALE_LABEL_KEY[option]) }))}
      value={locale}
      onValueChange={(value) => setLocale(value as Locale)}
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {t(LOCALE_LABEL_KEY[option])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
