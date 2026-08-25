## Purpose

Defines the starting values a slide template has before the user customises it, so a fresh template already reads well on a projector.

## ADDED Requirements

### Requirement: New templates start at 96px

A newly created slide template SHALL start with a font size of 96px.

#### Scenario: Creating a template

- **WHEN** the user opens the template builder to create a new template
- **THEN** the size control shows 96px and the preview renders at that size

### Requirement: Bundled templates use 96px

Every bundled (built-in) template SHALL use a font size of 96px.

#### Scenario: Bundled template gallery

- **WHEN** the user views or duplicates a bundled template
- **THEN** its font size is 96px

### Requirement: Saved templates are not changed

Templates and projects the user has already saved SHALL keep their stored font size.

#### Scenario: Opening an existing template

- **WHEN** the user opens a template saved with a font size of 48px
- **THEN** it still shows 48px

#### Scenario: Template with no stored font size

- **WHEN** a stored template or imported project lacks a font size
- **THEN** it resolves to 96px

### Requirement: Long passages still fit

A slide whose text does not fit the frame at 96px SHALL be shrunk by the existing auto-fit so the whole text is visible.

#### Scenario: Long verse range on a 96px template

- **WHEN** a passage several verses long is rendered with a 96px template
- **THEN** all of the text is visible inside the frame, at a reduced size
