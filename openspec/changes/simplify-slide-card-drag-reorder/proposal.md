## Why

The slide console's `SlideCard` currently wraps the live preview in a bordered card with a footer (index number, reference text, type badge, and up/down/remove buttons). This adds visual noise around what should be a clean grid of slide previews, and the up/down buttons are a slow way to reorder more than a couple of slides. The card should shrink to just the preview, with drag-and-drop as the primary (and only) way to reorder, signaled by a small drag-handle icon floating above the card.

## What Changes

- **BREAKING**: `SlideCard` no longer renders the footer row (index badge, reference/type text, up/down buttons, or the per-card remove button). The card is the live preview only.
- Add a drag-handle icon anchored above the card's upper-right corner, visually indicating the card can be dragged. This icon is the exclusive drag handle — dragging is not initiated from clicking elsewhere on the card, so click-to-select behavior is preserved.
- Replace `SlideConsole`'s up/down-button-driven reordering (`onMove`) with drag-and-drop reordering across the whole grid (`onReorder`), backed by the `motion` package's `Reorder` primitive (already a dependency — no new package required).
- Move per-item removal from the (now-removed) per-card button to a bulk "Remove" action in `SlideConsole`'s selection toolbar, next to the existing "Select all" / "Apply template" actions. Removal now always acts on the current selection.
- Research note: evaluated `@dnd-kit` as an alternative; documented in `design.md` with the reasoning for choosing `motion`'s `Reorder` instead.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `slide-console`: card rendering changes to preview-only, reordering moves from up/down buttons to drag-and-drop, and removal moves from a per-card button to a selection-toolbar action.

## Impact

- `apps/bibletime/src/modules/library/components/slide-card.tsx` — strip footer, add drag handle, drive drag via `motion`'s `Reorder.Item`.
- `apps/bibletime/src/modules/library/components/slide-console.tsx` — wrap the grid in `Reorder.Group`, replace `onMove` wiring with `onReorder`, add "Remove selected" to the selection toolbar.
- Any parent screen/hook supplying `onMove`/`onRemove` to `SlideConsole` (e.g. the console route/view) needs updating to the new `onReorder` callback shape and the always-bulk `onRemove`.
- No new runtime dependency: `motion` (Framer Motion's successor) is already installed in `@workspace/ui`.
- i18n strings: `library.moveUp` / `library.moveDown` become unused and should be removed; a new `library.removeSelected` string is needed for the toolbar action.
