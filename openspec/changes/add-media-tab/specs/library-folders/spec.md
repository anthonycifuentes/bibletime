## REMOVED Requirements

### Requirement: Unresolvable item types render as placeholders, not omissions
**Reason**: No folder item type renders a placeholder any more. `add-songs-tab` narrowed this requirement from `song`/`media` to `media` only; this change gives `media` items real content, leaving the requirement with no members. It is replaced by "Media items carry their own reference and render real content" below.

**Migration**: None. No stored item is affected — the placeholder branch was the only rendering path for `media` items and no UI ever created one. If `add-songs-tab` has not landed, this removal must be paired with real rendering for `song` items as well, or the requirement retained for `song` alone.

## ADDED Requirements

### Requirement: Media items carry their own reference and render real content
The system SHALL render a `media` folder item as its actual image, video, or document page, resolved from a reference stored on the item, and SHALL NOT render a "not yet available" placeholder for it. A `media` item whose source file cannot be resolved SHALL render an explicit missing state and SHALL remain selectable, orderable, and deletable in its position.

#### Scenario: Media item renders real content
- **WHEN** a folder contains a `media` item whose source file is reachable
- **THEN** the slide console, the preview panel, and the presentation output all render that image, video, or document page, and no placeholder is shown

#### Scenario: Media item with an unreachable file stays in the running order
- **WHEN** a folder contains a `media` item whose source file has been moved or deleted
- **THEN** the item still appears in the slide console in its correct position, can be selected, reordered, and deleted, and renders a missing state naming the item rather than being omitted from the folder

#### Scenario: Media items mix with other content types
- **WHEN** a folder contains `bible-passage`, `song`, and `media` items
- **THEN** all three render their own real content in one ordered list, with no type rendering as a placeholder
