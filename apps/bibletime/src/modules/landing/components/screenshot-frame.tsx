import { HugeiconsIcon } from "@hugeicons/react"
import { Image01Icon } from "@hugeicons/core-free-icons"

import { useTranslation } from "@/modules/core/i18n"
import { cn } from "@workspace/ui/lib/utils"

/**
 * `screen` is the app window's own ratio (1366×1024), so a window
 * screenshot fills its frame exactly and nothing is cropped or
 * letterboxed. `phone` is the tall box a card without a screenshot falls
 * back to: in a one-column cell it lands at about the height a `screen`
 * frame reaches in a two-column one, which is what keeps the bento rows
 * from looking accidental.
 */
const ASPECT_CLASS = {
  phone: "aspect-[4/5]",
  screen: "aspect-[4/3]",
  wide: "aspect-[16/9]",
} as const

interface ScreenshotFrameProps {
  /** `null` until the real screenshot exists — the placeholder takes the same box. */
  src: string | null
  alt: string
  aspect: keyof typeof ASPECT_CLASS
  className?: string
}

/**
 * The image slot of a bento card. The aspect ratio is fixed by the frame,
 * not by the file, so swapping a placeholder for a real screenshot moves
 * nothing on the page.
 *
 * The empty state is chosen from `src` rather than from an `onError`
 * handler: an error fallback would still request a missing file, still log
 * a 404, and couldn't run during SSR at all.
 */
export function ScreenshotFrame({ src, alt, aspect, className }: ScreenshotFrameProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-muted/40",
        ASPECT_CLASS[aspect],
        className
      )}
    >
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="size-full object-cover object-center" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <HugeiconsIcon icon={Image01Icon} strokeWidth={1.5} className="size-6 opacity-60" />
          <span className="px-4 text-center text-xs">{t("landing.screenshotPending")}</span>
        </div>
      )}
    </div>
  )
}
