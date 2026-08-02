## Why

The template editor (`/templates/$templateId`) currently stacks the live slide preview above a single, centered `max-w-2xl` column of setting cards, so on any normal-width screen the preview is small relative to the available space and every property change requires scrolling past unrelated sections to compare against the slide. Numeric properties also mix two different control styles (a plus/minus `Stepper` for font metrics, a bare `Slider` + number readout for animated-background params), which reads as inconsistent. Restructuring into a two-pane console — controls on the left, a large live preview on the right — mirrors the "Background Studio" reference layout the user pointed to and makes editing feel closer to a proper design tool: the slide is always big and visible while adjusting nearby controls, not scrolled off above the fold.

## What Changes

- Restructure `/templates/$templateId` from a single stacked column into a two-pane console: a fixed-width options rail on the left (background type, canvas/background color, and all numeric/style controls, grouped in sections) and a large live `SlidePreview` filling the remaining space on the right, so the slide stays fully visible while adjusting any control.
- Add `npx shadcn@latest add https://www.fluidfunctionalism.com/r/base/slider.json` to `packages/ui` and adopt the resulting `SliderComfortable` (`variant="scrubber"`) component as the single, consistent control for every numeric property in the editor — animated-background params (speed, scale, noise intensity, rotation, etc.), font size, line height, and letter spacing — each with an explicit label, min/max, and a `formatValue` matching its unit (`px`, `em`, `%`, or unitless). This replaces both the existing plain `Slider` usage and the `Stepper` plus/minus control in `template-editor.tsx`, so numeric editing has one visual language instead of two.
- Keep the color inputs, background-type selector, font family/style/alignment toggles, and "Restablecer plantilla" action in the left rail, reorganized under clear section headings so the rail reads top-to-bottom the same way the reference layout groups "Background → Canvas BG → sliders → Reset/Share/Export".
- On narrow viewports/windows, fall back to the existing stacked layout (preview above controls) rather than forcing a two-pane split into too little width.

## Capabilities

### New Capabilities
- `template-editor-layout`: The two-pane structure of the template editor page — a left options rail of grouped controls and a right live-preview pane that fills the remaining space, plus the narrow-viewport fallback to a stacked layout.
- `template-editor-controls`: The numeric control used throughout the template editor's options rail — a single `SliderComfortable` (scrubber variant) component with label, min/max, and formatted value display, replacing the previous mixed `Slider`/`Stepper` controls.

### Modified Capabilities
_None — no existing specs in this project yet; both capabilities above are new._

## Impact

- `apps/bibletime/src/routes/templates/$templateId.tsx` — replace the single `max-w-2xl` stacked column with a two-pane layout (left options rail / right preview); keep the name `Field`/`Input` and back/duplicate actions, relocating them into the new layout.
- `apps/bibletime/src/modules/presentation/components/template-editor.tsx` — restructure the `Card` sections into the left rail's grouped controls; replace the `Stepper` component and existing `Slider` usage with `SliderComfortable` for every numeric property (background params, font size, line height, letter spacing); remove `Stepper` once unused.
- `packages/ui/` — run `npx shadcn@latest add https://www.fluidfunctionalism.com/r/base/slider.json` (from `packages/ui`, where `components.json` lives) to add the `SliderComfortable` component into `packages/ui/src/components/`, importable from `apps/bibletime` as `@workspace/ui/components/<file>` — the same direct per-file import pattern already used for `Slider`, `Button`, etc. (no shared barrel exists to update).
- `apps/bibletime/src/modules/presentation/index.ts` — export any new left-rail/preview-pane subcomponents introduced for the two-pane layout, following the module's existing barrel-export convention.
- Existing `Slider` (`packages/ui/src/components/slider.tsx`, Base UI-backed) stays in place for any other consumer outside the template editor; this change does not remove it from the shared package, only from `template-editor.tsx`'s usage.
