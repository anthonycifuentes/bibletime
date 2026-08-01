## Context

The app is a screaming-architecture monorepo (`apps/bibletime/src/modules/<domain>`) on TanStack Router, with a shared `@workspace/ui` component package (Radix/base-ui-style primitives: `Sidebar`, `Collapsible`, `Card`, no `Tabs` yet). Today, navigation is one flat `AppSidebar` list and each module (`bible`, `templates`) owns a full-page view. The `bible` module is the only content module with real data (bundled + downloadable RVR1960-style JSON translations); `songs`, `media`, `sermons`, `announcements`, `service-plan` are empty stubs (`export {}`). `templates` and `presentation` already provide a slide-template data model, a template manager/editor, and a `SlidePreview` renderer, plus a chrome-less `/present` route that mirrors state via a broadcast channel (`useBroadcastLiveOutput`). This change replaces the top-level nav and per-module full-page pattern with one persistent console shell (bottom nav + contextual sidebar + ordered slide list + live preview panel), and introduces a new `library` module as the place where mixed-content folders and their ordered items live.

## Goals / Non-Goals

**Goals:**
- One console shell shared by every content tab, so building out Songs/Media/Service Plan later never means building another full-page layout.
- A `library` module that owns folders and folder items as its own persisted, screaming-architecture domain (not bolted onto `bible`).
- Reuse existing building blocks rather than rewriting them: Bible's book/chapter/verse pickers, the `templates` module's template picker/manager, and `presentation`'s `SlidePreview` + broadcast-to-`/present` mechanism.
- Keep the folder/item data model source-agnostic from day one (a discriminated union keyed by content type), even though only `bible-passage` is a real, populated source at this point.

**Non-Goals:**
- Building out real Songs or Media libraries (still stubs; this change only wires their tabs into the shared "add to folder" flow with placeholder empty states).
- Drag-and-drop reordering via pointer gestures — v1 reordering is button-driven (move up/down, or a numbered position field); pointer DnD is a follow-up once a `@dnd-kit`-class dependency is deliberately added.
- Real-time collaboration / multi-window editing of the same folder.
- Changing how `/present` renders or how the broadcast channel works — only what feeds it changes.

## Decisions

**1. New `library` module owns folders; `bible` stops owning a full-screen console.**
`BibleConsoleView`'s four-column layout is deleted. Its constituent pieces (`BookSearchList`, `ChapterNav`, `VersePickerList`, `BibleVersionSelector`, `VerseHistoryList`) move to being rendered inside the console shell's sidebar when the Bible tab is active, and instead of resolving to an on-screen preview column, selecting a verse/range now calls a `library` action (`addItemToFolder`) that appends a `bible-passage` item to whichever folder is currently open. `library` depends on `bible`'s public interfaces (verse reference shape) but `bible` has no dependency back on `library` — matching the existing screaming-architecture rule that modules don't reach into siblings' internals.

*Alternative considered*: keep folders inside the `bible` module and let other modules register their own folders later. Rejected — folders are inherently cross-domain (a folder mixes Bible + song + media items), so they can't live inside any single content module without an eventual awkward migration.

**2. Folder items are a discriminated union tagged by `type`.**
```
type FolderItem =
  | { id: string; type: "bible-passage"; templateId?: string; ...bible-specific fields }
  | { id: string; type: "song"; templateId?: string; ...song-specific fields }
  | { id: string; type: "media"; templateId?: string; ...media-specific fields }
```
The slide console and preview panel render a `FolderItem` by switching on `type`; unknown/stub types (`song`, `media` today) render a "not yet available" placeholder slide rather than being excluded from the list, so the ordering/selection UX is already correct once those modules gain real content.

*Alternative considered*: a generic `{ id, contentRef }` pointing into each module's own store. Rejected for v1 — needing a template assignment and a renderable preview per item is common to every type, so a shared shape with a type tag is simpler than per-module lookup indirection right now.

**3. The shell has four fixed regions: Header, Sidebar, Slides, Preview, and Navigation.**
Per the user-provided wireframe, the shell is a full-height layout with a full-width `Header` row on top, a full-width `Navigation` (bottom nav) row on the bottom, and a middle row split into three columns — `Library` sidebar, `Slides` (main slide list), `Preview` panel. The `Header` is the one region not already covered by a capability spec: it's a persistent, always-visible top bar (independent of `activeTab`) that hosts app branding and the Settings entry point, resolving the open question below — Settings lives in the Header, not in a per-tab menu.

A single `activeTab: "library" | "bible" | "songs" | "media" | "templates"` (plus the currently open folder id, when relevant) lives in the console shell's state, likely a small `zustand` store (already a dependency) rather than route search params, since tab switching must not remount the shared preview panel or lose the open folder's slide list scroll position. The sidebar is a switch on `activeTab` rendering: `FolderTree` (Library), the Bible picker (Bible), placeholder browsers (Songs/Media), or the existing `TemplateManager` (Templates). The Header does not change with `activeTab`.

*Alternative considered*: encode `activeTab` in the URL (route per tab, as today). Rejected as the primary mechanism — the preview panel and open folder must persist across tab switches, and remounting on route change would fight that; a shallow route/search param can still mirror `activeTab` for deep-linking without driving remounts.

**4. Selection + "apply template to selection" lives in the slide console, template *data* stays owned by `templates`.**
The slide console tracks its own multi-select state (`Set<itemId>`) and select-all; "apply template" opens the existing template picker (from `templates`) and, on confirm, writes the chosen `templateId` onto every selected `FolderItem`. No new template data model is introduced.

**5. Preview panel renders through the existing `SlidePreview` + broadcast mechanism, generalized to `FolderItem`.**
`SlidePreview` currently expects Bible-shaped content; it's extended to accept a `FolderItem` (or a normalized `{ template, content }` pair) so the same renderer serves every content type. `useBroadcastLiveOutput`'s channel contract is kept as-is; the payload it sends is generalized the same way.

## Risks / Trade-offs

- [Discriminated-union `FolderItem` grows a lot of optional fields as more content types are added] → Mitigate by keeping type-specific fields in a nested `data` object per variant (`{ id, type, templateId, data: BiblePassageData }`) rather than flattening everything onto one type, so adding `song`/`media` real data later doesn't touch unrelated variants.
- [Deleting `BibleConsoleView` is a visible regression until the Library flow fully replaces it] → Mitigate by sequencing tasks so the new shell + Bible-tab picker + library folder + preview panel all land together before the old view is removed, not left as a partial state.
- [No pointer-based drag-and-drop for reordering in v1] → Mitigate by shipping explicit move-up/move-down controls now; scope pointer DnD as an explicit follow-up change once justified by real usage.
- [`zustand` store for shell/tab state means tab selection isn't a URL, hurting deep-linking/back-button] → Mitigate by mirroring `activeTab` and open-folder-id into a shallow route search param for bookmarking, while the zustand store remains the source of truth for in-session persistence.
- [No `Tabs` primitive exists yet in `@workspace/ui`] → Not required: the bottom nav is a fixed 5-item bar, not a `Tabs` component: a simple `NavigationBar` in `core/layout` suffices) and does not require adding a new shared primitive.

## Migration Plan

1. Build the `library` module (interfaces, storage, actions) and the console shell (bottom nav + sidebar switch + slide console + preview panel) alongside the existing `/bible` route, without removing anything yet.
2. Wire the Bible tab's picker to `library`'s `addItemToFolder` action and confirm a folder can be built and previewed end-to-end.
3. Wire "apply template to selection" against the existing `templates` picker.
4. Cut over routing so `/library` (or `/`) is the default screen using the new shell; keep `/bible` briefly redirecting into the shell with the Bible tab pre-selected.
5. Delete `BibleConsoleView` and its now-unused standalone layout once the shell fully replaces it.
6. Rollback strategy: each step above is an independent commit; reverting to the prior flat-sidebar + `BibleConsoleView` state is a straight `git revert` up to whichever step, since nothing is destructive to persisted user data (folders are additive, stored separately from existing Bible version-download/history storage).

## Open Questions

- Where should folders/items persist — same storage abstraction pattern as `templates/services/storage` (localStorage web / file-based desktop), or something shared across `library` and `templates`? Leaning toward mirroring `templates`' existing per-platform storage pattern for consistency; confirm during `library` module scaffolding.
- ~~Does Settings get a corner icon in the shell header, or move into a menu off one of the five tabs?~~ Resolved: the wireframe confirms a persistent `Header` region distinct from the bottom `Navigation` bar — Settings lives there.
