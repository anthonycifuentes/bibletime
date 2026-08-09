import { formatElapsed } from "@/modules/library/lib/slideshow-timer"
import { useTranslation } from "@/modules/core/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  FullScreenIcon,
  PauseIcon,
  PlayIcon,
  Presentation01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"

interface ControlBarProps {
  currentPosition: number
  total: number
  isFirst: boolean
  isLast: boolean
  /** What the operator has typed so far toward a jump, shown in place of the position while non-empty. */
  jumpBuffer: string
  elapsed: number
  isTimerRunning: boolean
  /** Re-read on the timer's own interval, so the clock stays live without a second interval. */
  now: number
  blank: "black" | "white" | null
  onPrevious: () => void
  onNext: () => void
  onToggleTimer: () => void
  onResetTimer: () => void
  onToggleBlank: (color: "black" | "white") => void
  onReopenOutput: () => void
  onToggleFullscreen: () => void
  onExit: () => void
}

/**
 * The strip under the current slide: where you are, how long you have been
 * going, and the handful of things worth doing with a pointer when the
 * keyboard is not to hand.
 *
 * Every action here has a keystroke too (see the view's binding table). The
 * bar exists because an operator borrowing someone else's laptop mid-service
 * has no way to know the bindings, and because `Esc` is ambiguous in
 * fullscreen — Exit has to be visible and unconditional.
 */
export function ControlBar({
  currentPosition,
  total,
  isFirst,
  isLast,
  jumpBuffer,
  elapsed,
  isTimerRunning,
  now,
  blank,
  onPrevious,
  onNext,
  onToggleTimer,
  onResetTimer,
  onToggleBlank,
  onReopenOutput,
  onToggleFullscreen,
  onExit,
}: ControlBarProps) {
  const { t, locale } = useTranslation()

  const clock = new Date(now).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={isFirst}
          onClick={onPrevious}
          className="text-white/70 hover:text-white"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          <span className="sr-only">{t("slideshow.previous")}</span>
        </Button>

        {/* Shows the pending jump instead of the position while typing, so a
            typed number is visible before Enter commits it. */}
        <span className="min-w-20 text-center text-sm tabular-nums text-white/80">
          {jumpBuffer !== ""
            ? t("slideshow.jumpPending", { buffer: jumpBuffer })
            : t("slideshow.position", { current: currentPosition, total })}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={isLast}
          onClick={onNext}
          className="text-white/70 hover:text-white"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          <span className="sr-only">{t("slideshow.next")}</span>
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm tabular-nums text-white/80">{formatElapsed(elapsed)}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggleTimer}
          className="text-white/60 hover:text-white"
        >
          <HugeiconsIcon icon={isTimerRunning ? PauseIcon : PlayIcon} strokeWidth={2} />
          <span className="sr-only">
            {isTimerRunning ? t("slideshow.pauseTimer") : t("slideshow.resumeTimer")}
          </span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onResetTimer}
          className="text-white/60 hover:text-white"
        >
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
          <span className="sr-only">{t("slideshow.resetTimer")}</span>
        </Button>
      </div>

      <span className="text-sm tabular-nums text-white/50">{clock}</span>

      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onToggleBlank("black")}
          className={cn(
            "text-white/70 hover:text-white",
            blank === "black" && "bg-white/15 text-white"
          )}
        >
          {t("slideshow.black")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onToggleBlank("white")}
          className={cn(
            "text-white/70 hover:text-white",
            blank === "white" && "bg-white/15 text-white"
          )}
        >
          {t("slideshow.white")}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onReopenOutput}
          className="text-white/60 hover:text-white"
        >
          <HugeiconsIcon icon={Presentation01Icon} strokeWidth={2} />
          <span className="sr-only">{t("slideshow.reopenOutput")}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggleFullscreen}
          className="text-white/60 hover:text-white"
        >
          <HugeiconsIcon icon={FullScreenIcon} strokeWidth={2} />
          <span className="sr-only">{t("slideshow.fullscreen")}</span>
        </Button>

        <Button type="button" variant="ghost" size="sm" onClick={onExit} className="text-white/70 hover:text-white">
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          {t("slideshow.exit")}
        </Button>
      </div>
    </div>
  )
}
