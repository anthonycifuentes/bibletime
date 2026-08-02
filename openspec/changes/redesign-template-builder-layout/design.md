## Context

The template editor page (`apps/bibletime/src/routes/templates/$templateId.tsx`) currently renders a single centered column (`mx-auto max-w-2xl`): a sticky `SlidePreview` on top, then a name `Field`, then `TemplateEditor`'s three stacked `Card`s ("Fondo", "Tipografía", "Espaciado"). `TemplateEditor` (`apps/bibletime/src/modules/presentation/components/template-editor.tsx`) mixes two numeric-control styles: a local plus/minus `Stepper` (font size, line height, letter spacing) and the shared `Slider` (`packages/ui/src/components/slider.tsx`, Base UI-backed) paired with a manual readout span (animated-background params). `TemplateEditor` is also reused, unmodified, inside the Bible console's narrower settings drawer via `TemplateManager`, so any layout change must still work at drawer width.

`packages/ui` already ships `react-resizable-panels` and a `resizable.tsx` wrapper (`ResizablePanelGroup`/`ResizablePanel`/`ResizableHandle`), unused so far — a ready-made primitive for a resizable two-pane split rather than a bespoke flex/grid implementation.

## Goals / Non-Goals

**Goals:**
- Give the template editor page a two-pane console layout: a left options rail (~380px, matching the reference "Background Studio" proportions) with grouped controls, and a right pane where the live `SlidePreview` renders as large as the available space allows.
- Replace every numeric control in the editor (animated-background params, font size, line height, letter spacing) with the new `SliderComfortable` (`variant="scrubber"`) component, each with a label, explicit min/max, and a `formatValue` for its unit — one consistent control instead of `Slider` + `Stepper`.
- Preserve `TemplateEditor`'s existing behavior for the narrower Bible-console drawer context by falling back to the current stacked layout below a width threshold, rather than forcing a cramped two-pane split.

**Non-Goals:**
- Redesigning the visual theme/skin (colors, radii, card chrome) to match the "Background Studio" screenshot pixel-for-pixel — only the pane structure and control style are in scope, using this app's own design tokens.
- Adding new template properties or background types — this only reorganizes and re-renders existing `SlideTemplate` fields.
- Making the two-pane split itself user-resizable/draggable in this change (see Open Questions) — the initial version can ship with a fixed-width rail.
- Changing `TemplateManager`'s card-gallery layout — only the dedicated editor page/`TemplateEditor` panel structure changes.

## Decisions

- **Two-pane split lives in the route component, not inside `TemplateEditor`.** `$templateId.tsx` currently interleaves the preview, the name field, and `TemplateEditor` in one column; the route instead renders a left rail (name field + `TemplateEditor`'s controls, scrollable) and a right pane (`SlidePreview`, centered and sized to fill available space) as siblings. `TemplateEditor` itself is unchanged aside from its control internals — it already only emits its grouped `Card` sections, so it composes into either layout without modification.
- **Implemented as a fixed-width CSS grid column, not `resizable.tsx`/`react-resizable-panels`.** Revised during implementation: a grep of the codebase showed `TemplateEditor` is only ever mounted on this one route (`$templateId.tsx`) — there is no actual narrow-drawer embedding today, `TemplateManager`'s own comment confirms editing always navigates to this dedicated page. Combined with this design's own Non-Goals (drag-resizing explicitly deferred) and the Open Question's fixed-width default, pulling in `react-resizable-panels`' imperative JS sizing for a split that's always fixed-width would be unused complexity. A `grid-cols-[380px_1fr]` column (flipping to a single stacked column via a container-query breakpoint) achieves the same visual result with a single DOM tree and no extra dependency wiring.
- **Narrow-container fallback uses a container query (`@container`) and CSS `order`, not two separately-mounted layouts** — consistent with `TemplateManager`'s existing `@container`/`@sm`/`@3xl` pattern, and avoiding a dual-mount (one hidden via CSS) of `TemplateEditor`/`SlidePreview`, which would otherwise double their side effects (animated-background rendering, file input refs) even while off-screen. The rail and preview are the same two DOM nodes at every width; only `grid-template-columns` and each node's `order` change at the `@4xl` breakpoint.
- **`SliderComfortable` fully replaces `Stepper`**, rather than keeping `Stepper` for the fine-grained font/spacing controls and only using `SliderComfortable` for background params. Rationale: the proposal's explicit goal is one consistent numeric-control style; `Stepper`'s discrete step affordance is subsumed by `SliderComfortable`'s `formatValue` + labeled scrubber, and keeping two styles side-by-side is the exact inconsistency being removed. `Stepper` is deleted from `template-editor.tsx` once its last caller is migrated.
- **`SliderComfortable` is installed into `packages/ui`, not `apps/bibletime` directly** — it's a general-purpose control, added the same way `Slider`, `Button`, etc. already live in the shared `@workspace/ui` package (`packages/ui/components.json` is the shadcn target); this keeps every visual control centralized in one package regardless of which app consumes it.
- **Existing `Slider` (Base UI-backed) is left in place in `packages/ui`**, not removed, since it may have other consumers outside the template editor and removing a shared component is out of scope for a UI layout change.

## Risks / Trade-offs

- [The `fluidfunctionalism.com` registry is a third-party source outside this repo's control; the URL could change or go offline before `shadcn add` is run] → Vendored the generated component files into `packages/ui/src/components/` immediately after installing (git's default behavior for shadcn-added files, now committed as regular source), so the build never re-fetches from that URL again. The CLI's default nested `components/ui/` output path was also flattened to `components/slider-comfortable.tsx` to match this package's existing single-level convention.
- [The vendored file also exports its own generic `Slider`, colliding in name (not in module path) with the existing `@workspace/ui/components/slider` `Slider`] → Only `SliderComfortable` is imported anywhere in this change; the vendored file's own `Slider` export is unused dead code, left as-is rather than hand-edited, consistent with vendoring the generated file unmodified.
- [Deleting `Stepper` entirely is a larger blast radius than swapping only the animated-background `Slider` usage] → Confirmed via grep that `Stepper` had no importers outside `template-editor.tsx` before deleting it.

## Open Questions

_Resolved during implementation: the left rail ships fixed-width (`380px` via CSS grid), not user-resizable — see the revised pane-split decision above._
