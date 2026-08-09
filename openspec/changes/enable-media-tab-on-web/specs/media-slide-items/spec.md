## REMOVED Requirements

### Requirement: The Media tab requires the desktop app
**Reason**: The premise no longer holds. The File System Access API gives the browser build persistent, user-granted access to a real folder, and every step downstream of reading a file — PDF rasterization, thumbnail generation, image and video playback — already runs in the renderer rather than in the main process. What is desktop-only is the filesystem bridge, not the feature. Media browsing, previewing, and adding are now specified for both builds in `web-media-access` and in the amended `media-library-sources`, and the capabilities the browser genuinely lacks (LibreOffice conversion, Google Slides import, reveal-in-file-manager, and directory browsing on browsers without a directory picker) are specified individually where they belong.

**Migration**: None. No web-build media state exists to migrate, because the tab offered no way to create any. The second scenario of this requirement — media slides in a project opened where their files are unreachable rendering the missing state rather than breaking the folder — is retained and generalized in "A missing source file renders a missing state with a relink action" below.

## MODIFIED Requirements

### Requirement: A missing source file renders a missing state with a relink action
The system SHALL render a media slide whose source file cannot be resolved as an explicit missing state showing the item's title and kind, SHALL keep the slide selectable, reorderable, and deletable, and SHALL offer an action to relink it to a file. The slide SHALL NOT be silently dropped from the folder. A source that is unreachable because the build cannot reach it, or because access to its root has not been granted in the current session, SHALL render the same missing state and SHALL say which of those it is, so the user knows whether relinking or reconnecting is the remedy.

#### Scenario: File deleted after being added
- **WHEN** a media slide's source file is deleted from disk and the folder is opened
- **THEN** the slide shows a missing state with its title, and remains in its position in the running order

#### Scenario: Relinking restores the slide
- **WHEN** a user relinks a missing slide to the file's new location
- **THEN** the slide renders its content again

#### Scenario: Exported project on another machine
- **WHEN** a project containing media slides is exported and opened on a machine that does not have those files
- **THEN** every media slide appears in the running order in its correct position, in the missing state, rather than being omitted

#### Scenario: Root access not yet granted this session
- **WHEN** a folder containing media slides is opened in the browser build before their root has been reconnected
- **THEN** the slides show the missing state naming reconnection, not relinking, as the remedy, and reconnecting the root restores them without relinking each slide

#### Scenario: Project authored in another build
- **WHEN** a project containing media slides is opened in a build that cannot reach the roots those slides reference
- **THEN** the slides appear in the running order in the missing state with the relink action available, and the folder is otherwise intact

## ADDED Requirements

### Requirement: Media slides support a YouTube kind alongside file-backed kinds
The system SHALL support a YouTube media slide as a kind of media item, stored and reordered in a folder exactly as file-backed media items are, and SHALL treat the addition of this kind as additive: every existing stored media slide SHALL continue to load and render unchanged.

#### Scenario: YouTube slide lives in the running order like any other
- **WHEN** a folder holds an image slide, a document page, and a YouTube slide
- **THEN** all three can be reordered, styled with a template, deleted, and exported in the same ways

#### Scenario: Existing projects are unaffected
- **WHEN** a project saved before this change is opened
- **THEN** every media slide in it loads and renders exactly as before

### Requirement: Media adding and presenting work in every build
The system SHALL offer the same add actions — one item, all items, and add-as-folder — and the same "Present" action in the browser build as in the desktop build, for the media that build can reach.

#### Scenario: Adding in the browser build
- **WHEN** a user in the browser build selects three photos and chooses "Add"
- **THEN** three media slides are appended to the open folder, creating one at the root if none is open, exactly as in the desktop build

#### Scenario: Presenting in the browser build
- **WHEN** a user in the browser build chooses "Present" on a selected image
- **THEN** the open presentation output window displays it
