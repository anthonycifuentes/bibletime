## Why

The slide console's header currently lays every bulk action out flat — "Select all", "Clear selection", "Remove", "Apply template" — and two of them appear and disappear as the selection changes, so the row's width jumps while the user works. On narrow console widths that row competes with the folder name for space, and it will only get worse as more bulk actions land (duplicate, move to folder, export). Collapsing the whole set behind a single disclosure control keeps the header quiet by default and gives new actions somewhere to go without another layout fight.

## What Changes

- Add an `OverflowActions` component to `@workspace/ui` — a connected pill rail that renders a row of action pills and animates them open/closed from a single toggle pill, adapted from the beui `overflow-actions` block (MIT). Adapted, not vendored verbatim: the project uses `@hugeicons/react` rather than `lucide-react`, and icons are passed in by the caller, so the component takes `ReactNode` icons and adds no new dependency (`motion`, `clsx`, `tailwind-merge` are already in `packages/ui`).
- The toggle pill is the rail's only always-visible control when collapsed: it shows a three-dots (`…`) icon, and swaps to a close (`✕`) icon while expanded.
- **BREAKING (UI)**: Replace the slide console's flat bulk-action row with that rail. Collapsed, the header shows the folder name and a single `…` pill. Expanded, it springs open to reveal "Select all", "Clear selection", "Apply template", and "Remove" as connected pills, with the toggle now showing `✕`.
- Preserve every existing enable/disable rule, but express it as a disabled pill rather than an absent one — "Clear selection", "Apply template", and "Remove" no longer appear and vanish with the selection, so the expanded rail keeps a stable width. "Select all" stays disabled for an empty folder; "Apply template" stays disabled with no selection.
- Add i18n keys for the toggle's accessible open/close labels to all three dictionaries (`en`, `es`, `pt`); the four action labels reuse the existing `library.*` keys unchanged.

## Capabilities

### New Capabilities
- `console-action-overflow-rail`: the collapsible pill rail as a shared UI primitive — collapsed-by-default disclosure from a single `…` toggle that becomes `✕` when open, the springing open/close animation, keyboard and screen-reader access to the hidden actions, and per-action disabled state.

### Modified Capabilities
- `slide-console`: the bulk-action toolbar's presentation changes at the spec level. Prior requirements state that "Remove selected" is *not available to trigger* with no selection and that select-all/apply-template are surfaced as toolbar actions; those actions now live behind the overflow rail and express unavailability as a visibly disabled pill inside the expanded rail rather than as an absent control. The underlying behaviors (what each action does to the selection) are unchanged.

## Impact

- New `packages/ui/src/components/overflow-actions.tsx` — the shared rail primitive, exported like the other `@workspace/ui` components.
- `apps/bibletime/src/modules/library/components/slide-console.tsx` — the header's `<div className="flex items-center gap-2">` button row is replaced by a single `OverflowActions` usage; the `pickerOpen` / `onSelectAll` / `onClearSelection` / `onRemove` handlers are re-dispatched through the rail's `onAction` callback keyed by action id. `SlideConsoleProps` is unchanged, so `console-view.tsx` needs no edit.
- `apps/bibletime/src/modules/core/i18n/dictionaries/{en,es,pt}.ts` — two new keys for the toggle's open/close accessible labels.
- No new package dependencies: `motion`, `clsx`, and `tailwind-merge` are already declared in `packages/ui/package.json`; `lucide-react` from the reference block is deliberately not adopted, since the codebase standardizes on `@hugeicons/react`.
- The rail is added as a general primitive, so the sermons/songs/media consoles can adopt the same pattern later without another component.
