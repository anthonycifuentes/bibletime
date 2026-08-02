## ADDED Requirements

### Requirement: Text shrinks to stay fully visible inside the slide box
`SlidePreview` SHALL measure the rendered text against its box and, when the text is taller than the box at the nominal font size (the template's authored `fontSize` multiplied by any caller-supplied responsive `scale`), reduce the effective font size until the text fits, down to a minimum floor. This SHALL apply to every surface that renders `SlidePreview` with real (non-empty) text — the template editor's preview, the console's live preview, thumbnails, and the `/present` projector output.

#### Scenario: A long verse that would otherwise overflow
- **WHEN** `SlidePreview` renders a verse whose text at the nominal font size is taller than the available box
- **THEN** the effective font size shrinks until the text fits fully inside the box, and no part of the text is clipped by the box's overflow boundary

#### Scenario: A short verse that already fits
- **WHEN** `SlidePreview` renders a verse whose text at the nominal font size already fits inside the box
- **THEN** the text renders at exactly the nominal font size — auto-fit never enlarges it beyond the authored size and never shrinks text that already fits

#### Scenario: Box is resized while text is displayed
- **WHEN** the box `SlidePreview` renders into changes size (e.g. the editor's two-pane layout reflowing, or a window resize)
- **THEN** the auto-fit measurement re-runs and the effective font size adjusts to the new box size

### Requirement: A readable minimum floor on auto-fit shrinking
Auto-fit SHALL NOT shrink the effective font size below a minimum floor (18px at the reference 1920px-wide canvas scale). Text that would still overflow the box at the floor size SHALL render at the floor size and may clip, rather than continuing to shrink toward unreadability.

#### Scenario: Verse too long even at the floor
- **WHEN** a verse's text still overflows the box after auto-fit has reduced the font size to the minimum floor
- **THEN** the font size stops shrinking at the floor and the text is left at that size (clipping if still necessary), rather than shrinking further
