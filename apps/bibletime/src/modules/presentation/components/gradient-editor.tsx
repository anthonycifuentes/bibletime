import * as React from "react"

import type {
  GradientKind,
  GradientSpec,
  GradientStop,
  RgbaColor,
  SlideBackground,
} from "@/modules/presentation/interfaces"
import {
  DEFAULT_GRADIENT_SPEC,
  GRADIENT_PRESETS,
  applyGradientSpec,
  clampStopPosition,
  interpolateStops,
  parseCssGradient,
  toCssGradient,
  wrapAngle,
} from "@/modules/presentation/services"
import { useTranslation } from "@/modules/core/i18n"
import { Button } from "@workspace/ui/components/button"
import { ColorPicker } from "@workspace/ui/components/color-picker"
import { Input } from "@workspace/ui/components/input"
import { useCommittedField } from "@workspace/ui/hooks/use-committed-field"
import { usePointerDrag } from "@workspace/ui/hooks/use-pointer-drag"
import { hexToRgba, rgbaToCss, rgbaToHex } from "@workspace/ui/lib/color"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

interface GradientEditorProps {
  background: Extract<SlideBackground, { type: "gradient" }>
  onChange: (background: SlideBackground) => void
}

const MINIMUM_STOPS = 2

const byPosition = (a: GradientStop, b: GradientStop): number => a.position - b.position

/**
 * The gradient generator: a live preview strip over a draggable stop track,
 * a linear/radial toggle with an angle dial, preset starting points, a color
 * picker bound to the selected stop, and one editable row per stop.
 *
 * It reads its spec from `background.spec` when there is one and otherwise
 * seeds a local one — parsed from the stored CSS where that's possible, the
 * default otherwise. That seed is deliberately never emitted on its own:
 * opening a template whose gradient predates the generator must not count as
 * an edit, or every bundled template would light up the Save button just for
 * being looked at.
 */
export function GradientEditor({ background, onChange }: GradientEditorProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = React.useState(0)

  const seeded = React.useMemo(
    () => parseCssGradient(background.value) ?? DEFAULT_GRADIENT_SPEC,
    [background.value]
  )
  const spec = background.spec ?? seeded

  // Mirrors the rendered spec so that two mutations inside one pointer event
  // — inserting a stop on press, then dragging it before React re-renders —
  // build on each other instead of the second overwriting the first.
  const specRef = React.useRef(spec)
  specRef.current = spec

  const commit = React.useCallback(
    (next: GradientSpec) => {
      specRef.current = next
      onChange(applyGradientSpec(next))
    },
    [onChange]
  )

  const updateStop = React.useCallback(
    (index: number, patch: Partial<GradientStop>) => {
      const current = specRef.current
      commit({
        ...current,
        stops: current.stops.map((stop, at) => (at === index ? { ...stop, ...patch } : stop)),
      })
    },
    [commit]
  )

  const removeStop = (index: number) => {
    const current = specRef.current
    if (current.stops.length <= MINIMUM_STOPS) return
    commit({ ...current, stops: current.stops.filter((_, at) => at !== index) })
    // The removed index no longer addresses anything; fall back to its neighbour.
    setSelected((previous) =>
      previous > index ? previous - 1 : Math.min(previous, current.stops.length - 2)
    )
  }

  /** Appends an interpolated stop and returns its index, so a press can start dragging it immediately. */
  const insertStopAt = (position: number): number => {
    const current = specRef.current
    const sorted = [...current.stops].sort(byPosition)
    const after = sorted.find((stop) => stop.position >= position) ?? sorted[sorted.length - 1]
    const before =
      [...sorted].reverse().find((stop) => stop.position <= position) ?? sorted[0]

    commit({
      ...current,
      stops: [...current.stops, { color: interpolateStops(before, after, position), position }],
    })
    return current.stops.length
  }

  const draggingStop = React.useRef<number | null>(null)

  const track = usePointerDrag({
    onStart: (point, event) => {
      const handle = (event.target as HTMLElement).closest<HTMLElement>("[data-stop-index]")

      if (handle) {
        const index = Number(handle.dataset.stopIndex)
        draggingStop.current = index
        setSelected(index)
        // `usePointerDrag` preventDefaults the press to stop text selection,
        // which also suppresses the focus a click would normally give the
        // handle — and the handle has to stay keyboard reachable.
        handle.focus()
        return
      }

      const index = insertStopAt(clampStopPosition(point.x * 100))
      draggingStop.current = index
      setSelected(index)
    },
    onDrag: (point) => {
      if (draggingStop.current === null) return
      updateStop(draggingStop.current, { position: clampStopPosition(point.x * 100) })
    },
  })

  const dial = usePointerDrag({
    onDrag: (point) => {
      const x = point.x - 0.5
      const y = point.y - 0.5
      if (x === 0 && y === 0) return
      // CSS gradient angles start pointing up and grow clockwise, which is
      // what `atan2(x, -y)` gives directly.
      commit({ ...specRef.current, angle: wrapAngle((Math.atan2(x, -y) * 180) / Math.PI) })
    },
  })

  const stopsInOrder = spec.stops
    .map((stop, index) => ({ stop, index }))
    .sort((a, b) => byPosition(a.stop, b.stop))
  // Guards against a stale selection surviving a preset swap onto a shorter stop list.
  const selectedIndex = selected < spec.stops.length ? selected : 0
  const selectedStop = spec.stops[selectedIndex]
  const canRemove = spec.stops.length > MINIMUM_STOPS
  const css = toCssGradient(spec)

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-3">
      <div
        aria-label={t("templates.gradient.preview")}
        className="h-20 w-full rounded-md ring-1 ring-border"
        style={{ backgroundImage: css }}
      />

      <div
        aria-label={t("templates.gradient.track")}
        className="relative h-7 w-full cursor-copy touch-none rounded-md ring-1 ring-border"
        style={{ backgroundImage: css }}
        {...track}
      >
        {spec.stops.map((stop, index) => (
          <div
            key={index}
            data-stop-index={index}
            role="slider"
            tabIndex={0}
            aria-label={t("templates.gradient.stopHandle", {
              index: index + 1,
              position: stop.position,
            })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stop.position}
            onKeyDown={(event) => {
              const step =
                event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0
              if (step === 0) return
              event.preventDefault()
              updateStop(index, { position: clampStopPosition(stop.position + step) })
            }}
            className={cn(
              "absolute top-1/2 h-6 w-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)] outline-none",
              index === selectedIndex && "ring-2 ring-ring ring-offset-1 ring-offset-background",
              "focus-visible:ring-2 focus-visible:ring-ring"
            )}
            style={{ left: `${stop.position}%`, backgroundColor: rgbaToCss(stop.color) }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div
          role="group"
          aria-label={t("templates.gradient.kind")}
          className="flex items-center gap-1"
        >
          {(["linear", "radial"] satisfies GradientKind[]).map((kind) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant={spec.kind === kind ? "default" : "outline"}
              aria-pressed={spec.kind === kind}
              onClick={() => commit({ ...spec, kind })}
            >
              {t(kind === "linear" ? "templates.gradient.linear" : "templates.gradient.radial")}
            </Button>
          ))}
        </div>

        {spec.kind === "linear" ? (
          <div className="flex items-center gap-2">
            <div
              aria-label={t("templates.gradient.angleDial")}
              className="relative size-9 shrink-0 cursor-grab touch-none rounded-full border border-input"
              {...dial}
            >
              <span
                className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
                style={{
                  left: `${50 + 32 * Math.sin((spec.angle * Math.PI) / 180)}%`,
                  top: `${50 - 32 * Math.cos((spec.angle * Math.PI) / 180)}%`,
                }}
              />
            </div>
            <AngleField
              label={t("templates.gradient.angle")}
              value={spec.angle}
              onCommit={(angle) => commit({ ...spec, angle })}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {t("templates.gradient.presets")}
        </span>
        <div className="grid grid-cols-6 gap-2">
          {GRADIENT_PRESETS.map((preset, index) => (
            <button
              key={index}
              type="button"
              aria-label={t("templates.gradient.presetLabel", { index: index + 1 })}
              onClick={() => {
                commit(preset)
                setSelected(0)
              }}
              className="aspect-square rounded-md ring-1 ring-border transition-all hover:ring-2 hover:ring-ring"
              style={{ backgroundImage: toCssGradient(preset) }}
            />
          ))}
        </div>
      </div>

      <ColorPicker
        value={selectedStop.color}
        onChange={(color) => updateStop(selectedIndex, { color })}
        labels={{
          saturationValue: t("templates.gradient.color.saturationValue"),
          hue: t("templates.gradient.color.hue"),
          alpha: t("templates.gradient.color.alpha"),
          hex: t("templates.gradient.color.hex"),
          red: t("templates.gradient.color.red"),
          green: t("templates.gradient.color.green"),
          blue: t("templates.gradient.color.blue"),
          alphaChannel: t("templates.gradient.color.alphaChannel"),
        }}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {t("templates.gradient.stops")}
        </span>
        {stopsInOrder.map(({ stop, index }) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 rounded-md p-1",
              index === selectedIndex && "bg-muted"
            )}
          >
            <button
              type="button"
              aria-label={t("templates.gradient.stopColor", { index: index + 1 })}
              onClick={() => setSelected(index)}
              className={cn(
                "size-8 shrink-0 rounded-md ring-1 ring-border",
                index === selectedIndex && "ring-2 ring-ring"
              )}
              style={{ backgroundColor: rgbaToCss(stop.color) }}
            />
            <HexField
              label={t("templates.gradient.stopColor", { index: index + 1 })}
              color={stop.color}
              onCommit={(color) => updateStop(index, { color })}
            />
            <PositionField
              label={t("templates.gradient.stopPosition", { index: index + 1 })}
              value={stop.position}
              onCommit={(position) => updateStop(index, { position })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canRemove}
              onClick={() => removeStop(index)}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              <span className="sr-only">
                {t("templates.gradient.removeStop", { index: index + 1 })}
              </span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function HexField({
  label,
  color,
  onCommit,
}: {
  label: string
  color: RgbaColor
  onCommit: (color: RgbaColor) => void
}) {
  const field = useCommittedField(rgbaToHex(color), (raw) => {
    const parsed = hexToRgba(raw)
    // Alpha lives in the picker's own slider, so a 6-digit entry here must
    // not silently reset a stop that was made translucent on purpose.
    if (parsed) onCommit({ ...parsed, a: raw.trim().replace("#", "").length === 8 ? parsed.a : color.a })
  })

  return (
    <Input
      aria-label={label}
      spellCheck={false}
      className="h-8 rounded-lg px-2 text-xs"
      {...field}
    />
  )
}

function PositionField({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (value: number) => void
}) {
  const field = useCommittedField(String(value), (raw) => {
    const parsed = Number(raw.trim())
    if (raw.trim() === "" || Number.isNaN(parsed)) return
    onCommit(clampStopPosition(parsed))
  })

  return (
    <Input
      aria-label={label}
      inputMode="numeric"
      className="h-8 w-16 shrink-0 rounded-lg px-2 text-center text-xs"
      {...field}
    />
  )
}

function AngleField({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (value: number) => void
}) {
  const field = useCommittedField(String(value), (raw) => {
    const parsed = Number(raw.trim())
    if (raw.trim() === "" || Number.isNaN(parsed)) return
    onCommit(wrapAngle(parsed))
  })

  return (
    <Input
      aria-label={label}
      inputMode="numeric"
      className="h-9 w-16 shrink-0 rounded-lg px-2 text-center text-sm"
      {...field}
    />
  )
}
