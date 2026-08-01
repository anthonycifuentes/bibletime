## Context

`SlideFrame` (`apps/bibletime/src/modules/presentation/components/slide-frame.tsx`) is the wrapper used wherever a slide preview must fill a flexible box instead of a fixed-width one — the console's main preview panel (right-hand pane of `ConsoleView`) and the `/present` output window. It renders:

```tsx
<div className="flex ... items-center justify-center overflow-hidden" {...frameClassName}>
  <SlidePreview className="h-full max-h-full w-full max-w-full" style={{ aspectRatio: ratio }} />
</div>
```

Per the CSS Box Sizing spec, `aspect-ratio` only participates in size resolution when at least one of `width`/`height` is auto and gets computed from the other via the preferred ratio. Here both `width: 100%` (`w-full`) and `height: 100%` (`h-full`) are explicit, so `aspect-ratio` never triggers — the element just stretches to its container's box, ignoring the configured ratio entirely. That's the console main-preview bug.

Separately, `SlidePreview`'s font size is `template.fontSize * scale`, where `scale` defaults to `1` and is otherwise a hand-picked constant per call site (`0.32` in `slide-card.tsx`, `0.26`/`0.32` on `bible-picker-panel.tsx`'s `SlideFrame`). None of these track the box's actual rendered width, so as the panel resizes (window resize, aspect ratio switched to something narrower/wider) the text no longer matches the box proportionally — it was never derived from real dimensions to begin with.

Both problems trace back to the same missing piece: nothing measures the box the slide is actually rendered into.

## Goals / Non-Goals

**Goals:**
- `SlideFrame` renders the slide at exactly the configured aspect ratio, letterboxed/pillarboxed within whatever box its parent gives it, regardless of that parent's own layout (flex, grid, arbitrary).
- Font size (and other px-authored template metrics that depend on it) scales proportionally to the preview's actual rendered width, so a smaller preview shows proportionally smaller text instead of the template's literal, full-output pixel value.
- The scale is computed automatically; an explicit `scale` prop passed by a caller still wins (needed for the template editor's intentionally full-size preview).
- Fixed-width thumbnail call sites (`slide-card.tsx`) get the same real-measurement-based scale instead of a hand-picked constant, and `bible-picker-panel.tsx`'s now-redundant explicit `scale={0.32}` on `SlideFrame` is dropped in favor of the computed value.

**Non-Goals:**
- No change to `SlideTemplate`'s schema or to how `fontSize`/`lineHeight`/`letterSpacing` are authored/persisted — only how they're *displayed* in a preview.
- No text auto-fit/shrink-to-avoid-overflow behavior — this only makes the preview a proportionally correct miniature of the real output; a template whose text overflows the real output will still overflow proportionally in the preview (unchanged, expected).
- The template editor's preview (`routes/templates/$templateId.tsx`) intentionally shows text at authored (real) size for editing and stays out of scope — it isn't the "main screen" bug reported and changing it would change the editing experience, not fix a bug.

## Decisions

### 1. Replace CSS `aspect-ratio` fitting with a measured, computed-dimension fit

A `ResizeObserver`-backed hook (`useSlideFit`, new file `apps/bibletime/src/modules/presentation/hooks/use-slide-fit.ts`) watches the outer frame's content box and computes the largest `{ width, height }` (in px) that both fits inside the observed box and satisfies the target ratio — the standard "contain" fit calculation:

```
if (boxWidth / boxHeight > ratio) {
  height = boxHeight; width = boxHeight * ratio
} else {
  width = boxWidth; height = boxWidth / ratio
}
```

`SlideFrame` applies these as explicit inline `width`/`height` on `SlidePreview`'s root instead of `w-full h-full` + CSS `aspect-ratio`. Explicit pixel dimensions can't be silently ignored the way `aspect-ratio` was, and this works identically no matter what layout mode the parent uses — no reliance on flex-specific `aspect-ratio` resolution quirks.

**Alternative considered:** keep CSS `aspect-ratio` but drop one of `w-full`/`h-full` so the other axis stays auto (the pattern that *does* work for the fixed-width thumbnails). Rejected for `SlideFrame` specifically because both axes are genuinely unconstrained there (the frame must fit within a box that's flexible in both dimensions) — there's no single axis to leave auto that guarantees containment in the other, so a real measurement is required regardless.

### 2. Font scale derived from the same measurement, against a fixed reference width

`useSlideFit` also returns `scale = width / REFERENCE_WIDTH`, where `REFERENCE_WIDTH` is a module constant (`1920`, matching the resolution slide templates are effectively authored against — a standard 16:9 HD output). `SlideFrame` passes this down as `SlidePreview`'s `scale` prop unless the caller already supplied one explicitly (explicit `scale` always wins — `props.scale ?? computedScale`).

**Alternative considered:** a reference tied to the *current* aspect ratio (e.g. reference height for portrait ratios) instead of always width. Rejected — template authors design against one canvas independent of the currently selected ratio, and keeping the reference axis fixed to width means switching ratios changes preview text size exactly as it would change real output text size (a narrower canvas naturally reads smaller), which is the desired behavior, not an artifact to correct for.

### 3. Reuse the same measurement for fixed-width thumbnails

`slide-card.tsx`'s thumbnail already gets a correct height from CSS `aspect-ratio` (only width is constrained there, so the CSS mechanism isn't broken) — but its `scale={0.32}` is still a guess. It switches to a lighter hook, `useElementWidthScale` (same file as `useSlideFit`, sharing the `REFERENCE_WIDTH` constant), which measures just the element's own `clientWidth` via `ResizeObserver` and returns `width / REFERENCE_WIDTH` — no fit math needed since the height is already correctly derived by CSS.

`bible-picker-panel.tsx` already renders its preview column through `SlideFrame` (a follow-on from the earlier aspect-ratio change); its explicit `scale={0.32}` override is simply removed so it falls through to `SlideFrame`'s computed value like every other `SlideFrame` consumer.

## Risks / Trade-offs

- **[Risk]** `ResizeObserver` fires asynchronously, so the very first render has no measurement yet (`width`/`height` are `0`) → **Mitigation**: render `SlidePreview` at `scale={1}` with `width`/`height` unset (falls back to filling the container unscaled) until the first observer callback fires, matching the current pre-fix visual for a single frame — no layout thrash, no flash of a 0×0 box.
- **[Risk]** Two similar-but-not-identical hooks (`useSlideFit` for flexible boxes, `useElementWidthScale` for fixed-width ones) could drift → **Mitigation**: both live in the same `hooks/use-slide-fit.ts` file and share the single exported `REFERENCE_WIDTH` constant, so there's one number to tune and one place reviewers look for both.
- **[Trade-off]** Pixel-based sizing (vs. the previous pure-CSS approach) means `SlideFrame`'s dimensions no longer update purely through layout/CSS — they update on the next `ResizeObserver` tick. In practice this is imperceptible (sub-frame on modern Chromium/Electron) and is what every "letterbox to fit" implementation using `ResizeObserver` already accepts.

## Migration Plan

Pure rendering fix, no data migration. Roll out as a normal PR; if a regression surfaces, reverting the two changed files (`slide-frame.tsx`, `slide-preview.tsx`) plus the new hook file restores prior (broken but familiar) behavior.
