## ADDED Requirements

### Requirement: Media slides reference their file in place and are never copied
The system SHALL store a media slide as a reference to a file within a registered media root, resolved relative to that root, and SHALL NOT copy, move, or modify the source file when it is added. Relocating a registered root SHALL keep every slide that references files inside it working, without rewriting any folder record.

#### Scenario: Adding a large file is immediate
- **WHEN** a user adds a multi-gigabyte video as a slide
- **THEN** the slide is created immediately, and no copy of the video is written anywhere

#### Scenario: Relocating a root repoints its slides
- **WHEN** a user moves a registered root's folder to a new location on disk and repoints that root
- **THEN** every existing slide referencing files inside that root renders again without any per-slide fix

#### Scenario: References cannot escape their root
- **WHEN** a media reference resolves to a path outside its registered root, or names a root that is not registered
- **THEN** the request is refused and nothing outside the registered roots or the managed cache is served

### Requirement: Media items carry enough metadata to render their chrome without disk access
The system SHALL store a media item's title, kind, dimensions, fit mode, and — for a document page — its source document, page index, and page count on the item itself, so the slide console can draw a correct, correctly proportioned tile whether or not the underlying file is currently reachable.

#### Scenario: Console renders before the file loads
- **WHEN** a folder containing media slides is opened
- **THEN** each slide's tile is drawn at its correct aspect ratio with its title and kind, before the underlying files finish loading

#### Scenario: Page position survives on the item
- **WHEN** a document page slide is inspected
- **THEN** it states which page of which document it is, without the document needing to be re-read

### Requirement: A missing source file renders a missing state with a relink action
The system SHALL render a media slide whose source file cannot be resolved as an explicit missing state showing the item's title and kind, SHALL keep the slide selectable, reorderable, and deletable, and SHALL offer an action to relink it to a file. The slide SHALL NOT be silently dropped from the folder.

#### Scenario: File deleted after being added
- **WHEN** a media slide's source file is deleted from disk and the folder is opened
- **THEN** the slide shows a missing state with its title, and remains in its position in the running order

#### Scenario: Relinking restores the slide
- **WHEN** a user relinks a missing slide to the file's new location
- **THEN** the slide renders its content again

#### Scenario: Exported project on another machine
- **WHEN** a project containing media slides is exported and opened on a machine that does not have those files
- **THEN** every media slide appears in the running order in its correct position, in the missing state, rather than being omitted

### Requirement: Media renders identically in console, preview, and output
The system SHALL render a media slide through the same slide-rendering surface used by every other slide type, so a media slide appears the same in the slide console, the preview panel, and the presentation output window, honoring the configured aspect ratio and the item's contain/cover fit.

#### Scenario: Same render in all three surfaces
- **WHEN** a media slide is shown in the slide console, previewed in the preview panel, and sent to the output window
- **THEN** all three show the same framing of the same content, letterboxed to the configured aspect ratio rather than stretched

#### Scenario: Fit mode is honored
- **WHEN** a user switches an image slide between contain and cover
- **THEN** the preview and the output both reflect the new fit

### Requirement: Video playback on the output window
The system SHALL begin playing a video slide from its start each time it is sent to the output window, SHALL honor the item's loop setting, and SHALL play muted unless the item's mute setting has been turned off.

#### Scenario: Re-sending restarts the video
- **WHEN** a user sends a countdown video to the output, then sends it again
- **THEN** playback restarts from the beginning rather than resuming

#### Scenario: Loop is honored
- **WHEN** a video slide with looping enabled reaches its end on the output window
- **THEN** it starts again immediately

#### Scenario: Audio is off unless requested
- **WHEN** a video slide is sent to the output without its mute setting having been changed
- **THEN** it plays with no audio

### Requirement: Selected media can be added one at a time or all at once
The system SHALL add the currently selected files to the open Library folder as media items in grid order, SHALL provide an action to add every supported file in the current directory, and SHALL create a folder to hold them when no folder is open.

#### Scenario: Add a selection to the open folder
- **WHEN** a user selects three photos with a folder open and chooses Add
- **THEN** three media items are appended to that folder in the order they appear in the grid

#### Scenario: Add all in a directory
- **WHEN** a user chooses "Add all" in a directory containing eight supported files
- **THEN** eight media items are added in the grid's current sort order

#### Scenario: Add with no folder open
- **WHEN** a user adds media while no folder is open
- **THEN** a folder is created at the root of the active project containing those items, and it becomes the open folder

### Requirement: A document or a set of files can be added as its own folder
The system SHALL provide an action that creates a Library folder and populates it with the added slides in a single write: for a document, a folder named after the document holding one slide per page in page order; for a multi-file selection, a folder named after the containing directory.

#### Scenario: Deck becomes a folder of slides
- **WHEN** a user chooses "Add as folder" with a 40-page deck selected
- **THEN** one folder named after the deck is created containing 40 slides in page order

#### Scenario: Selection becomes a folder
- **WHEN** a user selects six photos and chooses "Add as folder"
- **THEN** one folder named after their containing directory is created holding those six slides in grid order

#### Scenario: Nesting under the open folder
- **WHEN** a user chooses "Add as folder" while a folder is open
- **THEN** the new folder is created as a child of the open folder, or as its sibling if the open folder is already at the nesting cap

#### Scenario: The folder and its slides are written together
- **WHEN** a folder is created by "Add as folder"
- **THEN** the folder and all of its slides are persisted in one write, so the folder is never observable in an empty intermediate state

### Requirement: Media can be dragged from the grid into the running order
The system SHALL allow files to be dragged from the file grid onto the folder tree or the slide console to add them at the drop position.

#### Scenario: Drag onto the slide console
- **WHEN** a user drags a selected photo from the grid and drops it between two slides in the open folder
- **THEN** a media item is inserted at that position

#### Scenario: Drag onto a folder in the tree
- **WHEN** a user drags files from the grid onto a folder in the sidebar tree
- **THEN** those items are appended to that folder, whether or not it is the open one

### Requirement: The Media tab requires the desktop app
The system SHALL present the Media tab in the web build as an explicit "available in the desktop app" state, and SHALL NOT offer partial media browsing, importing, or adding there.

#### Scenario: Web build states the requirement
- **WHEN** a user opens the Media tab in the browser build
- **THEN** the tab explains that the media library requires the desktop app, and offers no add or import actions

#### Scenario: Existing media slides still render where possible
- **WHEN** a project containing media slides is opened in the web build
- **THEN** those slides appear in the running order in the missing state rather than breaking the folder
