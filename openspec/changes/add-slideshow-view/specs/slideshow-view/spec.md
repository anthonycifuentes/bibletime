## ADDED Requirements

### Requirement: A slideshow presents the open folder's slides

The system SHALL provide a slideshow view whose deck is the currently open Library folder's items, in the order they appear in that folder.

#### Scenario: The open folder becomes the deck

- **WHEN** the user starts a slideshow while a folder holding 12 slides is open
- **THEN** the slideshow presents those 12 slides in their folder order, and reports a total of 12

#### Scenario: Subfolders are not part of the deck

- **WHEN** the open folder contains both slides and subfolders
- **THEN** the deck is that folder's own slides only, and no subfolder's slides are included

### Requirement: The slideshow starts from the selected slide

The slideshow SHALL open on the console's currently selected slide when that slide belongs to the deck, and on the first slide otherwise.

#### Scenario: A slide is selected

- **WHEN** the user selects the 4th slide in the open folder and starts a slideshow
- **THEN** the slideshow opens on the 4th slide

#### Scenario: Nothing is selected

- **WHEN** the user starts a slideshow with no slide selected
- **THEN** the slideshow opens on the first slide of the deck

### Requirement: Leaving the slideshow returns to the console on the slide it ended on

Exiting the slideshow SHALL return the user to the console with the folder still open and the slide the slideshow ended on selected and previewed.

#### Scenario: Exiting mid-deck

- **WHEN** the user advances to the 9th slide and exits the slideshow
- **THEN** the console is shown with the same folder open, the 9th slide selected, and the preview panel showing it

#### Scenario: Console state survives the round trip

- **WHEN** the user starts a slideshow and exits it
- **THEN** the open folder, the bottom drawer's active tab, and the console's other shell state are as they were before starting

#### Scenario: Re-entering resumes

- **WHEN** the user exits on the 9th slide and starts a slideshow again without changing the selection
- **THEN** the slideshow opens on the 9th slide

### Requirement: The slideshow replaces the console chrome

The slideshow SHALL occupy the whole window without the console's header bar, bottom drawer, or side panels, so nothing competes with it for space or keystrokes.

#### Scenario: No console chrome is present

- **WHEN** the slideshow is open
- **THEN** the header bar, bottom drawer, folder tree, slide grid, and preview panel are not rendered

#### Scenario: Exit is always reachable

- **WHEN** the slideshow is open
- **THEN** a visible exit control is present regardless of which slide is current or whether the output is blanked

### Requirement: The current slide is shown as the output shows it

The slideshow SHALL show the current slide large, letterboxed to the configured aspect ratio, rendering the same content the output window is rendering — including video, embedded video, and animated backgrounds in motion.

#### Scenario: Current slide mirrors the output

- **WHEN** a slide is current in the slideshow
- **THEN** the current-slide pane renders that slide's text, reference, media, and resolved template exactly as the output window renders them

#### Scenario: Moving media plays in the current pane

- **WHEN** the current slide is a video, an embedded video, or a slide with an animated background
- **THEN** the current-slide pane plays it rather than showing a still frame

#### Scenario: The current pane produces no sound

- **WHEN** the current slide has audio
- **THEN** the current-slide pane is silent, and the sound comes from the output window only

#### Scenario: Aspect ratio is honored

- **WHEN** the window's shape does not match the configured aspect ratio
- **THEN** the current slide is letterboxed or pillarboxed to that ratio rather than stretched

### Requirement: The next slide is always visible

The slideshow SHALL show a preview of the slide that one advance would make current.

#### Scenario: A next slide exists

- **WHEN** the current slide is not the last in the deck
- **THEN** the next-slide pane shows the following slide

#### Scenario: On the last slide

- **WHEN** the current slide is the last in the deck
- **THEN** the next-slide pane shows an end-of-deck state rather than a slide

#### Scenario: The next slide is a still frame

- **WHEN** the next slide contains video, embedded video, or an animated background
- **THEN** the next-slide pane renders it as a still frame without starting playback

### Requirement: The slideshow reports its position in the deck

The slideshow SHALL display the current slide's 1-based position and the deck's total.

#### Scenario: Position readout

- **WHEN** the 3rd of 12 slides is current
- **THEN** the slideshow displays a position readout of 3 of 12

#### Scenario: The total tracks the folder

- **WHEN** a slide is added to the open folder while the slideshow is running
- **THEN** the displayed total updates to include it

### Requirement: A filmstrip lists every slide in the deck

The slideshow SHALL display a scrollable strip of numbered thumbnails, one per slide in deck order, marking the current slide distinctly.

#### Scenario: Current slide is marked

- **WHEN** a slide is current
- **THEN** its thumbnail is visually marked as current and the others are not

#### Scenario: The filmstrip follows the current slide

- **WHEN** the current slide changes to one outside the filmstrip's visible range
- **THEN** the filmstrip scrolls that thumbnail into view

#### Scenario: Thumbnails are still frames

- **WHEN** the deck contains video, embedded video, or animated-background slides
- **THEN** their thumbnails render as still frames without starting playback

### Requirement: An elapsed timer runs for the session

The slideshow SHALL display time elapsed since it was started, and SHALL allow pausing, resuming, and resetting it.

#### Scenario: The timer starts on entry

- **WHEN** the user starts a slideshow
- **THEN** the elapsed timer begins at zero and counts up

#### Scenario: Pausing and resuming

- **WHEN** the user pauses the timer and later resumes it
- **THEN** the elapsed time holds while paused and continues from the held value on resume

#### Scenario: Resetting

- **WHEN** the user resets the timer
- **THEN** the elapsed time returns to zero, and continues running if it was running

#### Scenario: The timer does not drift when the window is inactive

- **WHEN** the operator works in the output window for several minutes and returns
- **THEN** the elapsed time reflects the real time passed, not the number of updates the inactive window received

#### Scenario: The timer is not restored from a previous session

- **WHEN** the user exits a slideshow and starts a new one
- **THEN** the elapsed timer starts at zero

### Requirement: The current time of day is displayed

The slideshow SHALL display the wall-clock time, formatted for the app's active language.

#### Scenario: Clock is shown

- **WHEN** the slideshow is open
- **THEN** the current time of day is displayed and updates at least once per minute

### Requirement: The slideshow can fill the screen

The slideshow SHALL be able to enter and leave fullscreen from inside itself.

#### Scenario: Entering fullscreen

- **WHEN** the user activates the fullscreen control or presses the fullscreen key
- **THEN** the slideshow fills the display, keeping every region visible

#### Scenario: Leaving fullscreen

- **WHEN** the user activates the control again, presses the fullscreen key again, or presses `Esc` while fullscreen
- **THEN** the slideshow returns to its windowed size without exiting the slideshow

### Requirement: The slideshow is unavailable without slides to present

The system SHALL prevent starting a slideshow when there is nothing to present, and SHALL not render a broken slideshow when it is reached without a deck.

#### Scenario: No folder open

- **WHEN** no folder is open in the console
- **THEN** the start-slideshow actions are disabled

#### Scenario: Empty folder

- **WHEN** the open folder has no slides
- **THEN** the start-slideshow actions are disabled

#### Scenario: Reached directly without a deck

- **WHEN** the slideshow route is opened with no open folder, an unknown folder, or an empty folder
- **THEN** the user is returned to the console instead of shown an empty slideshow

### Requirement: The slideshow behaves identically in both builds

The slideshow SHALL be available with the same layout, navigation, and output behavior in the desktop and web builds.

#### Scenario: Web build

- **WHEN** a user runs a slideshow in the browser
- **THEN** the view, its navigation, and its control of the output window behave as they do in the desktop app
