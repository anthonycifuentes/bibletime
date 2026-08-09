## Context

The console and the output window already exist and already talk to each other. What is missing is the thing in between.

Five facts about the current implementation shape this design:

1. **The output window is fed by one function.** `setLiveSlide(payload)` writes a fully-resolved slide to `localStorage`; `useLiveSlide()` in the `/present` route reads it back and re-reads on `storage` events. The payload is denormalized (`text`, `reference`, `versionLabel`, `media`, `template`), so `/present` knows nothing about folders, items, or content types. Anything that can build that payload can drive the output — which means the slideshow needs no new transport at all.
2. **`sentAt` is load-bearing.** `localStorage` fires `storage` only when the written value differs, so every send is stamped. That stamp is also the video/animation restart key (`mediaPlaybackKey`). Any state the slideshow adds to the payload has to respect this: a change that should *not* restart media must not look like a new send.
3. **The console's shell state is a module-level store, not component state.** `useConsoleStore` holds `openFolderId`, `selectedItemIds`, and `lastSelectedItemId` precisely so navigating to another top-level route and back does not lose them. A route that leaves and re-enters the console shell is an established pattern here (the template editor already does it).
4. **Every surface renders through the same two components.** `SlidePreview` draws a slide; `SlideFrame` letterboxes it to `useAspectRatio()`'s ratio. The console grid, the preview panel, and `/present` are all the same component at different sizes. `SlidePreview` autoplays video and YouTube unconditionally.
5. **Resolution is centralized.** `resolveFolderItemContent(item, templates)` is the one place a `FolderItem` becomes renderable content, including the per-slide `templateOverride` merge. It lives in `library/lib`, and feature modules never import each other's internals.

The reference designs are PowerPoint's and Google Slides' presenter views. Both show the same five regions — current slide, next slide, notes, a control strip with position and timer, and a numbered filmstrip. Their chrome (beveled panels, toolbars of small monochrome glyphs, a top bar of text buttons) is not this app's language and is not carried over; the regions and the interaction grammar are.

## Goals / Non-Goals

**Goals:**

- One key press advances a service. The operator never returns to the console mid-run.
- The current-slide pane is a truthful mirror of the projected output, not an approximation of it.
- The next slide and the current slide's notes are visible without any interaction.
- Any slide in the deck is reachable in one action — a filmstrip click or a typed number.
- The output can be blanked and restored without losing position or restarting media.
- Entering and leaving the slideshow is lossless in both directions: the slideshow starts where the console was, and the console lands where the slideshow ended.
- The output window and its route are untouched apart from one additive state.
- Identical behavior in the desktop and web builds.

**Non-Goals:**

- A second audience-facing surface. `/present` stays the only one.
- Presenting across multiple folders or a whole project in one run.
- Auto-advance, timed slides, or a rehearsal/kiosk mode.
- Editing slides — text, template, or order — from inside the slideshow.
- Editing notes from inside the slideshow (see decision 8).
- Transitions between slides beyond what a template's own entrance animation already does.
- Remote control from a phone, or any network transport. The channel stays `localStorage` between two windows of the same browser profile.
- Drawing, laser pointer, or annotation over the slide.

## Decisions

### 1. The slideshow is a view in the `library` module, not a module of its own

It lives at `modules/library/views/slideshow-view.tsx`, with its parts under `modules/library/components/slideshow/`.

The name suggests a module, but the dependencies say otherwise: the deck is `Folder.items`, each slide resolves through `resolveFolderItemContent`, the entry point reads `openFolderId` off the console store, and the exit writes back a selection. Every one of those is `library` internals. A `modules/slideshow` module would have to reach into them — the one thing the architecture forbids — or force `resolveFolderItemContent`, the console store, and the folder interfaces up into `core`, which would move console-specific logic into shared space to serve a single caller.

`console-view.tsx` and `slideshow-view.tsx` end up as two peer views over the same data, which is what they are.

**Alternative considered:** a `modules/slideshow` module with the resolvers promoted to `core`. Rejected — the promotion is a large, purely mechanical refactor whose only beneficiary is a naming preference, and `core` would gain folder-shaped types it has no other reason to know about.

### 2. The route replaces the console shell rather than nesting inside it

`/slideshow` is a top-level route rendering the view directly — no `HeaderBar`, no `UpdateBanner`, no bottom drawer, no resizable panels. It fills the viewport on a flat near-black surface.

This is what makes the console store's design pay off: the console shell unmounts, and `openFolderId`, `selectedItemIds`, and `lastSelectedItemId` survive because they never lived in it. Coming back to `/library` re-renders the console exactly as it was left.

**Alternative considered:** a fullscreen overlay inside `console-view`. Rejected — the console's panel tree, drawer, and its own keyboard handling would all stay mounted underneath, competing for keystrokes during the one activity where a stray shortcut is least acceptable.

### 3. The deck is the open folder's items, and the cursor is an item id

The deck is `folders.find(f => f.id === openFolderId)?.items` — live, not a snapshot. The cursor is the **id** of the current slide, not its index.

That distinction is the whole point. Autosave, another window, or an undo can change the folder while a slideshow is running. With an index cursor, a slide deleted above the cursor silently shifts the presentation one slide off. With an id cursor:

- **Reorder** — the cursor follows its slide to the new position. The filmstrip and the `n of N` readout update; nothing is re-sent.
- **Insertion** — the deck grows, `N` updates, the current slide is unchanged.
- **The current slide is deleted** — the cursor moves to the nearest surviving neighbor (the item that took its index, else the last item) and the view marks the deck as having changed, **but nothing is sent to the output.** The projector keeps showing what it was showing until a human presses a key. Silently changing what a congregation is looking at is the failure mode worth designing against.
- **The deck becomes empty, or the folder is deleted** — the view drops to its empty state with an explicit exit; the output holds its last slide.

**Alternative considered:** snapshot the items on entry and ignore later edits. Rejected — the filmstrip would drift from the library, and a slide fixed mid-service (a typo in a verse, a relinked media file) would not reach the projector.

### 4. Entering seeds from the selection; exiting writes it back

Start position: `lastSelectedItemId` if it is in the deck, else the first item. Exit: `selectItem(currentItemId)` on the console store.

So "open the folder, click slide 4, start" begins at slide 4; and "exit at slide 9" leaves the console with slide 9 selected and previewed. No new persisted state, and re-entering resumes where the last run ended because the exit already moved the selection there.

**Alternative considered:** a `slideshowIndex` in the console store. Rejected — it would be a second cursor to keep in sync with the selection, and the two would disagree the first time a user clicked a card between runs.

### 5. The slideshow drives the output through `setLiveSlide` and nothing else

Advancing resolves the current item through `resolveFolderItemContent` and calls `setLiveSlide` with exactly the payload the preview panel builds today. `/present` needs no knowledge that a slideshow exists.

The output window is opened **inside the click handler that starts the slideshow**, before navigating — `window.open` outside a user gesture is what browser popup blockers exist to stop, and the web build's output window is a popup. Starting therefore does three things in one gesture: `window.open("/present", "bibletime-present")`, `setLiveSlide(firstSlide)`, `navigate("/slideshow")`. Subsequent advances are `setLiveSlide` only; the window is already open and the fixed window name means a re-open would refocus it anyway, stealing focus from the operator mid-service.

If the operator closes the output window mid-run, the slideshow keeps working — it is writing to `localStorage`, which nobody is reading. The control bar carries a "Reopen output" action for that case; detecting the closure is best-effort (the `Window` handle from `window.open` exposes `closed`, but only for windows this document opened) and the action is always available rather than conditionally shown.

### 6. Blanking is a field on the payload, not an empty slide

`LiveSlidePayload` gains `blank?: "black" | "white"`. `/present` renders a solid field of that color above everything when it is set, and renders normally when it is not.

The current slide stays in the payload throughout. That is what makes restoring instant and lossless: the slide's DOM is never unmounted, so a video keeps playing behind the blank and an entrance animation does not re-run when the blank lifts. Sending an empty payload instead would discard the slide, and restoring would be a fresh send with a new `sentAt` — restarting the countdown video the blank was covering.

**A blank toggle does not re-stamp `sentAt`.** The obvious worry is that it must — `localStorage` fires a `storage` event only when the written value differs, which is the whole reason `sentAt` exists. But `blank` is itself part of the serialized payload, so toggling it already changes the stored string and the event fires on its own. Nothing needs bumping.

That keeps `sentAt` meaning exactly "when the slide was sent", which is what `/present` already uses as `mediaPlaybackKey`. So the restart rule needs no new mechanism and no composite key: `sentAt` moves on a new slide and on a deliberate re-send, and on nothing else. "Blanking never restarts media" becomes structural rather than a rule the output window has to apply.

**Alternative considered:** a separate `localStorage` key for the blank state, leaving the slide payload untouched. Rejected — two keys means two `storage` events with no ordering guarantee, and a window that misses one shows a blanked projector with no way to know it should not be.

### 7. Three panes, two playback modes

`SlidePreview` gains `playback?: "live" | "still"` (default `"live"`, so every existing call site is unchanged).

- **Current-slide pane** — `"live"`, so the operator sees literally what the room sees, including a running video or a playing animated background. Audio is forced off in this pane: two decoders playing the same file a few milliseconds apart is an audible echo, and the room's audio comes from the output window.
- **Next-slide pane and filmstrip** — `"still"`. Video renders its first frame (`preload="metadata"`, no `autoPlay`), and the animated-background shader is not mounted at all, leaving the solid backdrop `backgroundStyle` already applies for that background type. A filmstrip of thirty live slides would mean thirty WebGL contexts and thirty video decoders for content nobody is watching.

  A YouTube slide renders a **local** placeholder — its title over the same black field the player would fill — rather than YouTube's poster image. The poster would be a per-thumbnail network fetch, and this app works offline; a filmstrip of broken remote thumbnails is worse than one that never reaches the network.

**Alternative considered:** render the current-slide pane as a still too, and trust the operator to look at the projector. Rejected — the operator frequently cannot see the projector, which is the reason the pane exists.

### 8. Notes live on the item, are authored in the console, and are read-only in the slideshow

`FolderItem` gains `speakerNotes?: string`, beside `templateOverride`. It persists for free: folder saves, project autosave, and `ProjectFile` export all carry `items` wholesale, which is the same reason the per-slide style override was put there.

Authoring happens in the console — a "Notes" action on the slide card and in the preview panel, opening the same small editor. The slideshow renders them read-only, with `A˄`/`A˅` steppers adjusting display size (persisted in `localStorage` as an operator preference, not on the slide — the same notes on a different machine should not inherit a different size).

Read-only is a deliberate restriction, not a missing feature. An editable textarea inside the slideshow would swallow every navigation key the moment it took focus, and a debounced write-through would fire autosave during a live service. PowerPoint's presenter view makes the same call.

### 9. One keyboard handler, owned by the view

A single `keydown` listener on `window`, mounted by the slideshow view and removed on unmount. It ignores events whose target is an editable element, so the app's own inputs elsewhere are never affected (there are none in this view, but the guard costs nothing and makes a future search field safe).

| Keys | Action |
| --- | --- |
| `→` `↓` `Space` `PageDown` `Enter` | Next slide |
| `←` `↑` `PageUp` `Backspace` | Previous slide |
| `Home` / `End` | First / last slide |
| digits, then `Enter` | Jump to that slide number |
| `B` / `.` | Toggle black |
| `W` / `,` | Toggle white |
| `F` | Toggle fullscreen for the slideshow view |
| `Esc` | Exit the slideshow |

The digit buffer accumulates keystrokes and clears after ~1.2s of inactivity or on `Enter`, showing what has been typed so the operator can see `12` before committing. `Enter` is bound to both "next" and "commit jump" without ambiguity: with a non-empty buffer it commits, otherwise it advances.

`Esc` is subtle in a fullscreen browser: the browser consumes the first `Esc` to leave fullscreen and the handler never sees it, so a fullscreen operator presses `Esc` twice — once to un-fullscreen, once to exit. This is standard browser behavior and is left alone rather than worked around; the control bar's Exit button is the unambiguous path.

`F` fullscreens the *slideshow view*, not the output — the output window has its own `F`/double-click fullscreen, and there is no reliable way to fullscreen another window from this one.

### 10. The timer is wall-clock arithmetic, not a tick counter

Elapsed time is `accumulatedMs + (now - startedAt)`, re-read on a 1s interval for display only. A counter incremented per tick drifts when the tab is throttled — and a browser throttles background timers hard, which is exactly what happens when the operator clicks into the output window. Pause stores the accumulation and clears `startedAt`; reset zeroes both. It starts running on entry and is not persisted: a timer restored from a previous session would be a lie about this service.

The wall clock beside it is `toLocaleTimeString` on the same interval, in the app's active locale.

### 11. Guarded entry

`/slideshow` with no open folder, an unknown folder, or an empty folder does not render a broken presenter view — it redirects to `/library`. The entry points are disabled when the open folder has no items, so reaching the redirect requires deep-linking or a mid-run deletion.

### 12. Everything user-visible is a `slideshow.*` key

Position (`{{current}} of {{total}}`), pane labels, control tooltips, the blank states, the empty state, and the exit action all go through the `en`/`es`/`pt` dictionaries. `en.ts` is the typed source of truth, so a missing translation fails `tsc` rather than falling back silently.

## Risks / Trade-offs

- **The output popup is blocked on web** → It is opened inside the start click, the one place browsers permit it. If it is still blocked, the slideshow runs anyway and the control bar's "Reopen output" gives the operator a second, equally gesture-backed attempt.
- **Single-display operators see the output window covering the presenter view** → Not solved here, and not new: the output window is already movable, resizable, and remembers its placement. A single-display user is expected to run the output on the projector and the console on the laptop screen, which is the two-display case.
- **The current-slide pane doubles video decoding** → Accepted for the pane the operator actually needs to trust; contained by making the filmstrip and next-slide pane still frames, which is where the count would otherwise scale with deck size.
- **A large deck renders many filmstrip thumbnails at once** → Still-frame rendering makes each one cheap, and a folder is a running-order unit that rarely exceeds a few dozen slides. Virtualization is deliberately deferred rather than built speculatively; if decks grow, the filmstrip is a self-contained component to virtualize later.
- **The deck changes under a running slideshow** → Handled by the id cursor (decision 3), whose rule is that a change never sends to the output on its own.

  **Found during implementation:** this path is currently *unreachable*. `useLibrary` re-reads folders only through its own mutations, and the console — the only thing that mutates them — is unmounted for the duration of the slideshow. A second window editing the same project does not propagate, because nothing listens for `storage` events on the folders key. The handling is therefore defensive rather than active: the half that matters for safety (never send on a change) holds trivially, and the cursor logic is unit-tested, but the "slide deleted under you" behavior cannot be exercised in the app as it stands. Reaching it means giving `useLibrary` a cross-window refresh, which is a change to the console's data layer and out of scope here.
- **`localStorage` is unavailable or full** → `setLiveSlide` already swallows this, and the slideshow inherits that behavior: the presenter view keeps working and the output stops updating. Not made worse, not fixed here.
- **`Esc` needing two presses in fullscreen surprises people** → Mitigated by an always-visible Exit control and by `F` being a toggle, not a one-way door.
- **Notes are read-only mid-service** → A real limitation, chosen over the keyboard and autosave hazards of an editable field (decision 8). The console is one `Esc` away.

## Migration Plan

No migration. `speakerNotes` and `blank` are optional fields on existing shapes: folders and project files written before this change load unchanged, and files written after it load in an older build with the notes ignored. `SlidePreview`'s `playback` prop defaults to today's behavior, so no existing call site changes meaning. The feature is additive — with the new route unvisited, the console and output window behave exactly as they do now.
