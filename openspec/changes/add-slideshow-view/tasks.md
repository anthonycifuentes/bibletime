## 1. Data shapes and the live-slide channel

- [x] 1.1 Add `speakerNotes?: string` to `FolderItemOf` in `modules/library/interfaces/index.ts`, documented alongside `templateOverride` as free-to-persist because folder saves, autosave, and `ProjectFile` carry `items` wholesale.
- [x] 1.2 Add `blank?: "black" | "white"` to `LiveSlidePayload`, documenting why the blank is a field on the payload rather than an empty slide, and why holding `sentAt` still across a blank is what keeps media from restarting.
- [x] 1.3 Add `setLiveSlideBlank(blank)` to `modules/library/services/live-slide.ts`: reads the stored payload and rewrites it with `blank` as the only difference, **preserving `sentAt`** — the `blank` field is itself part of the serialized value, so the `storage` event fires without bumping anything. A no-op when nothing has been sent yet.
- [x] 1.4 Verify that `speakerNotes` round-trips through folder save, project autosave, and project export/import with no serializer changes, and that a folder saved before this change still loads.

## 2. The output window renders the blanked state

- [x] 2.1 In `routes/present/index.tsx`, render a solid black or white field above the slide when `slide.blank` is set, keeping `SlideFrame` mounted underneath so nothing unmounts.
- [x] 2.2 Confirm `mediaPlaybackKey` needs no change: because `setLiveSlideBlank` preserves `sentAt`, that key already moves on a genuine send and never on a blank toggle. Document the invariant at both ends rather than introducing a composite key.
- [x] 2.3 Verify the restart invariant end to end in a browser: blanking and restoring leaves `sentAt` byte-identical (so no remount, so no restart), while every navigation and re-send moves it. Confirmed by driving the running app and reading the payload at each step. Not yet exercised against an actual video slide — see 11.4.
- [x] 2.4 Verify the blank survives resizing: the blanked payload is unchanged across two viewport changes, and the overlay re-renders with it. Moving and fullscreening touch no storage and so cannot affect it.

## 3. Still-frame rendering in `SlidePreview`

- [x] 3.1 Add `playback?: "live" | "still"` to `SlidePreviewProps`, defaulting to `"live"` so every existing call site is unchanged. Add `silent?: boolean` alongside it for the current-slide pane, which plays the same video the output window is playing and must not echo it.
- [x] 3.2 Under `"still"`: render `<video>` without `autoPlay` and with `preload="metadata"`, render a YouTube slide as a **local** placeholder (title over a black field) rather than YouTube's remote poster — the app is offline-first, and a per-thumbnail network fetch would show broken images offline — and skip mounting the animated-background shader so the solid backdrop `backgroundStyle` already applies shows through.
- [x] 3.3 Confirm the default path is untouched — the console grid, preview panel, and `/present` render exactly as before.

## 4. Speaker notes authoring in the console

- [x] 4.1 Add `updateFolderItemNotes(folderId, itemId, notes)` to `modules/library/actions/use-library.ts`, storing an empty string as "no notes" rather than an empty value on the item.
- [x] 4.2 Create `modules/library/components/slide-notes-dialog.tsx` — a small editor seeded with the slide's current notes, matching `slide-style-dialog`'s shape and dismissal behavior.
- [x] 4.3 Add the notes action to `slide-card.tsx`'s actions and to `preview-panel.tsx`, both opening the same dialog through `console-view`.
- [x] 4.4 Mark cards whose slide has notes, without rendering the notes into the slide area.
- [x] 4.5 Verify notes never reach the rendered slide in the card, the preview panel, or the output window.

## 5. Slideshow state

- [x] 5.1 Create `modules/library/actions/use-slideshow.ts` holding the deck (derived live from the open folder), an **item-id** cursor, and derived `currentIndex`/`total`/`nextItem`.
- [x] 5.2 Seed the cursor from `lastSelectedItemId` when it is in the deck, else the first item.
- [x] 5.3 Implement `next`, `previous`, `first`, `last`, and `goTo(itemId)`, each clamping at the deck's ends without wrapping and each sending the resolved slide through `setLiveSlide`.
- [x] 5.4 Implement the deck-changed rules: reorder and insert/remove elsewhere move nothing; the current slide's deletion moves the cursor to the nearest survivor and flags it **without** sending; an emptied deck flips the view to its empty state. No code path may send to the output except an explicit navigation.
- [x] 5.5 Implement blank state (`null | "black" | "white"`) with toggle-to-restore and direct switching between colors, calling `setLiveSlideBlank`, and keep navigation working while blanked.
- [x] 5.6 Implement the elapsed timer as `accumulatedMs + (now - startedAt)` with pause/resume/reset, displayed off a 1s interval, so a throttled background window does not drift.
- [x] 5.7 Implement the digit jump buffer: accumulate digits, clear after ~1.2s of inactivity, commit on `Enter` only when in range, and expose the pending value for display.
- [x] 5.8 Add unit tests for the pure logic — cursor movement and clamping, deck-mutation rules, jump-buffer parsing and expiry, and timer accumulation across pauses.

## 6. Slideshow components

- [x] 6.1 `components/slideshow/current-slide-pane.tsx` — `SlideFrame` at `playback="live"` with audio forced off, letterboxed to `useAspectRatio()`, clickable to advance.
- [x] 6.2 `components/slideshow/next-slide-pane.tsx` — `SlideFrame` at `playback="still"`, with an end-of-deck state on the last slide.
- [x] 6.3 `components/slideshow/notes-pane.tsx` — read-only notes preserving line breaks, scrolling when long, with an empty state and the two size steppers persisting their choice to `localStorage`.
- [x] 6.4 `components/slideshow/control-bar.tsx` — previous/next, the `n of N` readout with the pending jump number, elapsed timer with pause and reset, wall clock, black and white toggles, reopen output, fullscreen, and exit.
- [x] 6.5 `components/slideshow/filmstrip.tsx` — numbered thumbnails at `playback="still"`, current one marked, click to jump, auto-scrolling the current thumbnail into view.
- [x] 6.6 Style all five to the app's minimalist language on a flat near-black surface: no beveled panels or toolbar chrome, one accent for the current slide, `@workspace/ui` primitives and Hugeicons throughout.

## 7. The slideshow view and route

- [x] 7.1 Create `modules/library/views/slideshow-view.tsx` composing the five components over `useSlideshow`, reading `openFolderId` from the console store and calling `useLibrary`/`useTemplates` the way `console-view` does.
- [x] 7.2 Add the single window-level `keydown` handler with the full binding table from design decision 9, ignoring events targeting editable elements.
- [x] 7.3 Implement fullscreen for the view itself via the Fullscreen API, mirroring `routes/present`'s guarded, catch-on-reject approach.
- [x] 7.4 Implement exit: write the current slide back with `selectItem` and navigate to `/library`, leaving the output window and its blank state alone.
- [x] 7.5 Create `routes/slideshow/index.tsx`. The "nothing to present" guard lives in the view rather than a route loader — whether a deck exists depends on the console store *and* on folders still loading from storage, neither readable synchronously in `beforeLoad`; the view renders an empty state with an exit instead.
- [x] 7.6 Export the view from `modules/library/index.ts`.

## 8. Entry points

- [x] 8.1 Add a `startSlideshow(folderId, seedItemId?)` handler in `console-view.tsx` that opens/focuses `/present`, sends the starting slide, and navigates — all inside the originating click, so the web build's popup is never blocked.
- [x] 8.2 Wire the action into `slide-console.tsx`'s folder toolbar, `preview-panel.tsx`, and `folder-tree.tsx`'s folder context menu, disabled wherever the target folder has no slides.
- [x] 8.3 Give the console a way to clear a blank left behind by an exited slideshow, so an operator who exits while blanked is not stuck with a black projector.

## 9. Localization

- [x] 9.1 Add every `slideshow.*` key to `dictionaries/en.ts` — position readout, pane labels, notes empty state, timer and clock labels, blank/restore, reopen output, fullscreen, exit, deck-changed notice, and the empty and end-of-deck states.
- [x] 9.2 Add the matching `es` and `pt` translations, plus the `library.*` keys for the new notes action and start-slideshow action, and confirm `tsc` is clean.

## 10. The web output window's browser chrome

- [x] 10a.1 Create `modules/library/services/output-window.ts` with `openOutputWindow()`, holding the window name and a popup features string in one place, and document why a features string is what separates a popup from a tab.
- [x] 10a.2 Replace all 8 `window.open("/present", …)` call sites (preview panel, Bible picker, slideshow hook, console view ×5) with `openOutputWindow()`. Verify reuse-by-name still focuses an existing window rather than reopening it at the new bounds.
- [x] 10a.3 Add the fullscreen hint to `routes/present/index.tsx`: visible while windowed, retiring after ~4s, hidden in fullscreen, re-shown with a fresh timer on leaving fullscreen, suppressed while blanked, and `pointer-events-none` so it never eats the double-click.
- [x] 10a.4 Track fullscreen with a `fullscreenchange` listener rather than assuming it, so `Esc` and OS-initiated exits are reflected.
- [x] 10a.5 Add `present.fullscreenHint` to `en`/`es`/`pt`.

## 11. Verification

- [x] 11.2 Drive the running web build in a real browser: start from the folder toolbar, advance with `→` and `Space`, jump by typed number, run past the last slide (does not wrap, does not re-send), `Home`, blank to black and restore, and `Esc` out to the console. Position readout, next-slide pane, notes pane, filmstrip marking, and the live payload were correct at every step, with no console errors. Also verified `/present` renders the black and white fields over a slide that stays mounted.
- [x] 11.6 Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and the unit suite at the workspace root — all green (61 tests).

Still unverified — each needs a environment or content this pass did not have:

- [ ] 11.1 Run the same deck end to end in the **desktop (Electron) build**. Only the web build was driven; the desktop shell's output-window handling (`setWindowOpenHandler`, remembered bounds) is untouched by this change but unexercised against it.
- [ ] 11.3 Exercise the deck-mutation rules against a **live** slideshow. The "never send on a deck change" half is verified, and the cursor logic is unit-tested — but the cursor-moves-to-survivor path could not be reached in-app: `useLibrary` does not refresh on cross-window storage events, and the console (the only editor) is unmounted while the slideshow runs, so a running deck cannot currently change. Either reach the path (add a folders refresh) or narrow the spec to match.
- [ ] 11.4 Check a deck mixing all four slide types, including a video slide and a YouTube slide, for double audio, filmstrip cost, and correct still frames. Needs real media files, which the seeded test deck had none of.
- [ ] 11.5 Confirm notes round-trip through an actual export/import. Verified only by code path so far: `toProjectFile` passes `folders` through untouched and both storage drivers persist whole `Folder` objects, so no serializer knows about `speakerNotes` at all.
