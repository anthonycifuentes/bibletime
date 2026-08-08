import type { ComponentType } from "react"

import { AuroraBackground } from "@/modules/presentation/components/backgrounds/aurora-background"
import { BeamsBackground } from "@/modules/presentation/components/backgrounds/beams-background"
import { DarkVeilBackground } from "@/modules/presentation/components/backgrounds/dark-veil-background"
import { DitherBackground } from "@/modules/presentation/components/backgrounds/dither-background"
import { GrainientBackground } from "@/modules/presentation/components/backgrounds/grainient-background"
import { SilkBackground } from "@/modules/presentation/components/backgrounds/silk-background"
import { SoftAuroraBackground } from "@/modules/presentation/components/backgrounds/soft-aurora-background"
import { WavesBackground } from "@/modules/presentation/components/backgrounds/waves-background"

export type AnimatedBackgroundControl =
  | { key: string; label: string; type: "number"; min: number; max: number; step: number; default: number }
  | { key: string; label: string; type: "color"; default: string }
  | { key: string; label: string; type: "boolean"; default: boolean }

export interface AnimatedBackgroundPreset {
  id: string
  label: string
  Component: ComponentType<Record<string, number | string | boolean>>
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
    Component: SilkBackground as ComponentType<Record<string, number | string | boolean>>,
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
    Component: DarkVeilBackground as ComponentType<Record<string, number | string | boolean>>,
    controls: [
      { key: "hueShift", label: "Tono", type: "number", min: -180, max: 180, step: 1, default: 0 },
      { key: "noiseIntensity", label: "Intensidad de ruido", type: "number", min: 0, max: 1, step: 0.01, default: 0 },
      { key: "scanlineIntensity", label: "Intensidad de escaneo", type: "number", min: 0, max: 1, step: 0.01, default: 0 },
      { key: "speed", label: "Velocidad", type: "number", min: 0, max: 2, step: 0.05, default: 0.5 },
      { key: "scanlineFrequency", label: "Frecuencia de escaneo", type: "number", min: 0, max: 50, step: 1, default: 0 },
      { key: "warpAmount", label: "Distorsión", type: "number", min: 0, max: 1, step: 0.01, default: 0 },
      { key: "resolutionScale", label: "Resolución", type: "number", min: 0.25, max: 1, step: 0.05, default: 1 },
    ],
  },
  {
    id: "aurora",
    label: "Aurora",
    Component: AuroraBackground as ComponentType<Record<string, number | string | boolean>>,
    controls: [
      { key: "colorStop1", label: "Color 1", type: "color", default: "#3a1c71" },
      { key: "colorStop2", label: "Color 2", type: "color", default: "#d76d77" },
      { key: "colorStop3", label: "Color 3", type: "color", default: "#ffaf7b" },
      { key: "amplitude", label: "Amplitud", type: "number", min: 0, max: 2, step: 0.05, default: 1 },
      { key: "blend", label: "Mezcla", type: "number", min: 0, max: 1, step: 0.05, default: 0.5 },
    ],
  },
  {
    id: "beams",
    label: "Rayos",
    Component: BeamsBackground as ComponentType<Record<string, number | string | boolean>>,
    controls: [
      { key: "beamWidth", label: "Ancho de rayo", type: "number", min: 0.5, max: 5, step: 0.1, default: 2 },
      { key: "beamHeight", label: "Alto de rayo", type: "number", min: 5, max: 30, step: 1, default: 15 },
      { key: "beamNumber", label: "Número de rayos", type: "number", min: 1, max: 30, step: 1, default: 12 },
      { key: "lightColor", label: "Color de luz", type: "color", default: "#ffffff" },
      { key: "speed", label: "Velocidad", type: "number", min: 0, max: 5, step: 0.1, default: 2 },
      { key: "noiseIntensity", label: "Intensidad de ruido", type: "number", min: 0, max: 3, step: 0.05, default: 1.75 },
      { key: "scale", label: "Escala", type: "number", min: 0.05, max: 1, step: 0.01, default: 0.2 },
      { key: "rotation", label: "Rotación", type: "number", min: -180, max: 180, step: 1, default: 0 },
    ],
  },
  {
    id: "dither",
    label: "Punteado",
    Component: DitherBackground as ComponentType<Record<string, number | string | boolean>>,
    controls: [
      { key: "color", label: "Color", type: "color", default: "#5226ff" },
      { key: "disableAnimation", label: "Desactivar animación", type: "boolean", default: false },
      { key: "mouseInteraction", label: "Interacción del mouse", type: "boolean", default: true },
      { key: "mouseRadius", label: "Radio del mouse", type: "number", min: 0, max: 3, step: 0.05, default: 1 },
      { key: "colorNum", label: "Número de colores", type: "number", min: 2, max: 16, step: 1, default: 4 },
      { key: "pixelSize", label: "Tamaño de píxel", type: "number", min: 1, max: 10, step: 1, default: 2 },
      { key: "waveAmplitude", label: "Amplitud de onda", type: "number", min: 0, max: 1, step: 0.01, default: 0.3 },
      { key: "waveFrequency", label: "Frecuencia de onda", type: "number", min: 0, max: 10, step: 0.1, default: 3 },
      { key: "waveSpeed", label: "Velocidad de onda", type: "number", min: 0, max: 1, step: 0.01, default: 0.05 },
    ],
  },
  {
    id: "grainient",
    label: "Grainient",
    Component: GrainientBackground as ComponentType<Record<string, number | string | boolean>>,
    controls: [
      { key: "color1", label: "Color 1", type: "color", default: "#ff9ffc" },
      { key: "color2", label: "Color 2", type: "color", default: "#5227ff" },
      { key: "color3", label: "Color 3", type: "color", default: "#b497cf" },
      { key: "timeSpeed", label: "Velocidad", type: "number", min: 0, max: 2, step: 0.01, default: 0.25 },
      { key: "colorBalance", label: "Balance de color", type: "number", min: -1, max: 1, step: 0.01, default: 0 },
      { key: "warpStrength", label: "Fuerza de distorsión", type: "number", min: 0, max: 3, step: 0.05, default: 1 },
      { key: "warpFrequency", label: "Frecuencia de distorsión", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
      { key: "warpSpeed", label: "Velocidad de distorsión", type: "number", min: 0, max: 5, step: 0.1, default: 2 },
      { key: "warpAmplitude", label: "Amplitud de distorsión", type: "number", min: 0, max: 200, step: 1, default: 50 },
      { key: "blendAngle", label: "Ángulo de mezcla", type: "number", min: -180, max: 180, step: 1, default: 0 },
      { key: "blendSoftness", label: "Suavidad de mezcla", type: "number", min: 0.01, max: 0.5, step: 0.01, default: 0.05 },
      { key: "rotationAmount", label: "Rotación", type: "number", min: 0, max: 1000, step: 10, default: 500 },
      { key: "noiseScale", label: "Escala de ruido", type: "number", min: 0.1, max: 10, step: 0.1, default: 2 },
      { key: "grainAmount", label: "Cantidad de grano", type: "number", min: 0, max: 0.5, step: 0.01, default: 0.1 },
      { key: "grainScale", label: "Escala de grano", type: "number", min: 0.5, max: 10, step: 0.1, default: 2 },
      { key: "grainAnimated", label: "Grano animado", type: "boolean", default: false },
      { key: "contrast", label: "Contraste", type: "number", min: 0.5, max: 3, step: 0.05, default: 1.5 },
      { key: "gamma", label: "Gamma", type: "number", min: 0.2, max: 3, step: 0.05, default: 1 },
      { key: "saturation", label: "Saturación", type: "number", min: 0, max: 2, step: 0.05, default: 1 },
    ],
  },
  {
    id: "soft-aurora",
    label: "Aurora Suave",
    Component: SoftAuroraBackground as ComponentType<Record<string, number | string | boolean>>,
    controls: [
      { key: "speed", label: "Velocidad", type: "number", min: 0, max: 3, step: 0.05, default: 0.6 },
      { key: "scale", label: "Escala", type: "number", min: 0.5, max: 3, step: 0.05, default: 1.5 },
      { key: "brightness", label: "Brillo", type: "number", min: 0, max: 2, step: 0.05, default: 1 },
      { key: "color1", label: "Color 1", type: "color", default: "#f7f7f7" },
      { key: "color2", label: "Color 2", type: "color", default: "#e100ff" },
      { key: "noiseFrequency", label: "Frecuencia de ruido", type: "number", min: 0, max: 5, step: 0.05, default: 2.5 },
      { key: "noiseAmplitude", label: "Amplitud de ruido", type: "number", min: 0, max: 2, step: 0.05, default: 1 },
      { key: "bandHeight", label: "Alto de banda", type: "number", min: 0.05, max: 1, step: 0.01, default: 0.5 },
      { key: "bandSpread", label: "Dispersión de banda", type: "number", min: 0, max: 2, step: 0.01, default: 1 },
      { key: "octaveDecay", label: "Decaimiento de octava", type: "number", min: 0, max: 1, step: 0.01, default: 0.1 },
      { key: "layerOffset", label: "Desfase de capa", type: "number", min: 0, max: 2, step: 0.01, default: 0 },
      { key: "colorSpeed", label: "Velocidad de color", type: "number", min: 0, max: 3, step: 0.05, default: 1 },
      { key: "mouseInteraction", label: "Interacción del mouse", type: "boolean", default: true },
      { key: "mouseInfluence", label: "Influencia del mouse", type: "number", min: 0, max: 1, step: 0.01, default: 0.25 },
    ],
  },
  {
    id: "waves",
    label: "Olas",
    Component: WavesBackground as ComponentType<Record<string, number | string | boolean>>,
    controls: [
      { key: "lineColor", label: "Color de línea", type: "color", default: "#5227ff" },
      { key: "backgroundColor", label: "Color de fondo", type: "color", default: "#000000" },
      { key: "waveSpeedX", label: "Velocidad de onda X", type: "number", min: 0, max: 0.2, step: 0.01, default: 0.02 },
      { key: "waveSpeedY", label: "Velocidad de onda Y", type: "number", min: 0, max: 0.2, step: 0.01, default: 0.01 },
      { key: "waveAmplitudeX", label: "Amplitud de onda X", type: "number", min: 0, max: 100, step: 1, default: 40 },
      { key: "waveAmplitudeY", label: "Amplitud de onda Y", type: "number", min: 0, max: 100, step: 1, default: 20 },
      { key: "friction", label: "Fricción", type: "number", min: 0.5, max: 0.99, step: 0.01, default: 0.9 },
      { key: "tension", label: "Tensión", type: "number", min: 0, max: 0.1, step: 0.001, default: 0.01 },
      { key: "maxCursorMove", label: "Movimiento máximo", type: "number", min: 0, max: 300, step: 1, default: 120 },
      { key: "xGap", label: "Espacio X", type: "number", min: 4, max: 60, step: 1, default: 12 },
      { key: "yGap", label: "Espacio Y", type: "number", min: 4, max: 80, step: 1, default: 36 },
    ],
  },
]

/** Looks up a preset by id, returning `undefined` for one that isn't registered (e.g. removed since a template was saved). */
export const getAnimatedPreset = (presetId: string): AnimatedBackgroundPreset | undefined =>
  ANIMATED_BACKGROUND_REGISTRY.find((preset) => preset.id === presetId)

/** The default `params` bag for a preset — one entry per control, at that control's default value. */
export const getDefaultAnimatedParams = (preset: AnimatedBackgroundPreset): Record<string, number | string | boolean> =>
  Object.fromEntries(preset.controls.map((control) => [control.key, control.default]))
