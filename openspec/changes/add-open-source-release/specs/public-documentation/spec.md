## ADDED Requirements

### Requirement: The README leads with what BibleTime is and how to get it

`README.md` SHALL be written for a first-time visitor, opening with what the project is and how to obtain it, before any development or design content.

#### Scenario: The opening screen answers what and how

- **WHEN** a visitor opens the repository
- **THEN** the README's first section states in one or two sentences what BibleTime is and who it is for
- **AND** a download link to the GitHub Releases page appears before any development instructions

#### Scenario: The hosted web app is linked

- **WHEN** a visitor wants to try the app without installing anything
- **THEN** the README links to `https://bibletime-app.vercel.app`

#### Scenario: The README states cost and license

- **WHEN** a visitor reads the README
- **THEN** it states that the app is free to use
- **AND** it names the MIT license and links to `LICENSE` and `THIRD_PARTY_NOTICES.md`

#### Scenario: The README shows the app

- **WHEN** a visitor reads the README
- **THEN** at least one screenshot of the application is displayed

#### Scenario: Contribution and security entry points are linked

- **WHEN** a visitor wants to contribute or report a vulnerability
- **THEN** the README links to `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`

### Requirement: Installation is documented per platform, including the unsigned-build warning

`docs/install.md` SHALL give each platform's install path and the exact steps to get past the warning an unsigned build produces.

#### Scenario: The right download is identified per platform

- **WHEN** a user reads the install documentation
- **THEN** it states which release asset to download for macOS Apple Silicon, macOS Intel, Windows, and Linux

#### Scenario: macOS Gatekeeper is addressed

- **WHEN** a macOS user is blocked from opening the app
- **THEN** the documentation gives the right-click-to-open step and the command to clear the quarantine attribute

#### Scenario: Windows SmartScreen is addressed

- **WHEN** a Windows user sees the unrecognized-app warning
- **THEN** the documentation gives the "More info" then "Run anyway" steps

#### Scenario: Linux AppImage permissions are addressed

- **WHEN** a Linux user downloads the AppImage
- **THEN** the documentation gives the command to make it executable before running it

#### Scenario: The warnings are explained, not just worked around

- **WHEN** a user reads any of the workaround steps
- **THEN** the documentation explains that the warnings appear because the builds are not code-signed

### Requirement: The project's design context and structure are documented

`docs/architecture.md` SHALL carry the project's motivation, design principles, target users, and repository layout, so that the README can stay short without discarding that context.

#### Scenario: Design context is preserved

- **WHEN** a reader opens `docs/architecture.md`
- **THEN** it contains the motivation, design principles, and target-user material previously held in the README

#### Scenario: The monorepo layout is explained

- **WHEN** a new contributor reads the architecture documentation
- **THEN** it describes the `apps/` and `packages/` layout and what each workspace is responsible for
- **AND** it explains how the desktop shell serves the web application

#### Scenario: The planning workflow is described

- **WHEN** a contributor wonders how changes are planned
- **THEN** the architecture documentation explains the OpenSpec change flow used in `openspec/`

### Requirement: The Bible data's origin and build procedure are documented

`docs/bible-data.md` SHALL record where the bundled Bible text came from, its copyright status, and how the committed file is regenerated.

#### Scenario: Provenance and rights are recorded

- **WHEN** a reader opens `docs/bible-data.md`
- **THEN** it names the upstream source of the data and its version identifier
- **AND** it states the copyright holder and that the text is not covered by the project's MIT license

#### Scenario: Regeneration is reproducible

- **WHEN** a maintainer needs to rebuild the trimmed data file
- **THEN** the documentation names the raw input file, the script that transforms it, and the command to run

#### Scenario: Adding a translation is explained

- **WHEN** a contributor wants to add another Bible version
- **THEN** the documentation describes the expected data shape and points to the licensing requirement in `CONTRIBUTING.md`

### Requirement: Documentation is reachable from the README

Every document in `docs/` SHALL be linked from `README.md`, so that no page is discoverable only by browsing the file tree.

#### Scenario: All docs are linked

- **WHEN** the README's documentation section is read
- **THEN** it links to `docs/install.md`, `docs/architecture.md`, `docs/bible-data.md`, and `docs/release.md`

#### Scenario: Links resolve

- **WHEN** each documentation link in the README is followed
- **THEN** it resolves to an existing file in the repository
