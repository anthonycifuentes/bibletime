import * as React from "react"

export interface AspectRatioOption {
  id: string
  ratio: number
}

/** Common display/output ratios a church console needs — widescreen default, classic 4:3 projectors, and portrait for vertical/social screens. */
export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { id: "16:9", ratio: 16 / 9 },
  { id: "4:3", ratio: 4 / 3 },
  { id: "16:10", ratio: 16 / 10 },
  { id: "21:9", ratio: 21 / 9 },
  { id: "1:1", ratio: 1 },
  { id: "4:5", ratio: 4 / 5 },
  { id: "9:16", ratio: 9 / 16 },
]

export type AspectRatioId = (typeof ASPECT_RATIO_OPTIONS)[number]["id"]

const DEFAULT_ASPECT_RATIO: AspectRatioId = "16:9"
export const ASPECT_RATIO_STORAGE_KEY = "bibletime:aspectRatio"

function isAspectRatioId(value: string): value is AspectRatioId {
  return ASPECT_RATIO_OPTIONS.some((option) => option.id === value)
}

function readStoredAspectRatio(): AspectRatioId {
  if (typeof window === "undefined") return DEFAULT_ASPECT_RATIO
  const stored = window.localStorage.getItem(ASPECT_RATIO_STORAGE_KEY)
  return stored && isAspectRatioId(stored) ? stored : DEFAULT_ASPECT_RATIO
}

function ratioFor(id: AspectRatioId): number {
  return ASPECT_RATIO_OPTIONS.find((option) => option.id === id)?.ratio ?? ratioFor(DEFAULT_ASPECT_RATIO)
}

interface AspectRatioContextValue {
  aspectRatio: AspectRatioId
  setAspectRatio: (id: AspectRatioId) => void
  /** Numeric width/height, ready for a CSS `aspect-ratio` value. */
  ratio: number
}

const AspectRatioContext = React.createContext<AspectRatioContextValue | undefined>(undefined)

export function AspectRatioProvider({ children }: { children: React.ReactNode }) {
  // Starts at the default on every render (server and client), then syncs to
  // the stored value in an effect — same SSR-safety reasoning as ThemeProvider.
  const [aspectRatio, setAspectRatioState] = React.useState<AspectRatioId>(DEFAULT_ASPECT_RATIO)

  React.useEffect(() => {
    setAspectRatioState(readStoredAspectRatio())

    // The output window (`/present`) and the console live in separate
    // BrowserWindows sharing localStorage — this keeps an open output window
    // in sync when the ratio is changed from Settings, mirroring how
    // `useLiveSlide` syncs slide content across the same two windows.
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ASPECT_RATIO_STORAGE_KEY) {
        setAspectRatioState(readStoredAspectRatio())
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const setAspectRatio = React.useCallback((id: AspectRatioId) => {
    setAspectRatioState(id)
    window.localStorage.setItem(ASPECT_RATIO_STORAGE_KEY, id)
  }, [])

  const value = React.useMemo(
    () => ({ aspectRatio, setAspectRatio, ratio: ratioFor(aspectRatio) }),
    [aspectRatio, setAspectRatio]
  )

  return <AspectRatioContext.Provider value={value}>{children}</AspectRatioContext.Provider>
}

export function useAspectRatio(): AspectRatioContextValue {
  const context = React.useContext(AspectRatioContext)
  if (!context) throw new Error("useAspectRatio must be used within an AspectRatioProvider")
  return context
}
