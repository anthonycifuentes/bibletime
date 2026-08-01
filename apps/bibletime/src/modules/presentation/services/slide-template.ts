import type { SlideBackground, SlideTemplate } from "@/modules/presentation/interfaces"

/** Curated backgrounds — no image assets are bundled, so these are solid colors/CSS gradients. */
export const PRESET_BACKGROUNDS: {
  label: string
  background: Extract<SlideBackground, { type: "color" } | { type: "gradient" }>
}[] = [
  { label: "Medianoche", background: { type: "gradient", value: "linear-gradient(160deg, #1b2735, #0a0e14)" } },
  { label: "Carbón", background: { type: "color", value: "#111114" } },
  { label: "Vino", background: { type: "gradient", value: "linear-gradient(160deg, #3a1220, #120508)" } },
  { label: "Bosque", background: { type: "gradient", value: "linear-gradient(160deg, #10261d, #060c09)" } },
  { label: "Ámbar", background: { type: "gradient", value: "linear-gradient(160deg, #3a2410, #120b04)" } },
  { label: "Pizarra", background: { type: "color", value: "#20232b" } },
]

export interface FontRegistryEntry {
  id: string
  label: string
  stack: string
}

const DEFAULT_FONT_ID = "brand"

/**
 * Every font selectable in the template editor: the four generic/system
 * stacks that always work, plus one entry per font family bundled under
 * `packages/fonts/` (see `packages/fonts/bundled/index.css` for the
 * matching `@font-face` rules). Adding a new bundled font only means
 * adding an entry here — `SlideTemplate.fontFamily` is a plain string id,
 * not a closed union, so no type change is needed.
 */
export const FONT_REGISTRY: FontRegistryEntry[] = [
  { id: "brand", label: "Predeterminada", stack: "var(--font-sans)" },
  { id: "serif", label: "Serif", stack: 'Georgia, "Times New Roman", serif' },
  { id: "mono", label: "Monoespaciada", stack: 'ui-monospace, "SFMono-Regular", Menlo, monospace' },
  { id: "system", label: "Sans del sistema", stack: "system-ui, -apple-system, sans-serif" },
  { id: "cinzel", label: "Cinzel", stack: '"Cinzel", serif' },
  { id: "germania-one", label: "Germania One", stack: '"Germania One", sans-serif' },
  { id: "limelight", label: "Limelight", stack: '"Limelight", sans-serif' },
  { id: "manufacturing-consent", label: "Manufacturing Consent", stack: '"Manufacturing Consent", sans-serif' },
  { id: "mea-culpa", label: "Mea Culpa", stack: '"Mea Culpa", cursive' },
  { id: "petit-formal-script", label: "Petit Formal Script", stack: '"Petit Formal Script", cursive' },
  { id: "smokum", label: "Smokum", stack: '"Smokum", cursive' },
  { id: "geist", label: "Geist", stack: '"Geist", sans-serif' },
  { id: "quicksand", label: "Quicksand", stack: '"Quicksand", sans-serif' },
  { id: "roboto", label: "Roboto", stack: '"Roboto", sans-serif' },
]

export const isKnownFontId = (id: unknown): id is string =>
  typeof id === "string" && FONT_REGISTRY.some((entry) => entry.id === id)

/** The CSS font stack for a registry id, falling back to the default font for an unknown id. */
export const getFontStack = (fontFamily: string): string =>
  FONT_REGISTRY.find((entry) => entry.id === fontFamily)?.stack ??
  FONT_REGISTRY.find((entry) => entry.id === DEFAULT_FONT_ID)!.stack

/** The starting point for any newly created template. */
export const DEFAULT_SLIDE_TEMPLATE: SlideTemplate = {
  background: PRESET_BACKGROUNDS[0].background,
  fontFamily: DEFAULT_FONT_ID,
  fontColor: "#FFFFFF",
  fontSize: 36,
  bold: true,
  italic: false,
  underline: false,
  underlineColor: "#FFFFFF",
  textAlign: "center",
  lineHeight: 1.3,
  letterSpacing: 0,
  textAnimation: false,
}
