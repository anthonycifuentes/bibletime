import type { ComponentType } from "react"

import { DarkVeilBackground } from "@/modules/presentation/components/backgrounds/dark-veil-background"
import { SilkBackground } from "@/modules/presentation/components/backgrounds/silk-background"

export type AnimatedBackgroundControl =
  | { key: string; label: string; type: "number"; min: number; max: number; step: number; default: number }
  | { key: string; label: string; type: "color"; default: string }

export interface AnimatedBackgroundPreset {
  id: string
  label: string
  Component: ComponentType<Record<string, number | string>>
  controls: AnimatedBackgroundControl[]
}

/**
 * Every animated background selectable in the template editor. A small,
 * curated set vendored from React Bits (see `components/backgrounds/`) —
 * not the whole catalog. Each preset exposes only the controls worth
 * surfacing; every other prop the underlying component supports keeps its
 * (subtle) default.
 */
export const ANIMATED_BACKGROUND_REGISTRY: AnimatedBackgroundPreset[] = [
  {
    id: "silk",
    label: "Seda",
    Component: SilkBackground as ComponentType<Record<string, number | string>>,
    controls: [
      { key: "speed", label: "Velocidad", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
      { key: "scale", label: "Escala", type: "number", min: 0.2, max: 3, step: 0.1, default: 1 },
      { key: "color", label: "Color", type: "color", default: "#7B7481" },
      { key: "noiseIntensity", label: "Intensidad de ruido", type: "number", min: 0, max: 3, step: 0.1, default: 1.5 },
      { key: "rotation", label: "Rotación", type: "number", min: -1, max: 1, step: 0.05, default: 0 },
    ],
  },
  {
    id: "dark-veil",
    label: "Velo",
    Component: DarkVeilBackground as ComponentType<Record<string, number | string>>,
    controls: [
      { key: "speed", label: "Velocidad", type: "number", min: 0, max: 2, step: 0.05, default: 0.5 },
      { key: "hueShift", label: "Tono", type: "number", min: -180, max: 180, step: 1, default: 0 },
      { key: "noiseIntensity", label: "Intensidad de ruido", type: "number", min: 0, max: 1, step: 0.01, default: 0 },
    ],
  },
]

/** Looks up a preset by id, returning `undefined` for one that isn't registered (e.g. removed since a template was saved). */
export const getAnimatedPreset = (presetId: string): AnimatedBackgroundPreset | undefined =>
  ANIMATED_BACKGROUND_REGISTRY.find((preset) => preset.id === presetId)

/** The default `params` bag for a preset — one entry per control, at that control's default value. */
export const getDefaultAnimatedParams = (preset: AnimatedBackgroundPreset): Record<string, number | string> =>
  Object.fromEntries(preset.controls.map((control) => [control.key, control.default]))
