## Why

A slide's look is currently owned entirely by the template it points at. A `FolderItem` carries only `templateId` (`modules/library/interfaces/index.ts`), and `resolveFolderItemContent` resolves that to a `SavedTemplate`'s `SlideTemplate` — or `DEFAULT_SLIDE_TEMPLATE` — with no room for anything slide-specific. So the only way to make *one* slide bigger, or a different font, or a different text color, is to create a whole new saved template for it and apply that template to that slide. A service plan where three verses each need a slightly different treatment ends up with three throwaway templates cluttering the gallery, and the operator has to leave the console, go to `/templates/new`, name a template they don't want, come back, and apply it.

Separately, the font-size control in the template editor is capped at `max={96}` (`modules/presentation/components/template-editor.tsx:424`). Font sizes are authored against a 1920px-wide reference canvas (`REFERENCE_WIDTH` in `hooks/use-slide-fit.ts`), so 96px is a fairly modest line of text on a projector — too small for a short title slide or a single emphasized word, and there is no way to go past it.

## What Changes

- Add a **per-slide style override**: a `FolderItem` can carry its own partial style on top of whichever template it points at. Only the fields the user actually touched are stored, so the slide keeps following its template for everything else — and editing that template later still flows through to the slide's untouched fields.
- Add an **"Editar estilo"** action, reachable the three ways a slide is already actioned: the slide card's right-click context menu, the sidebar folder tree's slide context menu, and the slide console's "three-dot" overflow menu (which acts on the current selection). It opens a dialog over the console with a live preview of that slide beside the existing `TemplateEditor` controls — background/color, font family, font size, text style, alignment, and spacing — with explicit **Guardar** / **Cancelar**, plus a **Restablecer** that clears the override and returns the slide to its template's look. Nothing is written until Guardar, and nothing creates or modifies a saved template.
- Extend the overflow menu's action to a multi-slide selection: with more than one slide selected, "Editar estilo" seeds from the last-selected slide and writes the same override to every selected slide — the same shape as the existing "Aplicar plantilla" bulk action.
- Raise the font-size control's maximum from **96 to 800** (in reference-canvas pixels), in the one place it is defined, so the new range applies to both the template editor and the new per-slide dialog. Existing auto-fit behavior (`useAutoFitFontScale`) is unchanged and still shrinks anything that would overflow its box.
- Per-slide overrides ride along with everything a project already carries: they are stored inside `Folder.items`, so project autosave, `ProjectFile` export/import, and the `/present` payload all pick them up with no schema-version bump.

Not included, and deliberately: a per-slide **aspect ratio / portrait-landscape** override. "Orientation" was confirmed with the user to mean the text alignment already present in the editor; the slide's shape stays a single app-wide setting (`AspectRatioProvider`).

## Capabilities

### New Capabilities
- `slide-style-override`: A single slide's own style, layered over the template it points at — what an override stores, how it merges at render time, how it is edited (the "Editar estilo" entry points and dialog, explicit save/cancel/reset), how it interacts with applying a template afterward, and how it persists and travels with a project.
- `template-font-size-range`: The bounds of the font-size control shared by the template editor and the per-slide style dialog, and its relationship to the reference canvas and auto-fit.

### Modified Capabilities
_None — this project has no specs in `openspec/specs/` yet, so both capabilities above are new._

## Impact

- `apps/bibletime/src/modules/library/interfaces/index.ts` — `FolderItemOf` gains an optional `templateOverride?: Partial<SlideTemplate>` alongside `templateId`.
- `apps/bibletime/src/modules/library/lib/resolve-folder-item-content.ts` — merges the override over the resolved base template; the single place every surface (card, preview panel, `/present`) inherits the behavior from.
- `apps/bibletime/src/modules/library/actions/use-library.ts` — a new `applyStyleOverrideToItems` (patch or clear) mirroring the existing `applyTemplateToItems`; `applyTemplateToItems` itself needs a decision on whether applying a template clears an existing override.
- `apps/bibletime/src/modules/library/components/slide-style-dialog.tsx` *(new)* — the dialog: live `SlidePreview` beside `TemplateEditor`, draft state, Guardar/Cancelar/Restablecer.
- `apps/bibletime/src/modules/library/components/slide-card.tsx` — "Editar estilo" context-menu item and an `onEditStyle` prop.
- `apps/bibletime/src/modules/library/components/folder-tree.tsx` — the same item on a tree slide's context menu, plus an `onEditItemStyle` prop.
- `apps/bibletime/src/modules/library/components/slide-console.tsx` — an `edit-style` entry in the `OverflowActions` bulk menu, and hosting the dialog next to the existing `TemplatePickerDialog`.
- `apps/bibletime/src/modules/library/views/console-view.tsx` — wires the new callbacks to `library.applyStyleOverrideToItems`, and opens the dialog for a tree-originated slide (whose folder may not be the open one).
- `apps/bibletime/src/modules/presentation/components/template-editor.tsx` — the font-size slider's `max` moves from a literal `96` to a shared constant; a `showBackgroundVideo`-style affordance is *not* needed, but the editor gains no per-slide-specific branching either (it stays a pure `SlideTemplate` editor).
- `apps/bibletime/src/modules/presentation/services/slide-template.ts` — new `MIN_FONT_SIZE` / `MAX_FONT_SIZE` constants (16 / 800), exported through `modules/presentation`.
- `apps/bibletime/src/modules/presentation/services/normalize-slide-template.ts` — a sibling normalizer for a *partial* override (drop unknown font ids and unrenderable backgrounds without filling in defaults), so an override read from an old/foreign project file can't produce a broken slide.
- `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts` — new strings for the menu item, dialog title/description, and Guardar/Cancelar/Restablecer.
- Not modified, but confirmed unaffected: `modules/templates/**` (no template is created, updated, or deleted by any of this), `ProjectFile.schemaVersion` (overrides live inside `Folder.items`, already serialized), and `AspectRatioProvider` (slide shape stays global).
