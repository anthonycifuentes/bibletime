import type {
  GradientSpec,
  GradientStop,
  RgbaColor,
  SlideBackground,
} from "@/modules/presentation/interfaces"
import { hexToRgba, mixRgba, rgbaToCss } from "@workspace/ui/lib/color"

/** Stop positions are whole percentages — the arrow-key step, the position field, and the serialized CSS all agree on that granularity. */
export const clampStopPosition = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

/** Degrees wrap rather than clamp, so typing `450` lands on `90` instead of pinning to the maximum. */
export const wrapAngle = (value: number): number =>
  ((Math.round(value) % 360) + 360) % 360

const byPosition = (a: GradientStop, b: GradientStop): number => a.position - b.position

/**
 * Serializes a spec to CSS deterministically — the same spec always yields
 * the same string. Stops are emitted in ascending position order without
 * reordering the spec's own array, so a stop dragged past its neighbour
 * keeps its identity (and the row the user is editing) while still painting
 * correctly.
 */
export const toCssGradient = (spec: GradientSpec): string => {
  const stops = [...spec.stops]
    .sort(byPosition)
    .map((stop) => `${rgbaToCss(stop.color)} ${clampStopPosition(stop.position)}%`)
    .join(", ")

  return spec.kind === "radial"
    ? `radial-gradient(circle at 50% 50%, ${stops})`
    : `linear-gradient(${wrapAngle(spec.angle)}deg, ${stops})`
}

const LINEAR_PATTERN = /^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(.+)\)$/i
const STOP_PATTERN = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|#[0-9a-f]{8})(?:\s+(-?\d+(?:\.\d+)?)%)?$/i

/**
 * Reads back the narrow `linear-gradient(<angle>deg, <hex> [<pos>%], …)`
 * shape — which is exactly what `PRESET_BACKGROUNDS` holds — so picking a
 * preset swatch and then opening the generator round-trips.
 *
 * Deliberately refuses everything else (the bundled `oklch()` gradients,
 * anything with a nested function or a named color) rather than guessing:
 * a wrong-but-plausible spec would silently rewrite the user's gradient on
 * their first edit, whereas returning `null` just means the generator seeds
 * from the default and leaves the stored value alone.
 */
export const parseCssGradient = (value: string): GradientSpec | null => {
  const match = LINEAR_PATTERN.exec(value.trim())
  if (!match) return null

  const parts = match[2].split(",").map((part) => part.trim())
  if (parts.length < 2) return null

  const stops: GradientStop[] = []
  for (const [index, part] of parts.entries()) {
    const stopMatch = STOP_PATTERN.exec(part)
    if (!stopMatch) return null

    const color = hexToRgba(stopMatch[1])
    if (!color) return null

    stops.push({
      color,
      // Absent positions spread evenly, which is how CSS itself reads them.
      position: clampStopPosition(
        stopMatch[2] !== undefined ? Number(stopMatch[2]) : (index / (parts.length - 1)) * 100
      ),
    })
  }

  return { kind: "linear", angle: wrapAngle(Number(match[1])), stops }
}

/** Builds a stop from a literal hex — every call site below passes a valid one, so the fallback is unreachable and only exists to satisfy the nullable parse. */
const stop = (hex: string, position: number): GradientStop => ({
  color: hexToRgba(hex) ?? { r: 0, g: 0, b: 0, a: 100 },
  position,
})

/**
 * Matches the app's default background ("Medianoche"), so switching a
 * freshly created template to a gradient doesn't jolt the slide to an
 * unrelated color before the user has chosen anything.
 */
export const DEFAULT_GRADIENT_SPEC: GradientSpec = {
  kind: "linear",
  angle: 160,
  stops: [stop("#1B2735", 0), stop("#0A0E14", 100)],
}

/** Starting points for the generator's swatch row — applied as specs, so they stay fully editable afterwards. */
export const GRADIENT_PRESETS: GradientSpec[] = [
  {
    kind: "linear",
    angle: 90,
    stops: [stop("#2A7B9B", 0), stop("#57C785", 50), stop("#EDDD53", 100)],
  },
  {
    kind: "linear",
    angle: 135,
    stops: [stop("#06081F", 0), stop("#0B1A6B", 55), stop("#2B5CE6", 100)],
  },
  {
    kind: "linear",
    angle: 45,
    stops: [stop("#2AB7A9", 0), stop("#7FC98A", 50), stop("#E8B84B", 100)],
  },
  {
    kind: "radial",
    angle: 90,
    stops: [stop("#3A5BD9", 0), stop("#C13F86", 55), stop("#E0457B", 100)],
  },
  {
    kind: "linear",
    angle: 45,
    stops: [stop("#FF3B2F", 0), stop("#8B2FA8", 55), stop("#4B2AE0", 100)],
  },
  {
    kind: "radial",
    angle: 90,
    stops: [stop("#F0B8C8", 0), stop("#C6BEE4", 50), stop("#A8B8E8", 100)],
  },
]

/** The color a stop inserted at `position` takes, so splitting a gradient looks like a split rather than a reset. */
export const interpolateStops = (
  before: GradientStop,
  after: GradientStop,
  position: number
): RgbaColor => {
  const span = after.position - before.position
  return mixRgba(
    before.color,
    after.color,
    span === 0 ? 0 : (position - before.position) / span
  )
}

/**
 * The single writer for gradient backgrounds — always emitting `value` and
 * `spec` together is what keeps the two from drifting apart, since nothing
 * else constructs one.
 */
export const applyGradientSpec = (spec: GradientSpec): SlideBackground => ({
  type: "gradient",
  value: toCssGradient(spec),
  spec,
})
