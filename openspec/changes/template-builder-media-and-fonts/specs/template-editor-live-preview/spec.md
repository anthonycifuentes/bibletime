## ADDED Requirements

### Requirement: Template editor shows a live preview pinned to the top of the screen
The template editor page SHALL display a live preview of the template being edited, positioned at the top of the screen, while the editable controls appear below it.

#### Scenario: Preview visible while editing
- **WHEN** a user opens the editor for a writable (non-bundled) template
- **THEN** a preview of that template is shown at the top of the screen, above the editing controls

#### Scenario: Preview stays visible while scrolling the controls
- **WHEN** a user scrolls down through the editing controls on a page taller than the viewport
- **THEN** the preview remains visible at the top of the screen

### Requirement: Preview updates immediately on every change
The live preview SHALL reflect every change made in the editor — background, font, color, underline, alignment, and spacing — without requiring a manual refresh or navigation.

#### Scenario: Background change reflected immediately
- **WHEN** a user changes the template's background (color, gradient, image, or video)
- **THEN** the preview updates to show the new background immediately

#### Scenario: Typography change reflected immediately
- **WHEN** a user changes font family, font color, size, bold/italic/underline, underline color, alignment, line height, or letter spacing
- **THEN** the preview updates to reflect the change immediately
