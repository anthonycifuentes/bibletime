/**
 * Color model and conversions shared by the color picker and anything that
 * needs to serialize a color to CSS.
 *
 * RGBA is the canonical, storable form; HSV exists only to drive the picker's
 * saturation/value square and hue slider and is always derived on demand,
 * never persisted — the round trip is lossy at the extremes (pure black has
 * no meaningful hue or saturation), so a stored HSV would let the square's
 * thumb drift away from the color it represents.
 */

export interface RgbaColor {
  /** 0–255 */
  r: number
  /** 0–255 */
  g: number
  /** 0–255 */
  b: number
  /** 0–100, as a percentage — not the 0–1 alpha CSS itself uses. */
  a: number
}

export interface HsvColor {
  /** 0–360 */
  h: number
  /** 0–100 */
  s: number
  /** 0–100 */
  v: number
}

export const clampChannel = (value: number): number =>
  Math.min(255, Math.max(0, Math.round(value)))

export const clampAlpha = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

const HEX_PATTERN = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/**
 * Parses 3-, 6-, or 8-digit hex with an optional leading `#`, returning
 * `null` for anything else so callers can leave a half-typed value alone
 * instead of committing a color the user didn't mean.
 */
export const hexToRgba = (input: string): RgbaColor | null => {
  const trimmed = input.trim()
  if (!HEX_PATTERN.test(trimmed)) return null

  const hex = trimmed.replace("#", "")
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((character) => character + character)
          .join("")
      : hex

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
    a:
      expanded.length === 8
        ? Math.round((parseInt(expanded.slice(6, 8), 16) / 255) * 100)
        : 100,
  }
}

const toHexPair = (value: number): string =>
  clampChannel(value).toString(16).padStart(2, "0").toUpperCase()

/** The opaque `#RRGGBB` form — alpha rides in its own field rather than in the hex. */
export const rgbaToHex = (color: RgbaColor): string =>
  `#${toHexPair(color.r)}${toHexPair(color.g)}${toHexPair(color.b)}`

/** Hex while fully opaque, `rgb(r g b / a%)` once translucent, so the common case stays readable. */
export const rgbaToCss = (color: RgbaColor): string =>
  color.a >= 100
    ? rgbaToHex(color)
    : `rgb(${clampChannel(color.r)} ${clampChannel(color.g)} ${clampChannel(color.b)} / ${clampAlpha(color.a)}%)`

export const rgbToHsv = ({ r, g, b }: RgbaColor): HsvColor => {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let hue = 0
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6
    else if (max === green) hue = (blue - red) / delta + 2
    else hue = (red - green) / delta + 4
    hue *= 60
    if (hue < 0) hue += 360
  }

  return { h: hue, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 }
}

export const hsvToRgb = ({ h, s, v }: HsvColor, alpha: number): RgbaColor => {
  const saturation = Math.min(100, Math.max(0, s)) / 100
  const value = Math.min(100, Math.max(0, v)) / 100
  const chroma = value * saturation
  const sector = ((((h % 360) + 360) % 360) / 60) % 6
  const secondary = chroma * (1 - Math.abs((sector % 2) - 1))

  const rgb: [number, number, number] =
    sector < 1
      ? [chroma, secondary, 0]
      : sector < 2
        ? [secondary, chroma, 0]
        : sector < 3
          ? [0, chroma, secondary]
          : sector < 4
            ? [0, secondary, chroma]
            : sector < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary]

  const offset = value - chroma
  return {
    r: clampChannel((rgb[0] + offset) * 255),
    g: clampChannel((rgb[1] + offset) * 255),
    b: clampChannel((rgb[2] + offset) * 255),
    a: clampAlpha(alpha),
  }
}

/** Channel-wise linear blend, with `ratio` clamped to 0–1. */
export const mixRgba = (from: RgbaColor, to: RgbaColor, ratio: number): RgbaColor => {
  const amount = Math.min(1, Math.max(0, ratio))
  return {
    r: clampChannel(from.r + (to.r - from.r) * amount),
    g: clampChannel(from.g + (to.g - from.g) * amount),
    b: clampChannel(from.b + (to.b - from.b) * amount),
    a: clampAlpha(from.a + (to.a - from.a) * amount),
  }
}
