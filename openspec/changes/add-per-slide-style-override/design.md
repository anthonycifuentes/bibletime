## Context

Every surface that renders a slide — the console grid's `SlideCard`, the right-hand `PreviewPanel`, and the `/present` output window — converges on one resolution step: `resolveFolderItemContent(item, templates)` (`modules/library/lib/resolve-folder-item-content.ts`), which does exactly one thing for style:

```ts
const template = templates.find((saved) => saved.id === item.templateId)?.template ?? DEFAULT_SLIDE_TEMPLATE
```

A `FolderItem` therefore has no representation for "this slide looks slightly different." The user's only workaround today is to create a saved template per one-off slide, which pollutes the template gallery and forces a trip out of the console to `/templates/new` and back.

The pieces needed to fix this already exist and are reusable as-is:

- `TemplateEditor` (`modules/presentation/components/template-editor.tsx`) is already a pure, controlled editor over a `SlideTemplate`: `{ template, onChange(patch: Partial<SlideTemplate>), onReset, canUseVideoBackground }`. Its `onChange` already emits exactly the *partial* shape an override needs.
- `/templates/$templateId.tsx` already demonstrates the local-draft + explicit-Save pattern (from `slide-text-fit-and-explicit-save`), including a preview beside the controls — the dialog can follow the same model without inventing one.
- The bulk-selection plumbing for "apply this to the selected slides" exists as `applyTemplateToItems` in `use-library.ts`, threaded through `SlideConsole`'s `OverflowActions` and `TemplatePickerDialog`. The style dialog can reuse that path's shape.
- Persistence needs nothing new: overrides live inside `Folder.items`, which `LibraryStorageDriver`, project autosave, and `ProjectFile` already serialize wholesale.

The font-size cap is a single literal: `max={96}` at `template-editor.tsx:424`. Font sizes are interpreted against `REFERENCE_WIDTH = 1920` (`hooks/use-slide-fit.ts`), and `useAutoFitFontScale` already shrinks text that overflows its box — so raising the cap adds headroom without introducing a new way for text to clip.

## Goals / Non-Goals

**Goals:**
- A single slide's font family, font size, text color, alignment, text style, background, and spacing can be changed without creating, modifying, or naming any saved template.
- The override is *partial*: fields the user never touched keep following the slide's template, so editing that template later still reaches the slide.
- "Editar estilo" is reachable from the same three places a slide is already actioned: the card's context menu, the tree slide's context menu, and the console's three-dot overflow menu.
- Nothing persists until an explicit Guardar; Cancelar discards; Restablecer clears the override entirely.
- Overrides survive a reload, ride along with project autosave, and travel inside an exported/imported `ProjectFile`.
- The font-size control reaches 800 (reference-canvas px), in both the template editor and the new dialog, from one shared constant.

**Non-Goals:**
- No per-slide aspect ratio / portrait-landscape override — confirmed with the user that "orientation" means the alignment control that already exists. Slide shape stays app-wide (`AspectRatioProvider`).
- No new template records, and no change to any `modules/templates` behavior — the whole point is to *avoid* creating a template.
- No "promote this override into a saved template" action. A reasonable future addition, deliberately not in this change.
- No change to `useAutoFitFontScale`, `MIN_AUTOFIT_FONT_PX`, or the auto-fit algorithm.
- No `ProjectFile.schemaVersion` bump, and no migration of existing folders (an absent `templateOverride` is already the correct "no override" state).
- No per-slide *content* editing (verse text, song lyrics) — this change is style only.

## Decisions

### Store a partial override on the item, not a full template snapshot

`FolderItemOf<TType, TData>` gains one optional field beside `templateId`:

```ts
/** This slide's own style, layered over `templateId`'s template at render time. Only fields the user actually changed are present; absent means "follow the template exactly". */
templateOverride?: Partial<SlideTemplate>
```

- **Partial, not a full `SlideTemplate` snapshot.** A snapshot would silently detach the slide from its template: fix a typo in the template's color later and the overridden slide would ignore it forever. A partial override keeps the template as the base for everything untouched, which is what "only change this slide's font" actually means. It also makes the stored data self-documenting — reading a folder's JSON shows *what* was overridden, not an opaque duplicate of the template.
- **On the item, not in a side table keyed by item id.** Keeping it inside `FolderItem` means every existing mechanism (`storage.save(folder)`, autosave's project signature, `ProjectFile` export/import, `applyFolderTree`'s snapshot round-trip) carries it for free, with no second lifetime to manage when a slide is deleted or a folder is dragged.
- **Alternative considered:** an "inline template" — a full `SlideTemplate` stored on the item, used *instead of* `templateId` when present. Rejected for the detachment problem above, and because it makes "reset one field back to the template" impossible without a diff.
- **Nested-object fields replace wholesale.** `background` is the only non-scalar field; an override either has a whole `SlideBackground` or none. No deep-merging of `background.params` — a half-specified animated background is not a meaningful state, and `TemplateEditor` already emits whole backgrounds.

### Merge at the single resolution point

`resolveFolderItemContent` becomes:

```ts
const base = templates.find((saved) => saved.id === item.templateId)?.template ?? DEFAULT_SLIDE_TEMPLATE
const template = item.templateOverride
  ? { ...base, ...normalizeSlideTemplateOverride(item.templateOverride) }
  : base
```

Every consumer — `SlideCard`, `PreviewPanel`, `console-view.tsx`'s `presentFolderItem`, and therefore the `LiveSlidePayload` sent to `/present` — inherits the override with no change of its own, exactly the way auto-fit was made universal by living inside `SlidePreview`. This is the reason to put the merge here rather than in each caller.

- **A spread, not a field-by-field merge.** `Partial<SlideTemplate>` with only real keys present means `{...base, ...override}` is already correct; `undefined`-valued keys are never written (see the draft-diff decision below), so there is no "explicit undefined clobbers the base" hazard.

### Normalize an override defensively, without filling defaults

`normalizeSlideTemplate` (`services/normalize-slide-template.ts`) exists to make a *whole* saved template renderable by filling in missing/unknown fields from `DEFAULT_SLIDE_TEMPLATE`. That is exactly wrong for an override — filling defaults would turn a one-field override into a full template snapshot and reintroduce the detachment problem.

Add a sibling, `normalizeSlideTemplateOverride(value: unknown): Partial<SlideTemplate>`, that *subtracts* rather than fills:

- Drop `fontFamily` if `isKnownFontId` is false (a font removed since the project was saved) — the base template's font then applies.
- Drop `background` if it fails the same renderability checks `normalizeBackground` applies (unregistered animated `presetId`, gradient with no usable `value`/`spec`) — the base's background applies.
- Drop any key not in `SlideTemplate` and any key whose value is `undefined`.
- Clamp `fontSize` into `[MIN_FONT_SIZE, MAX_FONT_SIZE]`.

Rationale: an override arrives from the same untrusted places a template does (localStorage, a project file authored by an older or newer build, a file from another machine), so it needs the same defensive pass — but the correct fallback for a bad *override* field is "defer to the template", not "use the app default".

- **Where normalization runs:** at resolution time, inside `resolveFolderItemContent`, not at storage-read time. `LibraryStorageDriver.list()` returns raw `Folder` records and has no knowledge of slide styling; keeping the pass at the one place the value is consumed means a project file can round-trip losslessly (an override referencing a font this build doesn't have is preserved on disk, just not rendered) — the same reason `normalizeSlideTemplate` runs where templates are read for use.

### The editing surface: a dialog over the console

Confirmed with the user over the alternatives (a mode in the narrow `w-96` preview panel; a dedicated route like `/templates/$templateId`). A new `SlideStyleDialog` (`modules/library/components/slide-style-dialog.tsx`):

- Layout: a live `SlidePreview` of the actual slide (its own text/reference/media, so the preview shows the real thing rather than sample text) beside the unmodified `TemplateEditor`, in a `Dialog` sized like `TemplatePickerDialog`'s `max-w-4xl` with a scrolling controls column.
- **`TemplateEditor` is reused as-is, with no per-slide branching.** It is already a controlled editor over a full `SlideTemplate`, and the dialog hands it the *merged* template (base + draft override) as its value. So the controls always show the slide's effective look, and every knob is available whether or not that field is currently overridden.
- **State: a draft override, accumulated from `onChange` patches.** `const [draft, setDraft] = useState<Partial<SlideTemplate>>(item.templateOverride ?? {})`, and `onChange={(patch) => setDraft((d) => ({...d, ...patch}))}`. Because `TemplateEditor`'s `onChange` already emits only the changed field(s), the draft naturally stays minimal — the "only store what was touched" property falls out of the existing API rather than needing a diff against the base.
  - **Alternative considered:** hold a full draft `SlideTemplate` and diff it against the base on Save. Rejected — a diff would need per-field equality (including a structural compare for `background`), and would misbehave in the case where the user deliberately sets a field to the same value the base happens to have (a legitimate "pin this" intent that a diff silently discards). Accumulating patches is both simpler and more faithful to intent.
- **Guardar** calls the new `applyStyleOverrideToItems(folderId, itemIds, draft)`; **Cancelar** closes without writing; **Restablecer** sets the draft to `{}` and, once saved, removes the field entirely. Restablecer only clears the *override* — it never touches the slide's `templateId`, and it is not the template editor's "Restablecer plantilla" (which sets `DEFAULT_SLIDE_TEMPLATE`). Because `TemplateEditor`'s own `onReset` prop is the "reset to defaults" hook, the dialog wires `onReset` to "clear the override" and labels it accordingly — the semantically correct meaning of reset *in this context*.
- **Explicit save, matching the template editor's precedent.** The rest of the console autosaves, but this dialog is a style-experimentation surface with a live preview: the user needs to try a font, dislike it, and back out. `slide-text-fit-and-explicit-save` established the same reasoning for `/templates/$templateId`. Unlike that page, no unsaved-changes navigation guard is needed — a dialog's Cancelar/dismiss *is* the discard affordance, and there is no route change to intercept.
- **`canUseVideoBackground`** is passed through from `useTemplates().supportsVideoBackground` exactly as the template editor route does, so a desktop build can set a per-slide video background and the web build simply doesn't show the control. Video media saved this way is stored by the same `templateMedia` IPC bridge the editor uses.

### Entry points: three menus, one dialog, one write path

- `SlideCard`'s context menu gains **Editar estilo** (between Renombrar and Eliminar), via a new `onEditStyle(itemId)` prop.
- `FolderTree`'s slide context menu gains the same item, via `onEditItemStyle(itemId, folderId)` — the tree's slide may live in a folder that isn't the open one, hence the folder id, matching how `onPrepareItem`/`onPresentItem` already work there.
- `SlideConsole`'s `OverflowActions` bulk menu gains an `edit-style` entry, disabled when the selection is empty — the same `disabled: !hasSelection` treatment as `apply-template`.
- **The dialog is owned by `SlideConsole`**, beside the existing `TemplatePickerDialog`, with `{folderId, itemIds}` as its open-state. A tree-originated edit routes through `console-view.tsx`, which opens the slide's folder first (as `onPrepareTreeItem` already does) and then targets it — so the dialog never has to render a slide from a folder the console isn't showing.
- **Multi-selection writes the same override to every selected slide**, seeded from the last-selected slide's effective style. This costs nothing beyond taking `itemIds` instead of `itemId` (the write helper mirrors `applyTemplateToItems`, which is already plural) and it is the natural reading of "edit the style of the selected slides" from a bulk menu.

### The write helper, and what happens when a template is applied afterward

`use-library.ts` gains:

```ts
applyStyleOverrideToItems(folderId, itemIds, override: Partial<SlideTemplate> | null)
```

Mirroring `applyTemplateToItems`: map over `existing.items`, and for targeted items either set `templateOverride` to the patch or **delete the key** when `override` is `null` or empty. Deleting rather than storing `{}` keeps "no override" a single representable state, so nothing downstream has to treat an empty object as meaningful.

- **Applying a template to a slide that has an override keeps the override.** `applyTemplateToItems` is left semantically as-is: it sets `templateId` and does not touch `templateOverride`. The override is layered *on top of* whatever template the slide points at — that is its definition — so swapping the base template underneath and keeping the deliberate per-slide tweaks is the consistent behavior, and the user always has Restablecer as the explicit way to drop the tweaks. The alternative (silently clearing the override on template apply) would destroy user work as a side effect of an unrelated action, which is worse than a look the user can see and fix in one click.

### Font-size range as a shared constant

Add to `services/slide-template.ts`, exported through `modules/presentation`:

```ts
export const MIN_FONT_SIZE = 16
export const MAX_FONT_SIZE = 800
```

`template-editor.tsx`'s slider uses them in place of the literal `16`/`96`, so the template editor and the per-slide dialog get the same range from one place (the dialog reuses `TemplateEditor`, so it inherits this automatically), and `normalizeSlideTemplateOverride` clamps against the same bounds.

- **800, in reference-canvas pixels.** Sizes are relative to `REFERENCE_WIDTH = 1920`, so 800px is roughly a single very large word across a projector — the practical ceiling for the "one emphasized word" slide the cap was blocking. Chosen from the options put to the user.
- **Step stays at 2.** The scrubber then spans ~392 steps instead of ~40. Kept at 2 because the same control must still allow fine adjustment at ordinary sizes (36–60 is where most templates live), and `SliderComfortable`'s scrubber variant is a drag-to-adjust control rather than a fixed-width track where step count maps to pixel precision.
- **No change to auto-fit.** `useAutoFitFontScale` never enlarges past the authored size and shrinks whatever overflows, so a 700px setting on a long verse degrades gracefully to a fitted size rather than clipping.

## Risks / Trade-offs

- [An override silently survives applying a different template, so a slide can look "wrong" after a template swap and the cause is invisible] → Restablecer in the same dialog clears it in one click, and the override's whole purpose is to outlive base-template changes. Chosen deliberately over destroying user edits as a side effect of an unrelated action.
- [Partial overrides are a second source of truth for a slide's look, so debugging "why does this slide look different" now means checking two places] → Confined to one merge point (`resolveFolderItemContent`), and the stored data is a readable list of exactly the overridden fields rather than an opaque snapshot.
- [A per-slide override can reference a font id or animated-background preset that a later build removed] → `normalizeSlideTemplateOverride` drops just that field, so the slide falls back to its template for it instead of rendering an undefined font or a blank background — the same defense `normalizeSlideTemplate` gives whole templates, with a fallback appropriate to a partial.
- [Bulk "Editar estilo" over a mixed selection seeds from one slide's effective style and applies that same override to all of them, which can be surprising if the selected slides point at different templates] → The dialog's live preview shows the seeded slide, and the write is a patch (not a snapshot), so slides on other templates keep their own base for every untouched field. The action is also explicit and reversible via Restablecer.
- [A per-slide video background stores media through the same `templateMedia` IPC bridge as templates, but the release path (`releaseVideoMedia`, which frees the old file when a background is replaced) lives in `TemplateEditor` and assumes the editor's lifecycle] → Reusing `TemplateEditor` unchanged means the same release-on-replace behavior applies; the residual gap is that deleting a *slide* with a video override does not free its file. Worth noting in implementation but not a regression — the equivalent gap already exists for a deleted template.
- [Raising the cap to 800 lets a user pick a size far larger than any slide can show] → Auto-fit already shrinks to fit, so the visible result is a large-but-fitted slide rather than clipped text; the cap is headroom, not a promise.

## Open Questions

_None — the three ambiguous points (what "orientation" means, the new font-size ceiling, and where the editor lives) were resolved with the user before this design was written._
