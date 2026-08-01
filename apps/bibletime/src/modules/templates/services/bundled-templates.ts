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
    },
    updatedAt: 0,
  },
  {
    id: "bundled-2",
    name: "Perla",
    template: {
      ...DEFAULT_SLIDE_TEMPLATE,
      background: {
        type: "gradient",
        value:
          "linear-gradient(135deg in oklab, oklch(96.2% 0.0151 241.8) 10.0%, oklch(81.8% 0.0340 351.3) 30.0%, oklch(84.4% 0.0552 204.8) 50.0%, oklch(91.8% 0.1115 97.6) 70.0%, oklch(70.5% 0.0975 309.4) 90.0%)",
      },
      fontColor: "#000000",
    },
    updatedAt: 0,
  },
  {
    id: "bundled-3",
    name: "Nube Iridiscente",
    template: {
      ...DEFAULT_SLIDE_TEMPLATE,
      background: {
        type: "gradient",
        value:
          "linear-gradient(135deg in oklab, oklch(96.2% 0.0151 241.8) 12.5%, oklch(44.6% 0.1434 259.9) 37.5%, oklch(75.7% 0.1152 14.7) 62.5%, oklch(53.8% 0.0898 326.0) 87.5%)",
      },
      fontColor: "#000000",
    },
    updatedAt: 0,
  },
  {
    id: "bundled-4",
    name: "Aceite",
    template: {
      ...DEFAULT_SLIDE_TEMPLATE,
      background: {
        type: "gradient",
        value:
          "linear-gradient(135deg in oklab, oklch(23.8% 0.0589 276.8) 10.0%, oklch(55.9% 0.1335 242.3) 30.0%, oklch(65.2% 0.1112 204.1) 50.0%, oklch(49.2% 0.1102 328.3) 70.0%, oklch(91.8% 0.1115 97.6) 90.0%)",
      },
      fontColor: "#FFFFFF",
    },
    updatedAt: 0,
  },
  {
    id: "bundled-5",
    name: "Fotografía Antigua",
    template: {
      ...DEFAULT_SLIDE_TEMPLATE,
      background: {
        type: "gradient",
        value:
          "linear-gradient(135deg in oklab, oklch(96.6% 0.0190 93.7) 12.5%, oklch(83.4% 0.0360 77.0) 37.5%, oklch(59.4% 0.0878 51.9) 62.5%, oklch(44.9% 0.0163 78.1) 87.5%)",
      },
      fontColor: "#000000",
    },
    updatedAt: 0,
  },
  {
    id: "bundled-6",
    name: "Tostado",
    template: {
      ...DEFAULT_SLIDE_TEMPLATE,
      background: {
        type: "gradient",
        value:
          "linear-gradient(135deg in oklab, oklch(96.1% 0.0468 88.3) 12.5%, oklch(81.4% 0.1678 81.7) 37.5%, oklch(68.2% 0.1703 40.2) 62.5%, oklch(49.4% 0.1296 21.9) 87.5%)",
      },
      fontColor: "#000000",
    },
    updatedAt: 0,
  },
  {
    id: "bundled-7",
    name: "Atardecer",
    template: {
      ...DEFAULT_SLIDE_TEMPLATE,
      background: {
        type: "gradient",
        value:
          "linear-gradient(135deg in oklab, oklch(96.1% 0.0468 88.3) 12.5%, oklch(75.7% 0.1152 14.7) 37.5%, oklch(69.6% 0.1757 53.4) 62.5%, oklch(49.2% 0.1102 328.3) 87.5%)",
      },
      fontColor: "#000000",
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
      fontColor: "#FFFFFF",
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
    },
    updatedAt: 0,
  },
]
