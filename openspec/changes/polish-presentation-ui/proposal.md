## Why

The presentation output and its preview panels have several visual and workflow rough edges that make the app feel unfinished in front of a live congregation: every rendered slide carries an unintended light-gray outline (glaring against dark/black backgrounds), the verse reference renders at a fixed small size disconnected from the scripture text's size and never shows which Bible version it came from, preview containers clip the slide's left/right edges, and getting a verse on screen still requires two separate manual steps (convert, then send to output) with no shortcut.

## What Changes

- Remove the unconditional `ring-1` outline rendered on every `SlidePreview` instance (`slide-preview.tsx`), which resolves to a light/mid-gray theme color visible against any slide background and is also the reason preview containers clip the slide's left/right edges (the ring's box-shadow has no room to render once the fitted slide box already spans the container's full width, so it gets cut off unevenly by the container's `overflow-hidden`, i.e. it renders as an asymmetric partial outline). Also ensure the Electron projector window opens without native OS window chrome.
- Make the on-slide verse reference ("Genesis 1:1") scale with the same font metrics as the scripture body text instead of a fixed `text-sm`, and append the Bible version's abbreviation (e.g. "RV1960") after the reference in a visibly lighter font weight — threading the version's `local_abbreviation` through from the Bible picker's selection data all the way to the rendered slide, since it is currently dropped after the verse is added to a folder.
- Audit the preview panels' container sizing so the fitted slide box is never clipped on its left/right edges, whether idle, mid-crossfade, or fading to empty.
- Add a "Present" action next to "Convert to Slide" in the Bible picker's Preview column that converts the current verse into a slide and immediately sends it to the projector output in one step, and wire the same convert-and-present behavior to a double-click on a verse in the Bible reader's verse list.
- Double-clicking an existing slide card in the console's folder grid immediately sends that slide to the projector output, without requiring the user to first select it and then click "Send to output" in the preview panel.

## Capabilities

### New Capabilities
- `slide-rendering`: How a slide (background, scripture text, verse reference, and Bible version label) is visually rendered for both the projector output and every preview/thumbnail surface — free of stray outline artifacts, with the reference sized proportionally to the body text and the version label rendered in a lighter weight beside it.
- `slide-preview-actions`: The Bible picker's Preview column actions — "Convert to Slide" and the new "Present" action — plus the double-click-to-present shortcut on a verse in the Bible reader.

### Modified Capabilities
_None — no existing specs in this project yet; both capabilities above are new._

## Impact

- `apps/bibletime/src/modules/presentation/components/slide-preview.tsx` — remove/replace the base ring, resize the reference text, render the version label.
- `apps/bibletime/src/modules/presentation/components/slide-frame.tsx` and `apps/bibletime/src/modules/presentation/hooks/use-slide-fit.ts` — verify fitted sizing isn't clipped by ancestor containers.
- `apps/bibletime/src/modules/library/components/preview-panel.tsx`, `apps/bibletime/src/modules/library/components/bible-picker-panel.tsx`, `apps/bibletime/src/modules/library/components/slide-card.tsx` — preview container wrappers (cropping audit).
- `apps/bibletime/src/modules/library/interfaces/index.ts` (`BiblePassageItemData`, `LiveSlidePayload`), `apps/bibletime/src/modules/library/lib/resolve-folder-item-content.ts` — thread the Bible version abbreviation through to the rendered slide.
- `apps/bibletime/src/modules/bible/components/verse-picker-list.tsx` — double-click handler.
- `apps/bibletime/src/modules/library/components/bible-picker-panel.tsx` — new "Present" button and shared convert+present handler, reusing the `setLiveSlide` + `window.open("/present", ...)` flow already used by `preview-panel.tsx`'s "Send to output" button.
- `apps/bibletime/src/modules/library/components/slide-card.tsx`, `apps/bibletime/src/modules/library/components/slide-console.tsx`, `apps/bibletime/src/modules/library/views/console-view.tsx` — double-click-to-present on an existing slide card in the folder grid.
- `apps/desktop/src/main.ts` — presentation window creation options (window chrome).
