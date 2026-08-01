import * as React from "react"

export type Theme = "light" | "dark" | "system"

const THEME_STORAGE_KEY = "bibletime:theme"

function isTheme(value: string): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return stored && isTheme(stored) ? stored : "system"
}

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
}

function applyResolvedTheme(theme: Theme) {
  const isDark = theme === "dark" || (theme === "system" && prefersDark())
  document.documentElement.classList.toggle("dark", isDark)
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts at "system" on every render (server and client) — the actual
  // stored preference is read in an effect below, same SSR-safety reasoning
  // as LocaleProvider. The class itself is already set before paint by the
  // blocking inline script in __root.tsx's head, so there's no visual flash
  // even though this state starts at "system".
  const [theme, setThemeState] = React.useState<Theme>("system")

  React.useEffect(() => {
    setThemeState(readStoredTheme())
  }, [])

  React.useEffect(() => {
    applyResolvedTheme(theme)

    if (theme !== "system") return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => applyResolvedTheme("system")
    media.addEventListener("change", handleChange)
    return () => media.removeEventListener("change", handleChange)
  }, [theme])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    window.localStorage.setItem(THEME_STORAGE_KEY, next)
  }, [])

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
