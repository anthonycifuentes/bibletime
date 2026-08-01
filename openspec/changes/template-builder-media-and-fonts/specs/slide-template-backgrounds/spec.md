## ADDED Requirements

### Requirement: Slide template backgrounds support color, gradient, image, and video
A `SlideTemplate`'s background SHALL support four variants: a solid color, a CSS gradient, a still image, and a video. Each variant is stored as a discriminated `{ type, value }` pair on the template.

#### Scenario: Selecting a solid color background
- **WHEN** a user picks a color via the background color control in the template editor
- **THEN** the template's background is set to `{ type: "color", value: <hex> }` and the preview updates to that solid color

#### Scenario: Selecting a preset gradient background
- **WHEN** a user picks one of the preset gradient swatches
- **THEN** the template's background is set to `{ type: "gradient", value: <css-gradient> }`

#### Scenario: Uploading an image background
- **WHEN** a user uploads an image file under the existing size limit
- **THEN** the template's background is set to `{ type: "image", value: <data-url> }` and renders as a cover-fit background behind the text

#### Scenario: Uploading a video background on desktop
- **WHEN** a user on the desktop build uploads a video file as a background
- **THEN** the video is saved to the app's local media storage, the template's background is set to `{ type: "video", value: <media-reference> }`, and the preview plays the video looping behind the text

### Requirement: Video backgrounds are desktop-only
Video backgrounds SHALL only be offered where the template storage driver supports local media storage. The web build SHALL NOT expose a video upload control and SHALL NOT accept a `video` background type.

#### Scenario: Web build hides video upload
- **WHEN** the template editor loads under the web storage driver
- **THEN** no video upload control is shown among the background options, and only color, gradient, and image remain selectable

#### Scenario: Desktop build offers video upload
- **WHEN** the template editor loads under the desktop storage driver
- **THEN** a video upload control is shown among the background options

### Requirement: Video background media is stored outside the template record
A template's `video` background value SHALL reference locally stored media rather than embedding the video's bytes inline in the template record (JSON file or `localStorage` entry).

#### Scenario: Saved template file stays small
- **WHEN** a template with a video background is saved on desktop
- **THEN** the on-disk template JSON file contains only a reference to the stored media, not the video's raw or base64-encoded bytes

#### Scenario: Removing a template's video background
- **WHEN** a user replaces or removes a template's video background
- **THEN** the previously referenced media file is removed from local storage

### Requirement: Deleting a template with a video background cleans up its media
Deleting a saved template that has a video background SHALL also remove the associated media file from local storage.

#### Scenario: Delete template with video
- **WHEN** a user deletes a saved template whose background is a video
- **THEN** both the template record and its referenced video file are removed
