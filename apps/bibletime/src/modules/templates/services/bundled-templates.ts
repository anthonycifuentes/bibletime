import { DEFAULT_SLIDE_TEMPLATE } from "@/modules/presentation"
import type { SavedTemplate } from "@/modules/templates/interfaces"

/**
 * The template gallery's built-in entries — always available, never
 * editable directly (duplicate one to get an editable copy). The two
 * high-contrast basics (Negro/Blanco) plus the gradients from
 * `modules/presentation/assets/backgrounds` (FeralUI reference CSS),
 * simplified to a single `linear-gradient`/`radial-gradient` value each —
 * our `SlideBackground` type has no layered/pseudo-element backgrounds, so
 * the grain/blur overlays those files add on top aren't reproduced here.
 * `id`s are stable (`bundled-*`) so a desktop library can list these
 * alongside the user's own saved templates without id collisions.
 */
export const BUNDLED_TEMPLATES: SavedTemplate[] = [
  {
    id: "bundled-0",
    name: "Negro",
    template: {
      ...DEFAULT_SLIDE_TEMPLATE,
      background: { type: "color", value: "#000000" },
      fontColor: "#FFFFFF",
      fontSize: 48,
    },
    updatedAt: 0,
  },
  {
    id: "bundled-1",
    name: "Blanco",
    template: {
      ...DEFAULT_SLIDE_TEMPLATE,
      background: { type: "color", value: "#FFFFFF" },
      fontColor: "#000000",
      fontSize: 48,
    },
    updatedAt: 0,
  },
  {
    id: "bundled-8",
    name: "Cielo Hanada",
    template: {
      ...DEFAULT_SLIDE_TEMPLATE,
      background: {
        type: "gradient",
        value:
          "radial-gradient(circle closest-side at 50% 50%, oklch(55.9% 0.1335 242.3) 0.0%, oklch(57.5% 0.1296 242.0) 7.8%, oklch(61.6% 0.1201 240.8) 15.6%, oklch(67.3% 0.1059 238.6) 23.4%, oklch(73.6% 0.0915 235.0) 31.2%, oklch(79.3% 0.0780 231.5) 39.0%, oklch(83.6% 0.0689 226.5) 46.8%, oklch(85.1% 0.0657 225.2) 54.6%, oklch(85.8% 0.0633 225.0) 62.4%, oklch(87.4% 0.0560 225.8) 70.1%, oklch(89.5% 0.0452 227.4) 77.9%, oklch(91.9% 0.0343 230.2) 85.7%, oklch(94.1% 0.0251 233.0) 93.5%, oklch(95.5% 0.0176 240.0) 101.3%, oklch(96.2% 0.0151 241.8) 109.1%)",
      },
      fontColor: "#000000",
      fontSize: 48,
    },
    updatedAt: 0,
  },
  {
    id: "bundled-9",
    name: "Jardín Oxidado",
    template: {
      ...DEFAULT_SLIDE_TEMPLATE,
      background: {
        type: "gradient",
        value:
          "radial-gradient(circle closest-side at 50% 50%, oklch(51.8% 0.0441 140.4) 0.0%, oklch(53.4% 0.0412 138.9) 15.6%, oklch(57.5% 0.0382 133.2) 31.2%, oklch(63.3% 0.0337 125.5) 46.8%, oklch(69.4% 0.0286 114.1) 62.4%, oklch(75.1% 0.0267 99.6) 77.9%, oklch(79.1% 0.0252 85.8) 93.5%, oklch(80.7% 0.0255 83.4) 109.1%)",
      },
      fontColor: "#FFFFFF",
      fontSize: 48,
    },
    updatedAt: 0,
  },
]
