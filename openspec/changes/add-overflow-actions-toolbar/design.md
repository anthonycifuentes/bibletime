## Context

`slide-console.tsx` renders its bulk actions as a flat `<div className="flex items-center gap-2">` of four `Button`s in the header row, next to the folder name. Two of them — "Clear selection" and "Remove selected" — are conditionally mounted behind `hasSelection`, so the row's width changes every time the user selects or deselects, and the folder-name `<h1 className="truncate">` re-truncates in response. The row is already crowded at the console's default center-pane width (it sits between a folder-tree sidebar and a 384px preview panel), and the roadmap adds more bulk actions.

The reference implementation is beui's MIT-licensed `overflow-actions` block: a connected pill "track" whose overflow half springs open from a toggle. Its dependencies are `motion`, `clsx`, `tailwind-merge`, `react`, `lucide-react` — all already present in `packages/ui/package.json` except `lucide-react`, which the codebase deliberately does not use (it standardizes on `@hugeicons/react` + `@hugeicons/core-free-icons`). `packages/ui/src/components/tabs.tsx` already imports from `motion/react` and uses `useReducedMotion`, so the animation approach has precedent here.

The chosen behavior differs from the reference's default posture: the console rail has **no** always-visible primary actions. Collapsed, it is a single `…` pill; expanded, it reveals all four actions and the toggle becomes `✕`.

## Goals / Non-Goals

**Goals:**
- A reusable `OverflowActions` primitive in `@workspace/ui`, not a one-off inside the library module — the sermons/songs/media consoles should be able to adopt it later.
- Header width stops reacting to selection changes: pills are always rendered when expanded, only their `disabled` state varies.
- Keyboard and screen-reader parity with the buttons being replaced — no action becomes mouse-only.
- No new package dependency, and no `lucide-react` creeping in via a vendored block.

**Non-Goals:**
- Not changing what any bulk action *does*. `onSelectAll`, `onClearSelection`, `onRemove`, and the template picker dialog keep their current semantics and their existing `SlideConsoleProps` signatures.
- Not adopting the reference's `primaryActions` posture for the console (we pass an empty primary set) — the prop still exists on the component for other call sites.
- Not touching the per-card context menus (`slide-card.tsx`, `folder-tree.tsx`) or the folder-level actions in the sidebar.
- Not adding new bulk actions in this change; the rail is the place they'll go later.

## Decisions

### Decision 1: Adapt the block into `packages/ui`, don't run `npx shadcn add`

The documented install is `npx shadcn@latest add @beui/overflow-actions`, which would drop the file into a `components/motion/` path with `lucide-react` imports and beui's own `cn`. Instead the component is hand-ported to `packages/ui/src/components/overflow-actions.tsx`, matching the conventions every sibling there already follows: `cn` from `@workspace/ui/lib/utils`, `cva` for size variants (as in `pill.tsx` / `button.tsx`), `motion/react` (as in `tabs.tsx`), and the `data-slot="…"` attribute convention.

*Alternative considered:* run the CLI and patch afterwards. Rejected — the CLI writes to an app-local path and pulls `lucide-react` into `apps/bibletime`, which would make it the only lucide consumer in the repo and split the icon system.

*Alternative considered:* build the rail inline inside `slide-console.tsx` with plain `Button`s and a `Collapsible`. Rejected — the spring/blur reveal is the point of the pattern, and every other console will want it.

### Decision 2: Icons are caller-supplied `ReactNode`, and the toggle's icons are the component's own

`OverflowActionItem.icon` stays `ReactNode`, exactly as the reference types it, so any call site can pass `<HugeiconsIcon icon={…} strokeWidth={2} />` and the primitive stays icon-library-agnostic. The slide console itself passes **no** per-pill icons — its four bulk actions are label-only, so the rail reads as one uninterrupted row of words. The one place the component must own an icon is its toggle, where the icon *is* the state signal: `MoreHorizontalIcon` collapsed, `Cancel01Icon` expanded — both already used elsewhere in `packages/ui` (`breadcrumb.tsx` uses `MoreHorizontalCircle01Icon`; `dialog.tsx`/`sheet.tsx` use `Cancel01Icon`), so this adds no import surface.

The icon swap animates with the reference's blur crossfade (`opacity 0 → 1`, `filter: blur(3px) → blur(0)`, ~0.18s) under `AnimatePresence` with `mode="wait"`, keyed on the expanded state.

### Decision 3: Controlled/uncontrolled dual API, and the console controls it

The component supports `expanded` + `onExpandedChange` (controlled) and `defaultExpanded` (uncontrolled, default `false`), per the reference API. `slide-console.tsx` uses the **controlled** form with local `useState`, because it also needs to read the expanded state — and because a later change may want to auto-expand when a selection first appears. `collapseOnAction` stays available but is left `false` for the console: applying a template opens a dialog, and collapsing the rail behind that dialog would be disorienting.

### Decision 4: Disabled, not unmounted

The current code unmounts "Clear selection"/"Remove selected" when `hasSelection` is false. The rail instead always renders all four and drives `OverflowActionItem.disabled`:

| Action | id | disabled when |
| --- | --- | --- |
| Select all | `select-all` | `folder.items.length === 0` |
| Clear selection | `clear-selection` | `!hasSelection` |
| Apply template | `apply-template` | `!hasSelection` |
| Remove | `remove` | `!hasSelection` |

This is what makes the expanded rail's width stable, and it also means the user can *see* that a bulk action exists before selecting anything — the current UI hides that fact entirely. Disabled pills get `disabled` on the underlying `<button>`, so they are skipped by tab order and announced as unavailable without extra ARIA.

*Trade-off:* three of four pills are disabled in the common "nothing selected" state, which is a lot of grey. Accepted — it's the same information the old UI conveyed by absence, and absence is the worse teacher.

### Decision 5: Dispatch by id in one `onAction`, not four callbacks

The rail reports activation as `onAction(item)`; `slide-console.tsx` switches on `item.id` and calls the existing prop for each case (`apply-template` sets `pickerOpen`). Actions are built in a `useMemo` over `[folder.items, selectedItemIds, t]`. `SlideConsoleProps` is untouched, so `console-view.tsx` needs no edit at all — the change is contained to one component file plus the new primitive plus dictionaries.

*Alternative considered:* per-item `onClick` (also supported by the reference type). Rejected as the primary path — a single `onAction` keeps the action list a plain data array that's trivial to reorder or extend, and `onClick` remains available for call sites that prefer it.

### Decision 6: Accessibility contract

- Toggle: `aria-expanded`, `aria-controls` pointing at the overflow container's id (generated with `React.useId()`), and `aria-label` from `openLabel`/`closeLabel`.
- Overflow container: while collapsed it is `inert`/`aria-hidden` with its buttons at `tabIndex={-1}`, so hidden actions are neither tabbable nor announced. This matters more here than in the reference, because *every* action is hidden when collapsed — a leaky implementation would leave the console's only bulk controls silently focusable.
- Pills are real `<button type="button">` elements, so Enter/Space activation and disabled semantics come free.
- `useReducedMotion()` collapses the spring and the blur crossfade to instant state changes, matching `tabs.tsx`.

### Decision 7: Localization

`openLabel`/`closeLabel` default to English in the primitive (it lives in `packages/ui`, which has no i18n), but the console **always** passes translated strings. Two new keys go into `en.ts` first — `library.showExtraActions` / `library.hideExtraActions` — then `es.ts` and `pt.ts`. Per the note at the top of `en.ts`, `es`/`pt` are typed against `keyof typeof en`, so a missing translation is a `tsc` failure, not a runtime fallback. The four action labels reuse the existing `library.selectAll`, `library.clearSelection`, `library.removeSelected`, `library.applyTemplate` keys verbatim.

## Risks / Trade-offs

- **Every bulk action is now two clicks away, including "Apply template", which was a one-click primary CTA** → This is the explicitly chosen posture (collapsed rail shows only `…`). Mitigation: the rail is controlled by the console, so if the extra click proves annoying in use, auto-expanding on first selection is a one-line change with no API churn.
- **Discoverability: a bare `…` gives no hint that bulk actions exist** → Mitigated by the disabled-not-absent rule (Decision 4) — once opened, the full action vocabulary is visible whether or not anything is selected. A tooltip on the toggle is a cheap follow-up if needed.
- **Hand-porting a third-party block means we own its bugs and drift from upstream** → The component is ~150 lines with no runtime deps beyond `motion`; the port is recorded here and the MIT origin is credited in a file header comment. Upstream updates are re-read manually, not pulled.
- **Animating a spring-sized container can cause layout thrash in the header row** → The rail is a fixed-height inline-flex track inside the existing `justify-between` row; only its width animates, and the folder-name `<h1>` already `truncate`s, so it absorbs the change the same way it does today.
- **`motion` is declared in `packages/ui` but the component ships to an Electron + SSR (Nitro) app** → `tabs.tsx` already ships `motion/react` through the same path, so the bundling story is proven; no new "use client" boundary is introduced because the app is a client-rendered SPA shell.

## Migration Plan

Purely additive at the package level and self-contained at the app level:

1. Add `overflow-actions.tsx` to `packages/ui` — nothing imports it yet, nothing breaks.
2. Add the two dictionary keys (`en` first, then `es`/`pt`, or `tsc` fails).
3. Swap the header row in `slide-console.tsx`. This is the only behavioral commit; reverting it restores the flat toolbar without touching the new primitive.

No data migration, no persisted state, no route changes. Rollback is reverting step 3.

## Open Questions

- Should the rail auto-expand the first time a selection appears in a session? Deferred — ship the always-collapsed default, revisit after using it.
- Should `size` be `"sm"` (matching the current `size="sm"` buttons) or `"md"`? Leaning `"sm"` to keep the header's vertical rhythm; the component supports both, so this is a call-site tweak, not a spec question.
