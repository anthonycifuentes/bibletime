## ADDED Requirements

### Requirement: A YouTube link can be added as a media slide
The system SHALL accept a YouTube video URL, SHALL add it to the running order as a media slide, and SHALL do so in both the desktop and the browser build. The slide SHALL be viewing-only: the system SHALL NOT download, copy, or re-host the video.

#### Scenario: Add a link as a slide
- **WHEN** a user pastes a YouTube video URL into the Media tab's "Add from YouTube link" action and confirms
- **THEN** a slide for that video is appended to the open folder, titled with the video's title where it is available and with the URL otherwise

#### Scenario: Available in both builds
- **WHEN** a user opens the Media tab in the browser build
- **THEN** the "Add from YouTube link" action is present and behaves as it does in the desktop build

#### Scenario: Nothing is downloaded
- **WHEN** a YouTube slide is added and later presented
- **THEN** no copy of the video is written to disk or to browser storage, and removing the slide leaves nothing behind

### Requirement: Accepted URL forms are validated before a slide is created
The system SHALL extract a video id from the standard YouTube URL forms — `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, and `/live/` — and SHALL refuse, with a stated reason, any input from which no video id can be extracted. A refused input SHALL NOT create a slide.

#### Scenario: Short link is accepted
- **WHEN** a user pastes a `youtu.be` short link
- **THEN** it is accepted and produces the same slide as the equivalent `watch?v=` link

#### Scenario: Playlist or channel URL is refused
- **WHEN** a user pastes a YouTube channel or playlist URL with no video id
- **THEN** the system states that the link is not a single YouTube video and no slide is created

#### Scenario: Non-YouTube URL is refused
- **WHEN** a user pastes a URL from another site
- **THEN** the system states that only YouTube links are supported and no slide is created

### Requirement: A YouTube slide renders as an embedded player in preview and output
The system SHALL render a YouTube slide through the same slide-rendering surface as every other media slide, in the slide console, the preview panel, and the presentation output window, honoring the configured aspect ratio.

#### Scenario: Same render in all three surfaces
- **WHEN** a YouTube slide is shown in the slide console, previewed, and sent to the output window
- **THEN** all three show the same video framed to the configured aspect ratio rather than stretched

#### Scenario: Player chrome does not navigate the app
- **WHEN** a user clicks a link inside the embedded player on the output window
- **THEN** the app window does not navigate away from the presentation output

### Requirement: YouTube playback honors the slide's start, loop, and mute settings
The system SHALL begin a YouTube slide from its configured start time each time it is sent to the output window, SHALL honor the slide's loop setting, and SHALL play muted unless the slide's mute setting has been turned off. Where the browser's autoplay policy prevents an unmuted video from starting automatically, the system SHALL present a single explicit play affordance rather than appearing to play nothing.

#### Scenario: Re-sending restarts from the start time
- **WHEN** a user sends a YouTube slide with a start time of 30 seconds to the output, then sends it again
- **THEN** playback restarts at 30 seconds rather than resuming

#### Scenario: Loop is honored
- **WHEN** a looping YouTube slide reaches its end on the output window
- **THEN** it starts again from its start time

#### Scenario: Audio is off unless requested
- **WHEN** a YouTube slide is sent to the output without its mute setting having been changed
- **THEN** it plays with no audio

#### Scenario: Unmuted video blocked by autoplay policy
- **WHEN** a YouTube slide with audio enabled is sent to the output and the browser blocks autoplay
- **THEN** the output shows a single play control over the video rather than a still or blank frame

### Requirement: An unplayable YouTube video reports why
The system SHALL detect, at add time where possible and at play time otherwise, that a video cannot be embedded — because embedding is disabled, the video is unavailable, or the machine is offline — and SHALL render a named state on the slide stating which. A detection failure at add time SHALL be a warning, not a refusal.

#### Scenario: Embedding disabled by the uploader
- **WHEN** a user adds a video whose owner has disabled embedding
- **THEN** the add is allowed with a warning, and presenting it shows a state stating that this video cannot be embedded rather than a blank frame

#### Scenario: Offline at add time
- **WHEN** a user adds a valid YouTube link while offline
- **THEN** the slide is created and the system does not claim the video is unavailable

#### Scenario: Offline at play time
- **WHEN** a YouTube slide is sent to the output with no network connection
- **THEN** the output shows a state stating that the video needs a network connection, with the slide's title still visible
