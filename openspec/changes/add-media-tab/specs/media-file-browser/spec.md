## ADDED Requirements

### Requirement: File grid shows thumbnails for the selected directory
The system SHALL render the selected directory's supported files as a grid of thumbnail tiles, each showing a visual preview, the file's name, and a badge identifying its kind (image, video, or document). A document tile SHALL show its page count once known.

#### Scenario: Grid renders mixed content
- **WHEN** a user selects a directory containing photos, a video, and a PDF
- **THEN** each file appears as a tile with a thumbnail, its name, and a kind badge, and the PDF's tile shows its first page and page count

#### Scenario: Empty directory
- **WHEN** a user selects a directory containing no supported files
- **THEN** the grid shows an empty state naming what file types can be added, rather than a blank area

### Requirement: Thumbnails are generated lazily and cached on disk
The system SHALL generate a thumbnail only when its tile becomes visible, SHALL cache generated thumbnails on disk keyed by the file's content identity, and SHALL reuse the cached thumbnail on subsequent visits without regenerating it. Generation SHALL be limited to a bounded number of concurrent operations.

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

### Requirement: Grid stays responsive on large directories
The system SHALL keep the file grid scrollable and interactive in a directory containing at least 1000 supported files, rendering only the tiles within or near the viewport.

#### Scenario: Large directory remains usable
- **WHEN** a user opens a directory containing 1000 photos
- **THEN** the grid scrolls smoothly, selection responds immediately, and the app does not freeze while the directory loads

### Requirement: Files are selectable individually, as a range, and as a set
The system SHALL support selecting a single file, extending the selection to a contiguous range, toggling individual files into a multi-selection, and selecting every file in the current directory. The current selection SHALL drive the preview column and the add actions.

#### Scenario: Single selection previews the file
- **WHEN** a user clicks a file tile
- **THEN** that file becomes the sole selection and the preview column shows it

#### Scenario: Range selection
- **WHEN** a user clicks one tile and shift-clicks a later tile
- **THEN** every tile between them inclusive is selected

#### Scenario: Toggle selection
- **WHEN** a user cmd/ctrl-clicks a tile that is already selected within a multi-selection
- **THEN** that tile is removed from the selection and the rest of the selection is unchanged

#### Scenario: Select all in directory
- **WHEN** a user presses the select-all shortcut with the grid focused
- **THEN** every supported file in the current directory is selected

#### Scenario: Multi-selection preview
- **WHEN** more than one file is selected
- **THEN** the preview column shows the most recently selected file and states how many files are selected

### Requirement: Grid supports sorting, kind filtering, name search, and thumbnail sizing
The system SHALL allow the user to sort the grid by name, date modified, or size; filter it to a single kind; filter it by a name search string; and change the thumbnail size. These view settings SHALL persist while browsing between directories.

#### Scenario: Sort by date
- **WHEN** a user sorts by date modified
- **THEN** the grid orders files newest-first and keeps that order when navigating to another directory

#### Scenario: Filter to videos
- **WHEN** a user filters the grid to videos
- **THEN** only video files are listed, and the count of hidden files is stated

#### Scenario: Name search
- **WHEN** a user types text into the grid's search box
- **THEN** only files whose names match are shown, matched case- and accent-insensitively

#### Scenario: Thumbnail size
- **WHEN** a user changes the thumbnail size control
- **THEN** tiles resize immediately and the chosen size is still in effect after navigating to another directory

### Requirement: Keyboard navigation in the grid
The system SHALL allow the focused grid to be navigated with arrow keys, the focused file to be added with Enter, and shall support the range and multi-select modifiers from the keyboard.

#### Scenario: Arrow keys move the selection
- **WHEN** the grid has focus and the user presses an arrow key
- **THEN** the selection moves one tile in that direction and the preview column updates

#### Scenario: Enter adds the focused file
- **WHEN** the grid has focus with a file selected and the user presses Enter
- **THEN** the selected file is added exactly as the Add action would add it

### Requirement: Documents can be drilled into page by page
The system SHALL allow a user to open a document tile to browse its rendered pages as their own grid, select individual pages, and return to the containing directory.

#### Scenario: Open a deck's pages
- **WHEN** a user double-clicks a PDF tile whose pages have been rendered
- **THEN** the grid is replaced by that document's pages in order, each selectable and previewable

#### Scenario: Return from a document's pages
- **WHEN** a user navigates back from a document's page view
- **THEN** the grid shows the containing directory again with the document tile still selected

### Requirement: A file can be revealed in the OS file manager
The system SHALL provide an action on a file that opens the OS file manager with that file selected.

#### Scenario: Reveal in file manager
- **WHEN** a user chooses "Reveal in Finder/Explorer" on a file tile
- **THEN** the OS file manager opens at that file's containing directory with the file selected
