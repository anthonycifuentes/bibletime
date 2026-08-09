## ADDED Requirements

### Requirement: Every pull request is checked before it can merge

A continuous integration workflow SHALL run on pull requests and on pushes to `main`, and its result SHALL be the check required by the `main` ruleset.

#### Scenario: Workflow runs on pull requests

- **WHEN** a pull request is opened or updated
- **THEN** the CI workflow runs against the merge result

#### Scenario: Workflow runs on main

- **WHEN** a commit lands on `main`
- **THEN** the CI workflow runs against it

#### Scenario: Failure blocks the merge

- **WHEN** any CI step exits non-zero
- **THEN** the workflow reports failure
- **AND** the pull request cannot be merged until it passes

### Requirement: Continuous integration runs lint, typecheck, and build

The CI job SHALL run the same three commands a contributor runs locally, through the repository's Turbo tasks, so that a green CI run and a clean local run mean the same thing.

#### Scenario: All three gates run

- **WHEN** the CI job executes
- **THEN** it runs `pnpm lint`, `pnpm typecheck`, and `pnpm build` at the repository root

#### Scenario: Steps are individually attributable

- **WHEN** a CI run fails
- **THEN** the failing step is identifiable from the job log without re-running anything locally

#### Scenario: The gate matches the documented local gate

- **WHEN** the CI commands are compared with the pre-PR commands in `CONTRIBUTING.md`
- **THEN** they are the same commands

### Requirement: Dependency installation is reproducible

The CI workflow SHALL install dependencies from the committed lockfile without modifying it, using the toolchain versions the project declares.

#### Scenario: Installs use the frozen lockfile

- **WHEN** the install step runs
- **THEN** it uses `pnpm install --frozen-lockfile`

#### Scenario: A drifted lockfile fails the run

- **WHEN** a pull request changes a `package.json` without updating `pnpm-lock.yaml`
- **THEN** the install step fails and the pull request is blocked

#### Scenario: Approved postinstall scripts still run

- **WHEN** dependencies are installed in CI
- **THEN** installation does not disable lifecycle scripts
- **AND** the native packages allowed in `pnpm-workspace.yaml` build successfully

#### Scenario: Toolchain versions are explicit and cached

- **WHEN** the workflow's setup steps are inspected
- **THEN** they pin pnpm to the version declared in the root `packageManager` field
- **AND** they select a Node.js version satisfying the `engines.node` range
- **AND** the pnpm store is cached between runs
