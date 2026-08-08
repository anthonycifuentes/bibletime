"use client"

import * as React from "react"

import { Input } from "@workspace/ui/components/input"
import { useCommittedField } from "@workspace/ui/hooks/use-committed-field"
import { usePointerDrag } from "@workspace/ui/hooks/use-pointer-drag"
import type { RgbaColor } from "@workspace/ui/lib/color"
import {
  clampAlpha,
  clampChannel,
  hexToRgba,
  hsvToRgb,
  rgbToHsv,
  rgbaToHex,
} from "@workspace/ui/lib/color"
import { cn } from "@workspace/ui/lib/utils"

export interface ColorPickerLabels {
  saturationValue: string
  hue: string
  alpha: string
  hex: string
  red: string
  green: string
  blue: string
  alphaChannel: string
}

/** English fallbacks — `packages/ui` carries no dictionary, so a localized host passes its own. */
const DEFAULT_LABELS: ColorPickerLabels = {
  saturationValue: "Saturation and brightness",
  hue: "Hue",
  alpha: "Opacity",
  hex: "Hex color",
  red: "Red",
  green: "Green",
  blue: "Blue",
  alphaChannel: "Alpha",
}

export interface ColorPickerProps {
  value: RgbaColor
  onChange: (value: RgbaColor) => void
  labels?: Partial<ColorPickerLabels>
  className?: string
}

/** A translucent color needs something behind it to read as translucent. */
const CHECKERBOARD: React.CSSProperties = {
  backgroundImage:
    "conic-gradient(from 90deg, rgb(0 0 0 / 0.12) 25%, transparent 0 50%, rgb(0 0 0 / 0.12) 0 75%, transparent 0)",
  backgroundSize: "8px 8px",
}

const HUE_TRACK =
  "linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)"

interface PickerSliderProps {
  label: string
  value: number
  max: number
  trackStyle: React.CSSProperties
  /** Painted under `trackStyle`, for the alpha slider's checkerboard. */
  trackUnderlayStyle?: React.CSSProperties
  onChange: (value: number) => void
}

function PickerSlider({
  label,
  value,
  max,
  trackStyle,
  trackUnderlayStyle,
  onChange,
}: PickerSliderProps) {
  const drag = usePointerDrag({ onDrag: (point) => onChange(point.x * max) })

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : 0
    if (step === 0) return
    event.preventDefault()
    onChange(Math.min(max, Math.max(0, value + step)))
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      onKeyDown={handleKeyDown}
      className="relative h-4 w-full cursor-pointer touch-none rounded-full ring-1 ring-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={trackUnderlayStyle}
      {...drag}
    >
      <div className="absolute inset-0 rounded-full" style={trackStyle} />
      <div
        className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
        style={{ left: `${(value / max) * 100}%` }}
      />
    </div>
  )
}

interface ChannelFieldProps {
  label: string
  value: number
  max: number
  onCommit: (value: number) => void
}

function ChannelField({ label, value, max, onCommit }: ChannelFieldProps) {
  const field = useCommittedField(String(value), (raw) => {
    const parsed = Number(raw.trim())
    if (raw.trim() === "" || Number.isNaN(parsed)) return
    onCommit(Math.min(max, Math.max(0, Math.round(parsed))))
  })

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <Input
        inputMode="numeric"
        aria-label={label}
        className="h-8 rounded-lg px-2 text-center text-xs"
        {...field}
      />
    </label>
  )
}

/**
 * A controlled color picker: saturation/value square, hue and alpha sliders,
 * and hex plus R/G/B/A fields, all editing one RGBA value.
 *
 * RGBA is the value it takes and emits; HSV is derived per render purely to
 * drive the square and hue slider. The one piece of state it keeps is the
 * in-progress hue — pure black and pure white have no hue to read back, so
 * without holding it the square's thumb would snap to red the moment a drag
 * crossed either edge.
 */
export function ColorPicker({ value, onChange, labels, className }: ColorPickerProps) {
  const text = { ...DEFAULT_LABELS, ...labels }

  const derived = rgbToHsv(value)
  const hueRef = React.useRef(derived.h)
  if (derived.s > 0 && derived.v > 0) hueRef.current = derived.h
  const hsv = { h: hueRef.current, s: derived.s, v: derived.v }

  const emitHsv = (next: Partial<typeof hsv>) =>
    onChange(hsvToRgb({ ...hsv, ...next }, value.a))

  const square = usePointerDrag({
    onDrag: (point) => emitHsv({ s: point.x * 100, v: (1 - point.y) * 100 }),
  })

  const handleSquareKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const delta: Record<string, [number, number] | undefined> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, 1],
      ArrowDown: [0, -1],
    }
    const step = delta[event.key]
    if (!step) return
    event.preventDefault()
    emitHsv({
      s: Math.min(100, Math.max(0, hsv.s + step[0])),
      v: Math.min(100, Math.max(0, hsv.v + step[1])),
    })
  }

  const hex = rgbaToHex(value)
  const opaqueCss = `rgb(${value.r} ${value.g} ${value.b})`

  const hexField = useCommittedField(hex, (raw) => {
    const parsed = hexToRgba(raw)
    if (parsed) onChange(parsed)
  })

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        tabIndex={0}
        aria-label={text.saturationValue}
        onKeyDown={handleSquareKeyDown}
        className="relative h-40 w-full cursor-crosshair touch-none overflow-hidden rounded-lg ring-1 ring-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          backgroundImage:
            "linear-gradient(to top, #000000, transparent), linear-gradient(to right, #FFFFFF, transparent)",
          backgroundColor: `hsl(${hsv.h} 100% 50%)`,
        }}
        {...square}
      >
        <div
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            backgroundColor: opaqueCss,
          }}
        />
      </div>

      <PickerSlider
        label={text.hue}
        value={hsv.h}
        max={360}
        trackStyle={{ backgroundImage: HUE_TRACK }}
        onChange={(hue) => emitHsv({ h: hue })}
      />

      <PickerSlider
        label={text.alpha}
        value={value.a}
        max={100}
        trackUnderlayStyle={CHECKERBOARD}
        trackStyle={{
          backgroundImage: `linear-gradient(to right, transparent, ${opaqueCss})`,
        }}
        onChange={(alpha) => onChange({ ...value, a: clampAlpha(alpha) })}
      />

      <div className="grid grid-cols-[1.6fr_repeat(4,1fr)] gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            {text.hex}
          </span>
          <Input
            aria-label={text.hex}
            spellCheck={false}
            className="h-8 rounded-lg px-2 text-xs"
            {...hexField}
          />
        </label>
        <ChannelField
          label={text.red}
          value={value.r}
          max={255}
          onCommit={(channel) => onChange({ ...value, r: clampChannel(channel) })}
        />
        <ChannelField
          label={text.green}
          value={value.g}
          max={255}
          onCommit={(channel) => onChange({ ...value, g: clampChannel(channel) })}
        />
        <ChannelField
          label={text.blue}
          value={value.b}
          max={255}
          onCommit={(channel) => onChange({ ...value, b: clampChannel(channel) })}
        />
        <ChannelField
          label={text.alphaChannel}
          value={value.a}
          max={100}
          onCommit={(alpha) => onChange({ ...value, a: clampAlpha(alpha) })}
        />
      </div>
    </div>
  )
}
