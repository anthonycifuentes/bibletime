## Why

Today the console can send exactly one slide to the output window at a time. Running a service means going back to the grid, finding the next slide, and clicking "Send to output" again — with the projected result living in a window the operator often cannot see, and the next slide living only in their memory. Every presentation tool solves this with a *presenter view*: a dedicated screen for the person driving, showing what the room sees now, what it sees next, the notes for this moment, and a single key that moves the service forward.

BibleTime has the two halves already — an ordered folder of slides and a chrome-less `/present` output window — and nothing that joins them. The slideshow view is that join: the folder becomes a deck, the arrow key becomes the advance, and the operator stops navigating a file browser during a service.

## What Changes

### A new full-window `/slideshow` view, driven by the open folder

Entered from the console (a "Start slideshow" action on the open folder and in the preview panel) and from the folder tree's context menu. The open Library folder's items, in their existing order, are the deck. Leaving returns to `/library` with the console exactly as it was.

The layout is adapted from the reference presenter views to this app's minimalist language — flat dark surface, no bevels or panel chrome, one accent for "you are here":

- **Current slide** — large, letterboxed to the configured aspect ratio, showing exactly what the output window is showing.
- **Next slide** — a small preview in the right column, so the operator always knows what one more press produces.
- **Notes** — the current slide's speaker notes, under the next-slide preview, with the two font-size steppers from the reference design. Read-only here; authored in the console.
- **Control bar** — previous/next, a `3 of 12` position readout, an elapsed timer with pause/reset, the wall clock, blank-output toggles, and Exit.
- **Filmstrip** — a numbered, horizontally scrollable strip of every slide in the deck, the current one marked, any slide clickable to jump straight to it.

### Advancing is the only thing the operator has to do

`→` / `Space` / `PageDown` / click advance; `←` / `PageUp` go back; `Home` / `End` jump to the ends; typing a number and pressing `Enter` jumps to that slide. Each move sends that slide to `/present` through the existing live-slide channel, so the output window needs no changes to follow along. Starting the slideshow opens (or focuses) the output window and sends the first slide in the same action.

### The output can be blanked without losing your place

`B` blanks the output to black, `W` to white, either key again restores it. The control bar mirrors both as toggles. Blanking is a state on the live payload rather than an empty slide, so the current slide is still current, the filmstrip still marks it, and unblanking does not restart a video or re-run an entrance animation.

### Slides gain speaker notes

`FolderItem` gains an optional `speakerNotes` string — what the operator or speaker needs to remember at this point in the service, never rendered on the projected output. Authored in the console from the slide card's actions and the preview panel; displayed in the slideshow's notes pane. Persisted wherever items already are, so notes travel with folder saves, project autosave, and exported project files.

### What this is not

Not a second output surface — `/present` remains the only thing an audience sees, and the slideshow view is a controller in the console window. Not a rehearsal or recording tool. Not an auto-advancing kiosk. Not a whole-project run: a slideshow presents one folder, which is the unit the console already treats as a running order.

## Capabilities

### New Capabilities

- `slideshow-view`: The presenter view itself — entering and leaving, which slides make up the deck, the current/next/notes/filmstrip layout, the position readout, the elapsed timer and wall clock, and the empty and unavailable states.
- `slideshow-navigation`: The advance grammar — pointer and keyboard bindings, jump-to-number, filmstrip jumps, behavior at the first and last slide, and what happens when the deck changes underneath a running slideshow.
- `slideshow-output-control`: The relationship between the slideshow and the `/present` window — opening it on start, mirroring every move, blank-to-black/white and restore, and the states where no output window is open or it is closed mid-service.
- `slide-speaker-notes`: Per-slide notes as stored data — authoring and editing them in the console, showing them in the slideshow, adjusting their display size, their exclusion from the projected output, and their persistence through save, autosave, and project export/import.

### Modified Capabilities

<!-- `openspec/specs/` is empty; these capability names come from earlier changes
     that have not been synced yet, whose requirements this change amends. -->

- `presentation-output-window`: The output window gains a blanked state — it renders a solid black or white field on request, holding the current slide so restoring it does not re-send or restart media.
- `present-window-launch`: Starting a slideshow becomes a second trigger that opens or focuses the output window, alongside "Send to output".
- `slide-console`: The open folder gains a "Start slideshow" action, and a slide card gains a "Notes" action for authoring its speaker notes.
- `console-shell-navigation`: `/slideshow` is added as a top-level route that replaces the console shell for its duration (no header bar, no bottom drawer) and returns to `/library` on exit.
- `project-file-portability`: Exported and imported project files carry each slide's `speakerNotes`.

## Impact

- **`apps/bibletime/src/modules/library`** — new `views/slideshow-view.tsx` and `components/slideshow/*` (current pane, next pane, notes pane, control bar, filmstrip); new `actions/use-slideshow.ts` (deck resolution, position, timer); `interfaces/index.ts` (`FolderItem.speakerNotes`, `LiveSlidePayload.blank`); `services/live-slide.ts`; `components/slide-console.tsx`, `components/slide-card.tsx`, `components/preview-panel.tsx`, `components/folder-tree.tsx` for the new entry points and the notes action. The slideshow lives in `library` rather than a module of its own because it is a second view over the same folders and items the console view already owns.
- **`apps/bibletime/src/routes/slideshow/index.tsx`** — the new route.
- **`apps/bibletime/src/routes/present/index.tsx`** — renders the blanked state.
- **`apps/bibletime/src/modules/presentation`** — `SlidePreview` gains a still-frame playback mode so the next-slide pane and the filmstrip do not start a second copy of every video.
- **`apps/bibletime/src/modules/core/i18n`** — `slideshow.*` keys in `en`, `es`, and `pt`.
- **Dependencies** — none added.
- **No breaking changes to stored data.** `speakerNotes` and `blank` are optional additions; folders, items, and project files written by earlier versions load unchanged, and files written by this version load in earlier versions minus the notes.
