## ADDED Requirements

### Requirement: Locale selection and persistence
The system SHALL let a user select an active UI language from English, Spanish, and Portuguese, and SHALL persist that selection so it survives an app restart.

#### Scenario: User switches language
- **WHEN** a user selects a different language from the currently active one
- **THEN** the app's UI copy re-renders in the newly selected language without a page reload

#### Scenario: Selection persists across restart
- **WHEN** a user selects a language and then restarts the app
- **THEN** the app launches with that same language active, not the default

#### Scenario: First launch with no stored preference
- **WHEN** the app launches for the first time with no locale stored yet
- **THEN** the system selects the language matching the browser/OS locale if it is English, Spanish, or Portuguese, and otherwise defaults to English

### Requirement: Translated UI copy across shipped screens
The system SHALL render all user-facing UI copy on shipped screens (sidebar navigation, Bible console, templates list, settings) in the active language.

#### Scenario: Spanish UI
- **WHEN** the active language is Spanish
- **THEN** the sidebar navigation, Bible console, templates list, and settings screen display their labels in Spanish

#### Scenario: Portuguese UI
- **WHEN** the active language is Portuguese
- **THEN** the sidebar navigation, Bible console, templates list, and settings screen display their labels in Portuguese

### Requirement: UI locale does not affect Bible content
The system SHALL NOT alter the language of bundled Bible text based on the active UI locale.

#### Scenario: Non-Spanish UI locale with Spanish Bible text
- **WHEN** the active UI language is English or Portuguese
- **THEN** the bundled RVR1960 Bible text continues to display in Spanish, unaffected by the UI locale setting
