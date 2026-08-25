## Purpose

Makes the operator console fit on small laptop screens by rendering its chrome at a compact density, without affecting what is projected or the public landing page.

## ADDED Requirements

### Requirement: Console shell renders at compact density

The console shell — the library console, the template builder, settings, and the slideshow controller — SHALL render its text, spacing and controls at 90% of the base scale (equivalent to a 90% browser zoom), so that the layout a 1366×768 screen shows at 90% zoom today is what it shows at 100% zoom.

#### Scenario: Library console on a 1366×768 display

- **WHEN** the library console is opened on a 1366×768 display at 100% browser zoom
- **THEN** the header, sidebar, slide grid, preview panel and bottom drawer are all visible without horizontal scrolling and without the operator zooming the browser out

#### Scenario: Density applies to every console view

- **WHEN** the operator navigates between the library, templates, settings and slideshow routes
- **THEN** all of them render at the same compact density

### Requirement: Projected output and landing page keep their natural scale

The compact density SHALL NOT apply to the projected output window or to the public landing page.

#### Scenario: Output window is unaffected

- **WHEN** a slide is shown in the output window
- **THEN** its text is rendered at the template's font size (subject to the existing auto-fit) exactly as before this change

#### Scenario: Landing page is unaffected

- **WHEN** a visitor opens the landing page
- **THEN** it renders at the base scale

### Requirement: Slide previews stay proportional

Slide previews inside the console SHALL continue to render text at the same proportion of the preview frame as the output renders it on the projector.

#### Scenario: Preview matches output

- **WHEN** a slide is previewed in the compact console and sent to the output
- **THEN** the text occupies the same relative area of the frame in both places
