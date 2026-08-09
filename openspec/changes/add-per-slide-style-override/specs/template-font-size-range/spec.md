## ADDED Requirements

### Requirement: The font-size control reaches 800
The font-size control SHALL allow values from 16 up to 800, interpreted against the 1920px-wide reference canvas that every slide size is authored against. The range SHALL be defined in one shared place so that every surface offering the control — the template editor and the per-slide style editor — offers the same bounds.

#### Scenario: Choosing a size above the old cap
- **WHEN** the user drags the font-size control past 96 in the template editor
- **THEN** the control continues up to 800 and the preview renders the chosen size

#### Scenario: The same range in the per-slide editor
- **WHEN** the user opens the per-slide style editor
- **THEN** its font-size control offers the same 16–800 range as the template editor

#### Scenario: Fine adjustment at ordinary sizes
- **WHEN** the user adjusts the font size around a typical value such as 48
- **THEN** the control still moves in the same small increments it did before the range was widened

### Requirement: A large font size still auto-fits rather than clipping
A font size larger than the slide box can display SHALL be reduced by the existing auto-fit behavior so the text stays fully visible, rather than being clipped by the slide box. Auto-fit SHALL NOT enlarge text beyond the chosen size.

#### Scenario: A large size on a long verse
- **WHEN** a slide's font size is set to 700 and its text is a long verse
- **THEN** the rendered text shrinks to fit the slide box and no part of it is clipped

#### Scenario: A large size on a short line
- **WHEN** a slide's font size is set to 400 and its text is a single short word that fits
- **THEN** the text renders at exactly the chosen size, in the preview and in the projected output alike

### Requirement: A saved size outside the range is brought back into it
A font size read from storage, an imported template, or an imported project that falls outside the supported range SHALL be clamped into it rather than rendered as-is or discarded.

#### Scenario: Opening a file with an out-of-range size
- **WHEN** a project or template file specifies a font size above 800
- **THEN** the slide renders at 800 rather than at the stored value
