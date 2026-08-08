## ADDED Requirements

### Requirement: Every presentation document becomes an ordered set of page images
The system SHALL convert every supported presentation document — PDF, PowerPoint, and Google Slides — into an ordered set of rendered page images, one per page or slide, and SHALL treat those images identically regardless of the source format. Animations, slide transitions, embedded video, and speaker notes SHALL be discarded.

#### Scenario: PDF becomes pages
- **WHEN** a user selects a 12-page PDF
- **THEN** 12 page images are produced in document order, each addable as a slide

#### Scenario: Deck and PDF behave identically downstream
- **WHEN** a PowerPoint deck and a PDF of the same content have both been converted
- **THEN** their pages are added, previewed, reordered, presented, and exported through the same code path with no format-specific behavior

#### Scenario: Page order is preserved
- **WHEN** a document's pages are added to a folder
- **THEN** the resulting slides appear in the document's page order

### Requirement: PDF pages are rasterized and cached
The system SHALL rasterize a PDF's pages to images, SHALL cache them on disk keyed by the source file's content identity, and SHALL reuse the cache on subsequent selections of the same unmodified file.

#### Scenario: Second selection uses the cache
- **WHEN** a user selects a PDF they have already previewed and not modified
- **THEN** its pages appear from cache without being re-rasterized

#### Scenario: Modified PDF is re-rasterized
- **WHEN** a PDF is replaced on disk with a newer version and the user selects it again
- **THEN** its pages are rasterized from the new file, and the preview shows the new content

#### Scenario: Corrupt or password-protected PDF
- **WHEN** a user selects a PDF that cannot be parsed or requires a password
- **THEN** the preview column states specifically that the file could not be read and why, and the file cannot be added as slides

### Requirement: PowerPoint decks convert through a locally installed LibreOffice
The system SHALL convert `.pptx`, `.ppt`, and `.odp` files to PDF using a LibreOffice installation found on the user's machine, SHALL start that conversion when the file is selected rather than when it is added, and SHALL detect LibreOffice's presence at runtime without bundling or installing it.

#### Scenario: Deck converts on selection
- **WHEN** a user selects a PowerPoint file and LibreOffice is installed
- **THEN** conversion begins immediately, progress is shown, and the preview column shows the deck's pages and page count when it completes

#### Scenario: LibreOffice is not installed
- **WHEN** a user selects a PowerPoint file and no LibreOffice installation can be found
- **THEN** the file is still listed and selectable, and the preview column states that PowerPoint conversion requires LibreOffice and that exporting the deck to PDF is an alternative

#### Scenario: Conversion status is discoverable before it is needed
- **WHEN** a user opens Settings
- **THEN** it states whether PowerPoint conversion is available on this machine

#### Scenario: Conversion fails or times out
- **WHEN** LibreOffice is present but fails to convert a file or does not finish within the timeout
- **THEN** the preview column reports the failure with the option to retry, and no partial pages are added to the cache

#### Scenario: Selecting another file cancels a running conversion
- **WHEN** a conversion is in progress and the user selects a different file
- **THEN** the in-progress conversion is abandoned and the newly selected file's preview proceeds

### Requirement: Google Slides decks are imported through the public export URL
The system SHALL accept a Google Slides presentation URL, fetch the deck as a PDF from Google's export endpoint, and enter the same page-rendering pipeline as any other PDF. The import SHALL be a snapshot taken at fetch time, not a live link, and SHALL be re-fetchable on demand.

#### Scenario: Shared deck imports successfully
- **WHEN** a user pastes the URL of a Google Slides deck that has link sharing enabled
- **THEN** the deck is fetched, its pages are rendered in order, and it can be previewed and added like any other document

#### Scenario: Deck is not shared
- **WHEN** a user pastes the URL of a deck that requires sign-in
- **THEN** the system detects that the response is not a PDF and reports that the deck is not shared, naming enabling link access or downloading it as PDF as the remedies

#### Scenario: URL is not a Google Slides presentation
- **WHEN** a user pastes a URL from which no presentation id can be extracted
- **THEN** the system reports that the URL is not a Google Slides presentation and nothing is imported

#### Scenario: Network unavailable
- **WHEN** the export fetch fails because the machine is offline or the request times out
- **THEN** the failure is reported with a retry option, and previously imported decks remain usable

#### Scenario: Re-importing refreshes the snapshot
- **WHEN** a user chooses to re-import a previously imported deck
- **THEN** the deck is fetched again and its pages are replaced with the current version, while slides already added to folders are unchanged

#### Scenario: Import time is visible
- **WHEN** an imported Google Slides deck is selected
- **THEN** the preview column states when it was fetched

### Requirement: Rendered pages are reclaimable
The system SHALL store all rendered pages and thumbnails under a single managed cache location, SHALL report that cache's size in Settings, and SHALL allow the user to clear it. Clearing the cache SHALL NOT delete any source file or remove any slide from any folder.

#### Scenario: Cache size is visible
- **WHEN** a user opens Settings' storage section
- **THEN** the current size of the media cache is shown

#### Scenario: Clearing the cache preserves content
- **WHEN** a user clears the media cache
- **THEN** every source file on disk is untouched, every folder keeps its slides, and pages and thumbnails are re-rendered the next time they are needed
