## 1. Add the `SliderComfortable` control

- [x] 1.1 From `packages/ui`, run `npx shadcn@latest add https://www.fluidfunctionalism.com/r/base/slider.json` to install `SliderComfortable` into `packages/ui/src/components/`.
- [x] 1.2 Verify the installed component's props (label, value, onChange, min, max, formatValue, variant) match the "Comfortable — Scrubber" usage shown in the proposal, and that it composes with this repo's `cn()`/token conventions (adjust styling only if it visibly clashes with existing controls).
- [x] 1.3 Grep the codebase for other importers of `Stepper` (`apps/bibletime/src/modules/presentation/components/template-editor.tsx`) to confirm it has no callers outside this file before it's deleted in section 3.

## 2. Two-pane editor layout

- [x] 2.1 In `apps/bibletime/src/routes/templates/$templateId.tsx`, replace the single `mx-auto max-w-2xl` stacked column (editable path) with a two-pane layout: a left options rail (name field + `TemplateEditor`) and a right pane containing `SlidePreview`, sized to fill available space.
- [x] 2.2 ~~Use `packages/ui/src/components/resizable.tsx`~~ — implemented instead as a fixed-width CSS grid column (`grid-cols-[380px_1fr]`), not `react-resizable-panels`. Reason: `design.md`'s own Non-Goals/Open-Question explicitly deferred drag-resizing to a later change and defaulted to a fixed width, and `TemplateEditor` turned out to have no narrow-drawer embedding today (grep confirmed it's only ever mounted on this one route), so the JS-driven resizable primitive would be unused complexity — a static grid column is simpler and matches the stated default.
- [x] 2.3 Add a container-query-based fallback (`@container`, matching `TemplateManager`'s existing pattern) so the layout stacks preview-above-controls when rendered in a narrow container instead of splitting into two panes. Implemented via a single DOM tree (no duplicate-mounted components) using `@4xl:grid-cols-[380px_1fr]` plus `order-first`/`order-last` flips, so `TemplateEditor`/`SlidePreview` are never mounted twice.
- [x] 2.4 Keep the read-only branch (bundled/non-writable templates) rendering as before — a single preview plus "Duplicar para editar" — since it never shows the options rail.
- [x] 2.5 Verify the header (back button, title, autosave description) and name `Field`/`Input` still render sensibly in the new layout (e.g. as the top of the left rail).

## 3. Migrate `TemplateEditor` controls to `SliderComfortable`

- [x] 3.1 Replace the `Slider` + manual readout used for animated-background numeric params (`template-editor.tsx`, background param loop) with `SliderComfortable` (`variant="scrubber"`), passing the control's existing `label`, `min`, `max`, and a `formatValue` matching its previous `.toFixed(2)` display.
- [x] 3.2 Replace the `Stepper` used for font size with `SliderComfortable`, `min={16}` `max={96}`, `formatValue={(v) => \`${v}px\`}`.
- [x] 3.3 Replace the `Stepper` used for line height with `SliderComfortable`, `min={1}` `max={2.5}`, `formatValue` matching its previous unitless two-decimal display.
- [x] 3.4 Replace the `Stepper` used for letter spacing with `SliderComfortable`, `min={-0.05}` `max={0.3}`, `formatValue={(v) => \`${v}em\`}`.
- [x] 3.5 Delete the now-unused `Stepper` function and its now-unused icon imports (`MinusSignIcon`, `PlusSignIcon`) from `template-editor.tsx`.
- [x] 3.6 Reorganize `TemplateEditor`'s `Card` sections/labels as needed so they read cleanly as a scrollable left-rail column rather than assuming they're a page's only content — no structural change needed; the existing stacked `Card` sections already scroll cleanly inside the new rail container.

## 4. Verify

- [x] 4.1 Run the app and open `/templates/$templateId` for a writable template at full width: confirm the two-pane layout renders, every control uses `SliderComfortable`, and adjusting each control updates the right-pane preview live without scrolling. Verified with a Playwright-driven Chromium session against the Vite dev server (screenshots + a live drag on the "Tamaño" scrubber, 36px → 80px, preview updated immediately, no console errors). Also caught and fixed a real bug this way: the page header was left centered under a stale `mx-auto max-w-2xl`, floating oddly beside the rail instead of sitting flush at the top — corrected to a plain left-aligned header for the two-pane branch.
- [x] 4.2 ~~Open the template editor inside the Bible console's narrow settings drawer~~ — revised per the corrected design.md: `TemplateEditor` has no narrow-drawer embedding (only ever mounted on this route). Instead verified the `@container` narrow-viewport fallback directly by resizing the Playwright viewport to 700px wide: layout correctly stacks preview above controls, single DOM tree (no duplicate mount).
- [x] 4.3 Confirm the read-only (bundled template) branch of `$templateId.tsx` is unaffected. Verified via `/templates/bundled-0`: unchanged centered `max-w-2xl` layout, "Duplicate to edit" button, no console errors.
- [x] 4.4 Run the project's lint/typecheck for `apps/bibletime` and `packages/ui` to catch any leftover references to the removed `Stepper` or mismatched `SliderComfortable` props. Both packages typecheck clean. `apps/bibletime` (all files this change touched) lints clean. `packages/ui` has pre-existing lint debt in untouched files (`button.tsx`, `empty.tsx`, `input.tsx`, `pill.tsx`, `sidebar.tsx`, `tabs.tsx`, `utils.ts` — same errors present before this change) plus 4 `no-unnecessary-condition` errors inside the vendored `slider-comfortable.tsx`'s unused generic `Slider` export (dead code for this change, left unmodified per the vendoring decision in design.md).
