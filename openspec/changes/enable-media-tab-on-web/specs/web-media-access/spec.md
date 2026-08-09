## ADDED Requirements

### Requirement: The browser build reaches local media without uploading it
The system SHALL allow a web-build user to make local media available to the Media tab without transmitting any file, or any part of a file, to a server. The system SHALL NOT add a server endpoint, a proxy, or any network request that carries media bytes or file paths. Media SHALL be read through browser-granted access to the user's own machine only.

#### Scenario: No network traffic carries media
- **WHEN** a user adds a folder or files in the web build and browses, previews, and adds them as slides
- **THEN** no request carrying file bytes, file names, or file paths leaves the browser, and the whole flow completes with the network disconnected

#### Scenario: Media works offline after the app has loaded
- **WHEN** a user with previously added media opens the app in the browser with no network connection
- **THEN** the Media tab lists their media, previews it, and adds it as slides normally

### Requirement: A browser with a directory picker gets a browsable folder root
The system SHALL, in a browser that supports the File System Access API, allow the user to grant access to a directory and SHALL treat that directory as a media root whose subdirectories are browsable, equivalent in behavior to a desktop root.

#### Scenario: Add a folder in a supporting browser
- **WHEN** a user chooses "Add folder" in the web build's media explorer and grants access to a directory
- **THEN** the directory appears as a root in the explorer, its subdirectories are expandable, and its supported files appear in the grid

#### Scenario: Granted directory is read-only to the app
- **WHEN** a user browses, previews, and adds media from a granted directory
- **THEN** no file inside that directory is created, modified, moved, or deleted

### Requirement: A browser without a directory picker gets a file stash root
The system SHALL, in a browser that does not support directory access, allow the user to add individual files through a file picker or by dropping them onto the explorer, SHALL present them as a single flat root with no subdirectories, and SHALL state in that root's empty state that the browser cannot open a whole folder.

#### Scenario: Add files where directories are unsupported
- **WHEN** a user in a browser without directory support chooses "Add files" and selects four photos and a PDF
- **THEN** all five appear in the grid under a flat root, and the explorer shows no subdirectory nodes for it

#### Scenario: Browser limitation is explained, not hidden
- **WHEN** a user opens the Media tab in a browser without directory support
- **THEN** the explorer explains that this browser cannot open an entire folder and offers adding files instead, rather than showing a disabled or failing "Add folder" action

#### Scenario: Files dropped from the file manager
- **WHEN** a user drags files from the OS file manager onto the explorer column
- **THEN** those files are added to the stash exactly as if they had been chosen through the picker

### Requirement: Web media persists across reloads
The system SHALL persist a web user's roots, their granted directory handles, their stashed files, and their favorites in browser-local storage, and SHALL restore them when the app is reopened. Persistence SHALL NOT depend on the app remaining open or on any server.

#### Scenario: Roots survive a reload
- **WHEN** a user adds a directory root, reloads the page, and opens the Media tab
- **THEN** the root is still listed with its name

#### Scenario: Stashed files survive a reload without a prompt
- **WHEN** a user adds files to a stash root, reloads the page, and opens the Media tab
- **THEN** the files are listed and previewable with no further picker or permission prompt

#### Scenario: Favorites survive a reload
- **WHEN** a user stars a file, reloads the page, and opens the Favorites view
- **THEN** the starred file is listed

### Requirement: A directory root requiring permission is a state, not an error
The system SHALL detect when a persisted directory root's permission has lapsed, SHALL present that root in an explicit "needs reconnecting" state distinct from a root whose folder is gone, and SHALL offer a single action that re-requests permission for it. Reconnecting SHALL restore the root's contents without the user re-picking the folder.

#### Scenario: Reconnect after a reload
- **WHEN** a user reloads the page and selects a directory root whose permission has lapsed
- **THEN** the grid area shows a "Reconnect" prompt naming the folder, and choosing it restores the root's contents in place

#### Scenario: Reconnect is not requested until media is used
- **WHEN** a user opens the app after a reload and never opens the Media tab
- **THEN** no permission prompt is shown

#### Scenario: Denied permission leaves the root intact
- **WHEN** a user dismisses or denies the reconnect prompt
- **THEN** the root remains registered in the needs-reconnecting state and can be reconnected later, and no other root is affected

#### Scenario: Missing folder is distinguished from lapsed permission
- **WHEN** a persisted root's folder has been deleted or renamed on disk
- **THEN** the root is shown as unavailable with the option to remove it, not as needing reconnection

### Requirement: Media references resolve independently in every browsing context
The system SHALL store a media slide's source as a durable reference rather than as a resolved URL, and SHALL resolve that reference to a playable URL separately in each browsing context that renders it, including the presentation output window.

#### Scenario: Output window renders media it did not resolve
- **WHEN** a user opens the presentation output window in the web build and sends an image slide to it
- **THEN** the output window displays the image

#### Scenario: Output window opened after slides were added
- **WHEN** a user adds media slides, then opens the output window for the first time and sends one
- **THEN** the slide renders without the user re-adding or re-picking the file

#### Scenario: Output window cannot obtain access
- **WHEN** the output window cannot resolve a slide's file because its root's permission has not been granted in that context
- **THEN** the output shows the slide's missing-media state with a message directing the user to the console window, and no permission prompt appears on the output display

### Requirement: Derived artifacts are cached within a storage budget
The system SHALL cache thumbnails and rendered document pages in browser-local storage keyed by the source file's content identity, SHALL bound that cache with a size budget, and SHALL evict least-recently-used entries rather than failing. Exhausting the browser's storage quota SHALL degrade to regenerating artifacts on demand, never to a failed preview.

#### Scenario: Cached artifacts are reused
- **WHEN** a user previews a PDF, navigates away, and selects it again without modifying it
- **THEN** its pages appear from cache without being re-rendered

#### Scenario: Budget is enforced by eviction
- **WHEN** cached artifacts exceed the budget
- **THEN** the least recently used entries are removed, and the content they were derived from is unaffected

#### Scenario: Quota exhaustion degrades gracefully
- **WHEN** the browser refuses a cache write because its storage quota is exhausted
- **THEN** the thumbnail or page is still rendered and displayed, and the user sees no error

#### Scenario: Removing a root reclaims its storage
- **WHEN** a user removes a web root
- **THEN** its stashed files, handle, and cached artifacts are deleted from browser storage, and no file on the user's disk is touched
