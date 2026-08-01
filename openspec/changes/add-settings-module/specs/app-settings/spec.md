## ADDED Requirements

### Requirement: Settings navigation entry
The system SHALL provide a "Settings" entry in the sidebar navigation that opens the settings screen.

#### Scenario: User opens Settings from the sidebar
- **WHEN** a user clicks the "Settings" sidebar nav item
- **THEN** the app navigates to the `/settings` route and displays the settings screen

### Requirement: Language setting
The settings screen SHALL include a language picker showing English, Spanish, and Portuguese as options, reflecting and controlling the app's active UI locale.

#### Scenario: User changes language from Settings
- **WHEN** a user selects a different language in the settings screen's language picker
- **THEN** the app's active UI locale changes to the selected language immediately

### Requirement: Theme setting
The settings screen SHALL include a theme picker with Light, Dark, and System options, and the selected theme SHALL apply immediately and persist across restarts.

#### Scenario: User selects a fixed theme
- **WHEN** a user selects "Light" or "Dark" in the theme picker
- **THEN** the app's appearance switches to that theme immediately and remains that theme after an app restart

#### Scenario: User selects System theme
- **WHEN** a user selects "System" in the theme picker
- **THEN** the app's appearance matches the OS's current light/dark preference and updates live if the OS preference changes while the app is open

### Requirement: System information display
The settings screen SHALL display the app's version and platform, including Electron/Chrome/Node versions when running in the desktop shell.

#### Scenario: Desktop build shows full system info
- **WHEN** the settings screen is viewed in the Electron desktop app
- **THEN** it displays the app version, platform, and the Electron, Chrome, and Node versions

#### Scenario: Web build shows reduced system info
- **WHEN** the settings screen is viewed in the web build (no Electron bridge available)
- **THEN** it displays the app version and "Web" as the platform, without Electron/Chrome/Node rows

### Requirement: Donation / support placeholder section
The settings screen SHALL include a support/donate section presenting placeholder information for supporting the project.

#### Scenario: User views the support section
- **WHEN** a user views the settings screen
- **THEN** a clearly labeled support/donate section is visible with placeholder donation information, distinct from the app's real, final donation details (which are added in a later change)
