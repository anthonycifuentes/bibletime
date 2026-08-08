## 1. Shared `OverflowActions` primitive

- [x] 1.1 Create `packages/ui/src/components/overflow-actions.tsx` with a file-header comment crediting the MIT-licensed beui `overflow-actions` block as the origin of the port, plus a note that icons are `ReactNode` (hugeicons at call sites) rather than `lucide-react`.
- [x] 1.2 Define and export the types: `OverflowActionItem` (`id`, `label`, `icon?`, `onClick?`, `disabled?`, `ariaLabel?`), `OverflowActionsSize` (`"sm" | "md"`), and `OverflowActionsClassNames` (`root`, `track`, `action`, `primaryAction`, `overflowAction`, `toggle`, `icon`, `label`).
- [x] 1.3 Implement the size variants with `cva` (matching `pill.tsx`/`button.tsx` conventions): track `gap-1 p-1 text-xs` (sm) / `gap-1.5 p-1.5 text-sm` (md); action `h-8 min-w-8 gap-1.5 px-3` (sm) / `h-9 min-w-9 gap-2 px-3.5` (md); toggle `h-8 w-8` (sm) / `h-9 w-9` (md). Default `size` to `"md"`. Use `cn` from `@workspace/ui/lib/utils` and `data-slot` attributes on each part.
- [x] 1.4 Implement the controlled/uncontrolled expanded state: `expanded` + `onExpandedChange` when controlled, `defaultExpanded` (default `false`) otherwise. Verify a rail with no `expanded` prop renders collapsed on first paint (spec: "Rail renders collapsed on first paint").
- [x] 1.5 Render the toggle as `<button type="button">` showing `MoreHorizontalIcon` when collapsed and `Cancel01Icon` when expanded (both from `@hugeicons/core-free-icons` via `HugeiconsIcon`), crossfading with `AnimatePresence mode="wait"` and the blur transition (`opacity 0→1`, `filter: blur(3px)→blur(0px)`, ~0.18s), keyed on the expanded state.
- [x] 1.6 Render `primaryActions` always-visible in the track and `overflowActions` inside an animated container that springs open/closed with `SHELL_TRANSITION` (`type: "spring"`, `stiffness: 220`, `damping: 17`, `mass: 0.85`) from `motion/react`, laid out as one connected pill row alongside the toggle.
- [x] 1.7 Wire the accessibility contract: `aria-expanded` and `aria-controls` on the toggle pointing at the overflow container's `React.useId()`-derived id; `aria-label` from `openLabel`/`closeLabel` (defaults `"Show extra actions"` / `"Hide extra actions"`); and while collapsed, mark the overflow container `aria-hidden`/`inert` with its buttons at `tabIndex={-1}` so hidden actions are neither tabbable nor announced.
- [x] 1.8 Wire activation: clicking or keyboard-activating an enabled pill calls that item's `onClick` (if given) and then `onAction(item)`; `disabled` items set `disabled` on the underlying `<button>` and fire neither. Honor `collapseOnAction` (default `false`) by collapsing after a successful activation.
- [x] 1.9 Call `useReducedMotion()` and, when it returns true, drop the spring and the blur crossfade to instant state changes — mirroring `packages/ui/src/components/tabs.tsx`.
- [ ] 1.10 Manually verify the primitive against the `console-action-overflow-rail` spec scenarios: collapsed shows only the toggle; hidden actions are unreachable by Tab; toggle icon and `aria-label` swap in both directions; expanding reveals every configured action in order; a disabled pill keeps its slot and reports nothing on activation; Tab + Enter/Space reach and fire each enabled pill.

## 2. Localization keys

- [x] 2.1 Add `"library.showExtraActions": "Show extra actions"` and `"library.hideExtraActions": "Hide extra actions"` to `apps/bibletime/src/modules/core/i18n/dictionaries/en.ts`, in the `library.*` block near the existing `selectAll`/`clearSelection` keys.
- [x] 2.2 Add the matching Spanish translations to `es.ts` and Portuguese to `pt.ts` at the same position; confirm `tsc` passes (both files are typed against `keyof typeof en`, so a missing key fails the build).

## 3. Slide console adoption

- [x] 3.1 In `apps/bibletime/src/modules/library/components/slide-console.tsx`, add `const [actionsExpanded, setActionsExpanded] = useState(false)` and build the four actions in a `useMemo` over `[folder?.items, selectedItemIds, t]`, in order: `select-all`, `clear-selection`, `apply-template`, `remove` (all label-only — no per-pill icons) — reusing the existing `library.selectAll`, `library.clearSelection`, `library.removeSelected`, `library.applyTemplate` keys for labels.
- [x] 3.2 Set each action's `disabled` per the design's table: `select-all` when `folder.items.length === 0`; `clear-selection`, `apply-template`, and `remove` when `!hasSelection`. Remove the `hasSelection ? … : null` conditional mounting entirely — all four pills always render.
- [x] 3.3 Replace the header's `<div className="flex items-center gap-2">` button row with a single `<OverflowActions>` using `primaryActions={[]}`, `overflowActions={actions}`, `size="sm"`, controlled `expanded`/`onExpandedChange`, `collapseOnAction={false}`, and `openLabel={t("library.showExtraActions")}` / `closeLabel={t("library.hideExtraActions")}`.
- [x] 3.4 Implement `onAction` dispatching on `item.id`: `select-all` → `onSelectAll(folder.items.map((item) => item.id))`; `clear-selection` → `onClearSelection()`; `apply-template` → `setPickerOpen(true)`; `remove` → `onRemove([...selectedItemIds])`. Leave `TemplatePickerDialog` and its `onApply` wiring untouched.
- [x] 3.5 Drop the now-unused `Button` import from `slide-console.tsx` only if no other usage remains (the empty-state "New folder" button still uses it — check before removing).
- [x] 3.6 Confirm `SlideConsoleProps` is unchanged and that `apps/bibletime/src/modules/library/views/console-view.tsx` required no edit.

## 4. Verification

- [x] 4.1 Run the repo's typecheck and lint; fix any fallout from the new component's exports or the dictionary additions.
- [ ] 4.2 Run the app and verify the `slide-console` spec scenarios in the open-folder header: collapsed header shows only folder name + `…`; expanding reveals Select all / Clear selection / Apply template / Remove in that order with the toggle as `✕`; collapsing hides them again.
- [ ] 4.3 Verify the stable-width rule in the running app: expand the rail with nothing selected (three pills disabled), then select a slide — the pills enable in place without shifting position — and confirm `select-all` is disabled in an empty folder.
- [ ] 4.4 Verify each action still does what it did before the change: select all, clear selection, remove one and remove several selected slides, and apply a template to the selection via the picker dialog.
- [ ] 4.5 Switch the app language to Spanish and Portuguese and confirm the toggle's accessible name and all four pill labels are translated.
