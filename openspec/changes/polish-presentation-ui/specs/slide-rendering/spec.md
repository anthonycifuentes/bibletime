## ADDED Requirements

### Requirement: Slide render has no unintended border or outline
A rendered slide (on the projector output or any preview/thumbnail surface) SHALL display only what the active `SlideTemplate` defines — background, text, reference, and version label — with no additional visible border, outline, or ring painted by the rendering component itself, regardless of the slide's background color.

#### Scenario: Slide with a black background
- **WHEN** a slide using a solid black background is rendered on the projector output, the console's preview pane, the Bible picker's Preview column, or a slide thumbnail
- **THEN** no light or gray border/outline is visible around the slide's edges

#### Scenario: Projector output window has no native window chrome
- **WHEN** the presentation output window is opened
- **THEN** it shows no OS-native title bar or window frame around the projected content

### Requirement: Slide fits its container without left/right clipping
When a slide is fitted into a container that flexes in both dimensions (letterboxed/pillarboxed), the fitted slide box SHALL be fully visible — neither edge of the slide is cut off by the container regardless of the container's aspect ratio relative to the slide's aspect ratio.

#### Scenario: Slide pillarboxed to a container's full width
- **WHEN** the fitted slide box spans the full width of its container (letterboxed top/bottom)
- **THEN** the slide's left and right edges render fully visible, with no partial clipping of the slide box itself or any decoration on it

#### Scenario: Slide during a content crossfade
- **WHEN** the displayed text/reference crossfades between two pieces of content in the same preview container
- **THEN** the slide's left and right edges remain fully visible throughout the transition

### Requirement: Verse reference scales proportionally with the scripture text
The on-slide verse reference (e.g. "Genesis 1:1") SHALL render at a size derived proportionally from the same base size and scale factor as the scripture body text, so that it grows and shrinks in sync with the body text across different output/preview sizes.

#### Scenario: Larger output resolution
- **WHEN** the same slide is rendered in a larger fitted container (e.g. the full projector output vs. a small thumbnail)
- **THEN** both the scripture text and the verse reference render larger in the same proportion, rather than only the scripture text scaling

### Requirement: Bible version label renders beside the reference in a lighter weight
When a Bible-passage slide's source version is known, its abbreviation (e.g. "RV1960") SHALL render immediately after the verse reference on the same line, visibly lighter in font weight than the reference text next to it.

#### Scenario: Verse converted from a specific Bible version
- **WHEN** a verse selected from a specific Bible version (e.g. "RV1960") is presented
- **THEN** the slide shows the reference followed by the version abbreviation (e.g. "Genesis 1:1 RV1960"), with "RV1960" rendered in a lighter font weight than "Genesis 1:1"

#### Scenario: Version abbreviation unavailable
- **WHEN** a Bible-passage slide has no known version abbreviation (e.g. content saved before this capability existed)
- **THEN** the slide renders the reference alone, with no missing-value placeholder shown
