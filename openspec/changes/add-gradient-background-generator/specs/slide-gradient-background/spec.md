## ADDED Requirements

### Requirement: Structured gradient specification

A `gradient` slide background SHALL carry an optional structured specification alongside its CSS `value`: a gradient `kind` of `linear` or `radial`, an `angle` in degrees, and an ordered list of stops. Each stop SHALL have a color (red, green, blue channels 0–255 and an alpha channel 0–100) and a position expressed as a percentage from 0 to 100. The `value` field SHALL remain required so that every consumer that renders a gradient today keeps working unchanged.

#### Scenario: Gradient authored in the editor carries its spec

- **WHEN** a gradient background is produced by the gradient generator
- **THEN** the stored background contains both the structured spec and a `value` string serialized from that spec

#### Scenario: Consumers render from the CSS value only

- **WHEN** any component renders a gradient background
- **THEN** it reads `background.value` and SHALL NOT need to interpret the structured spec

### Requirement: Deterministic CSS serialization

The system SHALL serialize a gradient spec to a CSS gradient string deterministically: the same spec always produces the same string. A `linear` spec SHALL serialize to `linear-gradient(<angle>deg, …)` and a `radial` spec to a `radial-gradient(circle at 50% 50%, …)` form. Stops SHALL be emitted in ascending position order, each as `<color> <position>%`. A stop whose alpha is 100 SHALL be emitted as a `#RRGGBB` hex value; when any stop has an alpha below 100, that stop SHALL be emitted in `rgb(r g b / a%)` form.

#### Scenario: Linear gradient with opaque stops

- **WHEN** a spec with kind `linear`, angle `90`, and stops `#2A7B9B` at 0, `#57C785` at 50, `#EDDD53` at 100 is serialized
- **THEN** the result is `linear-gradient(90deg, #2A7B9B 0%, #57C785 50%, #EDDD53 100%)`

#### Scenario: Radial gradient ignores angle

- **WHEN** a spec with kind `radial` is serialized
- **THEN** the result is a `radial-gradient(...)` string and the spec's angle does not appear in it

#### Scenario: Translucent stop uses rgb notation

- **WHEN** a stop has alpha below 100
- **THEN** that stop is serialized in `rgb(r g b / a%)` notation rather than hex

#### Scenario: Stops are ordered by position

- **WHEN** a spec holds stops whose positions are not in ascending order
- **THEN** the serialized string lists them in ascending position order without mutating the stored spec's array order

### Requirement: Legacy gradients keep rendering

Gradient backgrounds saved before the structured spec existed — including the bundled templates, whose values are hand-written `oklch()` radial gradients — SHALL keep rendering from their stored `value`. The system SHALL NOT rewrite a stored `value` until the user edits that gradient in the generator.

#### Scenario: Bundled oklch gradient loads unchanged

- **WHEN** a bundled template whose gradient value is a multi-stop `oklch()` radial gradient is opened
- **THEN** the slide renders exactly that gradient and the stored value is unchanged

#### Scenario: Opening a legacy gradient does not mark the draft dirty

- **WHEN** a template with a legacy string-only gradient is opened in the editor and nothing is changed
- **THEN** the template is not reported as having unsaved changes

### Requirement: Best-effort parsing of simple gradient strings

When a gradient background has no structured spec, the system SHALL attempt to derive one by parsing the simple `linear-gradient(<angle>deg, <color> [<position>%], …)` form, accepting hex colors with or without explicit positions. When positions are absent, stops SHALL be distributed evenly from 0 to 100. When the string cannot be parsed, the system SHALL fall back to a default two-stop spec rather than failing.

#### Scenario: Preset gradient round-trips

- **WHEN** the stored value is `linear-gradient(160deg, #1b2735, #0a0e14)`
- **THEN** parsing yields a linear spec at 160 degrees with `#1b2735` at 0% and `#0a0e14` at 100%

#### Scenario: Unparseable gradient falls back to a default spec

- **WHEN** the stored value is an `oklch()` radial gradient the parser does not understand
- **THEN** the generator opens seeded with the default two-stop spec and the stored value is left untouched until the user makes an edit

### Requirement: Gradient normalization on load

`normalizeSlideTemplate` SHALL guarantee that a loaded gradient background is renderable. A gradient whose structured spec is present but has fewer than two stops, or whose `value` is missing or empty, SHALL be replaced by the default slide background rather than producing an invalid CSS value.

#### Scenario: Gradient with a single stop is rejected

- **WHEN** a saved template holds a gradient spec with one stop
- **THEN** the normalized template uses the default slide background

#### Scenario: Gradient with an empty value is rejected

- **WHEN** a saved template holds a gradient background whose `value` is an empty string
- **THEN** the normalized template uses the default slide background

### Requirement: Export and storage compatibility

Structured gradient specs SHALL be plain JSON carried inside the existing `SlideTemplate` payload, requiring no change to the template file schema version or to either storage driver. A template file exported after this change SHALL remain loadable by a build that predates it.

#### Scenario: Exported file keeps the current schema version

- **WHEN** a template with a generated gradient is exported
- **THEN** the file's `schemaVersion` is unchanged and the gradient appears as an ordinary background object with extra fields

#### Scenario: Older build reads a newer file

- **WHEN** a build without gradient-spec support loads a file containing a structured gradient spec
- **THEN** it renders the gradient from `value` and ignores the additional fields
