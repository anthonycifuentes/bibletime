## ADDED Requirements

### Requirement: The console is entered at its own route, not at the site root
The system SHALL locate the console at `/library` and SHALL NOT treat the site root as an entry point into it. The site root serves the public landing page, from which the console is reachable by an explicit action.

#### Scenario: The root no longer forwards into the console
- **WHEN** a visitor opens the site root
- **THEN** the landing page renders, and the console is not entered until the visitor acts

#### Scenario: In-app links target the console route directly
- **WHEN** any in-console affordance links "home" — the header wordmark, the Settings back action, or a post-action return
- **THEN** it targets `/library`, not the site root

### Requirement: The desktop shell opens the console directly
The desktop application SHALL load the console route when its main window opens, in both the development and packaged builds, so the packaged app never displays the public landing page.

#### Scenario: The packaged app boots into the console
- **WHEN** the packaged desktop app starts and its main window loads
- **THEN** the console is shown, and the landing page is never rendered in that window

#### Scenario: The development shell matches the packaged one
- **WHEN** the desktop shell runs against the local development server
- **THEN** it loads the same console route the packaged build does
