## ADDED Requirements

### Requirement: Pushing a version tag builds a release

A release workflow SHALL trigger on tags matching `v*` and SHALL also be invocable manually for dry runs.

#### Scenario: A version tag starts the pipeline

- **WHEN** a tag matching `v*` is pushed
- **THEN** the release workflow runs

#### Scenario: Ordinary commits do not start it

- **WHEN** a commit is pushed to `main` without a tag
- **THEN** the release workflow does not run

#### Scenario: A manual run does not create a release

- **WHEN** the workflow is dispatched manually
- **THEN** it builds the platform artifacts
- **AND** it does not create or modify a GitHub Release

### Requirement: The release builds for macOS, Windows, and Linux

The workflow SHALL build the desktop application on all three platforms in parallel, with one platform's failure not discarding the others' results.

#### Scenario: All three platforms build

- **WHEN** the release workflow runs
- **THEN** a build job runs on a macOS runner, a Windows runner, and a Linux runner

#### Scenario: Each job uses the project's packaging script

- **WHEN** a platform build job runs
- **THEN** it invokes the existing `package` script for the desktop workspace
- **AND** it does not reimplement the web build, main-process compile, or preload emit steps separately

#### Scenario: One platform failing preserves the others

- **WHEN** the Windows build fails
- **THEN** the macOS and Linux jobs run to completion and upload their artifacts

### Requirement: Each platform produces named, non-colliding installers

The packaging configuration SHALL emit formats a user can actually install, named so that all platforms' artifacts coexist in a single release.

#### Scenario: macOS produces disk images and archives for both architectures

- **WHEN** the macOS build completes
- **THEN** it produces `dmg` and `zip` artifacts for both `arm64` and `x64`

#### Scenario: Windows produces an installer

- **WHEN** the Windows build completes
- **THEN** it produces an NSIS installer executable

#### Scenario: Linux produces an AppImage

- **WHEN** the Linux build completes
- **THEN** it produces an AppImage

#### Scenario: Artifact names carry product, version, and architecture

- **WHEN** the produced files are listed
- **THEN** each name includes the product name, the version, and the architecture
- **AND** no two artifacts in the release share a filename

#### Scenario: Existing packaging constraints are preserved

- **WHEN** the packaging configuration is inspected after the change
- **THEN** native module rebuilding remains disabled
- **AND** the bundled web output is still shipped unpacked as an extra resource rather than inside the asar archive

### Requirement: Releases are created as drafts for maintainer review

Artifacts SHALL be collected from all platforms and attached to a single draft GitHub Release, which a maintainer publishes manually.

#### Scenario: Publishing waits for all builds

- **WHEN** the publish job runs
- **THEN** it runs only after every platform build job has finished
- **AND** it attaches the artifacts from all of them to one release

#### Scenario: The release starts as a draft

- **WHEN** the publish job creates the release
- **THEN** the release is a draft and is not visible to the public

#### Scenario: A failed build never yields a public release

- **WHEN** a platform build fails and the maintainer discards the draft
- **THEN** no release was ever visible to users
- **AND** the tag can be deleted and re-pushed after a fix

#### Scenario: Release notes state the platform requirements

- **WHEN** the draft release notes are read
- **THEN** they list which file to download for each platform
- **AND** they state that the builds are unsigned and link to the installation instructions

### Requirement: The version number has one authoritative source

The desktop package's version SHALL be the version stamped into the binary and into artifact filenames, and the release procedure SHALL be documented.

#### Scenario: The desktop package carries the release version

- **WHEN** version `0.1.0` is released
- **THEN** `apps/desktop/package.json` declares version `0.1.0`
- **AND** the produced artifacts carry `0.1.0` in their filenames

#### Scenario: Workspace versions do not drift

- **WHEN** the workspace manifests are compared
- **THEN** the root package, the web app, and the desktop app declare the same version

#### Scenario: Cutting the next release is documented

- **WHEN** a maintainer reads `docs/release.md`
- **THEN** it lists every file whose version must be bumped
- **AND** it gives the tag-and-push command, the artifact verification steps, and how to recover from a failed build

### Requirement: Builds are unsigned, and this is stated rather than hidden

Until signing certificates exist, the pipeline SHALL produce unsigned artifacts, SHALL not fail attempting to sign them, and SHALL be structured so signing can be added without restructuring.

#### Scenario: Signing is not attempted on macOS

- **WHEN** the macOS build runs on a runner with no signing identity
- **THEN** the build completes without attempting to sign
- **AND** it does not fail on a missing certificate

#### Scenario: The unsigned status is disclosed to users

- **WHEN** a user reads the release notes or the installation documentation
- **THEN** they are told the builds are unsigned and what warning to expect on their platform

#### Scenario: Adding signing later is additive

- **WHEN** signing certificates become available
- **THEN** enabling signing requires adding repository secrets and removing the explicit no-identity setting
- **AND** it does not require restructuring the build matrix or the publish job
