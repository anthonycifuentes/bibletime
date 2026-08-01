import * as React from "react"

import { en } from "@/modules/core/i18n/dictionaries/en"
import { es } from "@/modules/core/i18n/dictionaries/es"
import { pt } from "@/modules/core/i18n/dictionaries/pt"

export type Locale = "en" | "es" | "pt"
export type TranslationKey = keyof typeof en

const LOCALE_STORAGE_KEY = "bibletime:locale"
const SUPPORTED_LOCALES: Locale[] = ["en", "es", "pt"]

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { en, es, pt }

function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as string[]).includes(value)
}

/** Matches the browser/OS language against the supported locales, falling back to English. */
function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en"
  const language = navigator.language.split("-")[0]
  return language && isLocale(language) ? language : "en"
}

function readStoredLocale(): Locale | undefined {
  if (typeof window === "undefined") return undefined
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return stored && isLocale(stored) ? stored : undefined
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const LocaleContext = React.createContext<LocaleContextValue | undefined>(undefined)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Starts at "en" on every render (server and client) so hydration never
  // mismatches on text content, then resolves the real stored/detected
  // locale once mounted on the client (a brief one-time flash to the actual
  // locale, same trade-off accepted for the theme flash — see design.md).
  const [locale, setLocaleState] = React.useState<Locale>("en")

  React.useEffect(() => {
    const resolved = readStoredLocale() ?? detectLocale()
    if (resolved !== "en") setLocaleState(resolved)
  }, [])

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next)
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
  }, [])

  const t = React.useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      const template = DICTIONARIES[locale][key]
      if (!params) return template
      return template.replace(/{{(\w+)}}/g, (match, paramName) =>
        paramName in params ? String(params[paramName]) : match
      )
    },
    [locale]
  )

  const value = React.useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useTranslation(): LocaleContextValue {
  const context = React.useContext(LocaleContext)
  if (!context) throw new Error("useTranslation must be used within a LocaleProvider")
  return context
}
