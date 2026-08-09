## ADDED Requirements

### Requirement: Contribution guidelines document setup and the local gate

The repository SHALL contain `CONTRIBUTING.md` describing how to get the project running and what a contributor must verify before opening a pull request.

#### Scenario: Toolchain versions are stated

- **WHEN** a contributor reads the setup section
- **THEN** it states Node.js 20 or newer and pnpm 10.33.4 as the required toolchain
- **AND** it gives `pnpm install` followed by `pnpm dev` as the path to a running app

#### Scenario: The pre-PR gate matches CI

- **WHEN** a contributor reads the pull request section
- **THEN** it instructs them to run `pnpm lint`, `pnpm typecheck`, and `pnpm build` locally before opening a PR
- **AND** these are the same commands the continuous integration workflow runs

#### Scenario: Lockfile changes are covered

- **WHEN** the guidelines describe dependency changes
- **THEN** they require `pnpm-lock.yaml` to be committed alongside any `package.json` change
- **AND** they explain that a stale lockfile fails CI because installs use `--frozen-lockfile`

#### Scenario: Desktop packaging is documented for contributors

- **WHEN** a contributor wants to build the desktop app locally
- **THEN** the guidelines give `pnpm --filter desktop package` and state where the output lands

### Requirement: Contribution guidelines state the architecture constraints

`CONTRIBUTING.md` SHALL describe the codebase conventions a contributor's code must follow, so that structural feedback happens before the code is written rather than during review.

#### Scenario: Module structure rule is stated

- **WHEN** a contributor reads the conventions section
- **THEN** it describes the screaming-architecture layout — one module per domain under `apps/bibletime/src/modules/<entity>` with `views/`, `components/`, `lib/`, and `interfaces/`
- **AND** it states that a module MUST NOT import components from another feature module

#### Scenario: Import style is stated

- **WHEN** a contributor reads the conventions section
- **THEN** it states that imports use the configured path aliases rather than deep relative paths

#### Scenario: The OpenSpec flow is explained

- **WHEN** a contributor proposes a change that alters behavior
- **THEN** the guidelines direct them to create an OpenSpec change under `openspec/changes/` before implementing
- **AND** they explain that documentation, dependency bumps, and bug fixes with no behavior change do not require one

#### Scenario: Commit convention is stated

- **WHEN** a contributor reads the commit section
- **THEN** it specifies Conventional Commits with the allowed type prefixes and gives at least one example

### Requirement: The project publishes a code of conduct

The repository SHALL contain `CODE_OF_CONDUCT.md` holding the Contributor Covenant version 2.1, with a working reporting channel filled in rather than a placeholder.

#### Scenario: Code of conduct present with a real contact

- **WHEN** a reader opens `CODE_OF_CONDUCT.md`
- **THEN** it contains the Contributor Covenant 2.1 text
- **AND** the enforcement section names a reachable contact, with no unfilled template placeholder remaining

#### Scenario: Referenced from contribution guidelines

- **WHEN** a contributor reads `CONTRIBUTING.md`
- **THEN** it links to `CODE_OF_CONDUCT.md` and states that participation is subject to it

### Requirement: Issues and pull requests are opened through templates

The repository SHALL provide structured templates that collect the information a maintainer needs on first read.

#### Scenario: Bug reports collect reproduction context

- **WHEN** a user opens a new bug report
- **THEN** the form asks for the affected surface (desktop or web), the operating system, the app version, reproduction steps, and expected versus actual behavior

#### Scenario: Feature requests collect the underlying need

- **WHEN** a user opens a new feature request
- **THEN** the form asks what problem the feature solves and what the user does today instead

#### Scenario: Security reports are routed away from public issues

- **WHEN** a user reaches the new-issue chooser
- **THEN** a configuration entry directs security vulnerability reports to private reporting rather than a public issue

#### Scenario: Pull requests carry a checklist

- **WHEN** a contributor opens a pull request
- **THEN** the template asks for a summary, the related issue or OpenSpec change name, and confirmation that lint, typecheck, and build pass locally
