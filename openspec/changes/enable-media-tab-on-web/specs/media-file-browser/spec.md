## MODIFIED Requirements

### Requirement: Thumbnails are generated lazily and cached on disk
The system SHALL generate a thumbnail only when its tile becomes visible, SHALL cache generated thumbnails keyed by the file's content identity, and SHALL reuse the cached thumbnail on subsequent visits without regenerating it. Generation SHALL be limited to a bounded number of concurrent operations. Where the cache is stored — on disk in the desktop build, in browser-local storage otherwise — SHALL NOT change any of the behavior above.

#### Scenario: Offscreen thumbnails are not generated
- **WHEN** a user opens a directory of 500 photos and only 20 tiles are visible
- **THEN** thumbnails are generated for the visible tiles, not for all 500

#### Scenario: Cached thumbnail is reused
- **WHEN** a user navigates away from a directory and returns to it
- **THEN** its thumbnails appear from cache without being regenerated

#### Scenario: Edited file gets a fresh thumbnail
- **WHEN** a file is modified on disk after its thumbnail was cached, and the user refreshes the directory
- **THEN** the tile shows a thumbnail generated from the current file contents, not the stale cached one

#### Scenario: Fast scroll does not flood generation
- **WHEN** a user scrolls rapidly through a directory of 1000 files
- **THEN** the number of thumbnail generations running at once stays within the fixed concurrency limit, and generations for tiles scrolled past before starting are abandoned

#### Scenario: Cached thumbnail is reused across a reload in the browser build
- **WHEN** a user in the browser build reloads the page and returns to a directory they have already browsed
- **THEN** its thumbnails appear from cache without being regenerated

### Requirement: A file can be revealed in the OS file manager
The system SHALL provide an action on a file that opens the OS file manager with that file selected, in builds that can integrate with the OS file manager. Where that integration is unavailable, the action SHALL be absent rather than present and inert.

#### Scenario: Reveal in file manager
- **WHEN** a user chooses "Reveal in Finder/Explorer" on a file tile
- **THEN** the OS file manager opens at that file's containing directory with the file selected

#### Scenario: Action is absent where unsupported
- **WHEN** a user opens a file tile's context menu in the browser build
- **THEN** no "Reveal in Finder/Explorer" entry is offered

## ADDED Requirements

### Requirement: The grid behaves identically in every build
The system SHALL provide the same selection, sorting, kind filtering, name search, thumbnail sizing, keyboard navigation, document drill-in, and drag-to-add behavior in the browser build as in the desktop build, for the media each build can reach.

#### Scenario: Selection and sorting in the browser build
- **WHEN** a user in the browser build range-selects files with shift-click, sorts by date, and filters to images
- **THEN** the grid responds exactly as the desktop build does

#### Scenario: Drilling into a PDF in the browser build
- **WHEN** a user in the browser build double-clicks a PDF in the grid
- **THEN** the grid shows its rendered pages, and a page can be previewed and added like any other slide

### Requirement: The grid stays responsive on a large browser root
The system SHALL keep the file grid scrollable and interactive in a browser-build root containing at least 1000 supported files, rendering only the tiles within or near the viewport and bounding how many directories it enumerates at once.

#### Scenario: Large granted directory remains usable
- **WHEN** a user in the browser build grants access to a folder containing 1000 photos and opens it
- **THEN** the grid scrolls smoothly, selection responds immediately, and the app does not freeze while the directory is enumerated

#### Scenario: Cross-root view does not enumerate without bound
- **WHEN** a user opens the "All" view with several deep roots registered
- **THEN** enumeration stays within its depth limit and its concurrency limit, and the view becomes usable as results arrive rather than only when the walk completes
