## ADDED Requirements

### Requirement: Template font selection includes every bundled font family
The template editor's font selector SHALL list every font family bundled with the project (the existing generic stacks plus every family shipped under the project's fonts package), not a fixed short list.

#### Scenario: Selecting an uploaded font family
- **WHEN** a user opens the font family selector in the template editor
- **THEN** every bundled font family is listed by name, and choosing one applies that family's typeface to the preview and to the saved template

#### Scenario: Newly bundled fonts appear without a data model change
- **WHEN** a new font family is added to the project's bundled fonts
- **THEN** it appears in the font selector without requiring the template's stored shape to change

### Requirement: Unknown font references fall back to the default font
If a saved or imported template references a font family id that no longer exists, the template SHALL render with the default font family instead of failing to load.

#### Scenario: Loading a template with a removed font id
- **WHEN** a saved template references a font family id that is no longer bundled
- **THEN** the template loads successfully and renders using the default font family

### Requirement: Underline style supports an independent color
A slide template's underline style SHALL support a color independent of the main text color.

#### Scenario: Turning on underline reveals a color control
- **WHEN** a user enables the underline style in the template editor
- **THEN** a color control for the underline appears, defaulting to the template's current text color

#### Scenario: Changing underline color independently of text color
- **WHEN** a user sets the underline color to a value different from the text color
- **THEN** the preview renders the underline in the chosen color while the text itself keeps its own color

### Requirement: Templates saved before underline color existed still load correctly
A saved template that predates the underline color field SHALL load with its underline color defaulted from its text color, rather than failing or rendering an undefined color.

#### Scenario: Loading a pre-existing template
- **WHEN** a template saved before this feature existed is loaded
- **THEN** its underline color is treated as equal to its text color until the user changes it
