import { useEffect, useState } from "react"

import type { LiveSlidePayload } from "@/modules/library/interfaces"
import { getLiveSlide, LIVE_SLIDE_STORAGE_KEY } from "@/modules/library/services"

/**
 * Reader side, for the `/present` output window: starts from whatever was
 * last sent to output and stays in sync via `storage` events fired whenever
 * the main console window sends a new slide.
 */
export const useLiveSlide = (): LiveSlidePayload | null => {
  const [slide, setSlide] = useState<LiveSlidePayload | null>(null)

  useEffect(() => {
    setSlide(getLiveSlide())

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LIVE_SLIDE_STORAGE_KEY) {
        setSlide(getLiveSlide())
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  return slide
}
