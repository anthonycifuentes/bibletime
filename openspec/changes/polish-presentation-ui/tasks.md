## 1. Remove the unwanted slide border/ring and fix preview clipping

- [x] 1.1 Remove the `ring-1` class from `SlidePreview`'s root element (`apps/bibletime/src/modules/presentation/components/slide-preview.tsx`).
- [ ] 1.2 Visually verify no border/outline remains on: the `/present` output window, the console's `PreviewPanel`, the Bible picker's Preview column, `SlideCard` thumbnails, and the template manager/editor's `SlidePreview` usages — across at least one black-background and one light-background template.
- [ ] 1.3 Visually verify the left/right clipping is resolved in the same surfaces, both at rest and mid-crossfade (switch between two folder items or verses quickly to trigger the GSAP transition).
- [ ] 1.4 If any clipping remains after 1.1, inspect the container chain (`SlideFrame`'s own wrapper vs. the panel's outer wrapper) for unaccounted padding/border and adjust.

## 2. Remove native window chrome from the projector output

- [x] 2.1 Add `frame: false` to the presentation window's `BrowserWindow` options in `apps/desktop/src/main.ts`'s `setWindowOpenHandler`.
- [ ] 2.2 Verify the output window still opens, closes, and reuses the same named window (`bibletime-present`) correctly with no native title bar.

## 3. Scale the verse reference with the body text

- [x] 3.1 In `slide-preview.tsx`, replace the reference `<p>`'s fixed `text-sm` sizing with an inline `fontSize` matching the body text's exactly (`textStyle.fontSize`, i.e. `template.fontSize * scale`).
- [ ] 3.2 Visually verify the reference grows/shrinks in proportion to the body text across at least two very differently sized fitted containers (e.g. a small thumbnail vs. the full output window).

## 4. Thread the Bible version label onto the slide

- [x] 4.1 Add `versionAbbreviation?: string` to `BiblePassageItemData` (`apps/bibletime/src/modules/library/interfaces/index.ts`).
- [x] 4.2 Add `versionLabel?: string` (or reuse a shared naming) to `LiveSlidePayload` and to `SlidePreviewProps`.
- [x] 4.3 Populate `versionAbbreviation` in `BiblePickerPanel.handleConvert` from the currently selected version's `local_abbreviation`.
- [x] 4.4 Forward the version label through `resolveFolderItemContent` (`apps/bibletime/src/modules/library/lib/resolve-folder-item-content.ts`) into the resolved content passed to `SlidePreview`.
- [x] 4.5 Render the version label in `slide-preview.tsx` as a second span inside the reference line, after the reference text, in a visibly lighter font weight — omitted entirely when no version label is present.
- [ ] 4.6 Verify the format reads as e.g. "Genesis 1:1 RV1960" with only "RV1960" in the lighter weight, and that older/existing folder items without a stored version label still render the reference alone with no placeholder text.

## 5. Add the Preview column's "Present" action

- [x] 5.1 In `bible-picker-panel.tsx`, add a `handlePresent` function that performs the same conversion as `handleConvert` and then calls `setLiveSlide({ text: pendingText, reference: pendingReference, template: effectiveTemplate })` followed by `window.open("/present", "bibletime-present")`.
- [x] 5.2 Add a "Present" button next to "Convert to Slide", disabled under the same `canConvert` condition.
- [ ] 5.3 Verify clicking "Present" both adds the verse to the open folder and immediately shows it on the `/present` output window.

## 6. Add double-click-to-present on a verse

- [x] 6.1 Add an `onDoubleClick` prop to `VersePickerList` (`apps/bibletime/src/modules/bible/components/verse-picker-list.tsx`), wired to each verse button alongside the existing `onClick`.
- [x] 6.2 In `BiblePickerPanel`, implement the `onDoubleClick` handler to resolve text/reference for the double-clicked verse number directly (reusing the same lookup `pendingText`/`pendingReference` already use, parameterized by the clicked verse), update `pendingVerseNumber` to match, then run the same convert-and-present steps as `handlePresent`.
- [ ] 6.3 Verify double-clicking a verse adds it to the open folder and presents it immediately, and that double-clicking has no effect when no Library folder is open.

## 7. Add double-click-to-present on an existing slide card

- [x] 7.1 Add an `onDoubleClick` prop to `SlideCard` (`apps/bibletime/src/modules/library/components/slide-card.tsx`), fired from the same clickable `div` that currently handles `onClick`/`onKeyDown`.
- [x] 7.2 Thread the prop through `SlideConsole` (`apps/bibletime/src/modules/library/components/slide-console.tsx`) the same way `onSelect` is already forwarded per-card.
- [x] 7.3 In `console-view.tsx`, implement `onPresentItem(itemId)`: select the item via the existing `selectItem` action, resolve its content with `resolveFolderItemContent` (same helper `PreviewPanel` uses), then call `setLiveSlide({...})` followed by `window.open("/present", "bibletime-present")`.
- [ ] 7.4 Verify double-clicking a slide card selects it (matching single-click) and immediately shows it on the `/present` output window, and that this doesn't interfere with the card's drag-to-reorder handle.

## 8. Final pass

- [ ] 8.1 Run the app (desktop build) and walk through all fixes end-to-end against a real Bible passage and a black-background template.
- [x] 8.2 Run existing lint/typecheck for the touched packages.
