## ADDED Requirements

### Requirement: The main branch is review-gated and cannot be pushed to directly

A repository ruleset SHALL protect `main` so that changes arrive only through reviewed pull requests with passing checks.

#### Scenario: Direct pushes are rejected

- **WHEN** anyone pushes a commit straight to `main`
- **THEN** the push is rejected and a pull request is required

#### Scenario: Review is required before merge

- **WHEN** a pull request targets `main`
- **THEN** at least one approving review is required to merge
- **AND** approvals are dismissed when new commits are pushed to the pull request

#### Scenario: Continuous integration must pass before merge

- **WHEN** a pull request targeting `main` has a failing or missing CI check
- **THEN** the merge is blocked until the required check reports success

#### Scenario: History cannot be rewritten or the branch deleted

- **WHEN** a force-push or a branch deletion is attempted against `main`
- **THEN** the operation is rejected by the ruleset

### Requirement: The maintainer owns every path

The repository SHALL contain `.github/CODEOWNERS` assigning ownership of all paths to the maintainer, so that no pull request merges without their review.

#### Scenario: All paths are owned

- **WHEN** `.github/CODEOWNERS` is read
- **THEN** a `*` rule assigns ownership to `@anthonycifuentes`

#### Scenario: Owner review is requested automatically

- **WHEN** a pull request is opened against `main`
- **THEN** the code owner is automatically added as a reviewer

### Requirement: Secrets are scanned and blocked before they enter the repository

Secret scanning with push protection SHALL be enabled on the repository, and the repository's history SHALL be audited for secrets before it is made public.

#### Scenario: Push protection blocks a credential

- **WHEN** a commit containing a recognized credential pattern is pushed
- **THEN** the push is blocked and the pusher is told what was detected

#### Scenario: History audit precedes going public

- **WHEN** the repository visibility is about to be changed to public
- **THEN** the full git history has been searched for environment files and credential-shaped paths
- **AND** a secret-scanning pass over the working tree has completed with no findings
- **AND** the audit result is recorded in `docs/release.md`

#### Scenario: Environment files stay untracked

- **WHEN** `.gitignore` is inspected
- **THEN** `.env*` is ignored
- **AND** `git ls-files` returns no environment or credential files

### Requirement: Vulnerabilities are reported privately

The repository SHALL contain `SECURITY.md` describing how to report a vulnerability, and private vulnerability reporting SHALL be enabled so those instructions work.

#### Scenario: Reporting instructions exist and are actionable

- **WHEN** a researcher opens `SECURITY.md`
- **THEN** it instructs them to report privately through GitHub Security Advisories
- **AND** it states explicitly that vulnerabilities must not be filed as public issues
- **AND** it gives an expected initial response time

#### Scenario: Private reporting is available

- **WHEN** a researcher visits the repository's Security tab
- **THEN** the option to report a vulnerability privately is present

#### Scenario: Supported versions are declared

- **WHEN** a reader checks which releases receive fixes
- **THEN** `SECURITY.md` contains a supported-versions table naming the current release line

### Requirement: Workflow tokens are least-privilege and third-party actions are pinned

Continuous integration and release workflows SHALL request only the permissions they need, and every third-party action SHALL be pinned to a full commit SHA.

#### Scenario: Default token permission is read-only

- **WHEN** a workflow file is inspected
- **THEN** it declares `permissions` explicitly rather than inheriting defaults
- **AND** jobs that only read the repository declare `contents: read`

#### Scenario: Write permission is confined to publishing

- **WHEN** the release workflow is inspected
- **THEN** `contents: write` is granted only to the job that creates the GitHub Release
- **AND** the jobs that build platform artifacts run with `contents: read`

#### Scenario: Actions are pinned to commit SHAs

- **WHEN** any `uses:` entry referencing a third-party action is inspected
- **THEN** it references a full 40-character commit SHA rather than a mutable tag or branch

#### Scenario: Repository-level Actions defaults are restricted

- **WHEN** the repository's Actions settings are inspected
- **THEN** the default workflow token permission is read-only
- **AND** GitHub Actions cannot create or approve pull requests

### Requirement: Dependencies are monitored for updates

Dependabot SHALL be configured to watch both the pnpm dependency tree and the GitHub Actions used by the workflows.

#### Scenario: Both ecosystems are watched

- **WHEN** `.github/dependabot.yml` is read
- **THEN** it declares an update configuration for npm/pnpm at the repository root
- **AND** it declares an update configuration for `github-actions`

#### Scenario: Update noise is bounded

- **WHEN** the Dependabot configuration is read
- **THEN** updates are scheduled no more frequently than monthly
- **AND** related updates are grouped so that routine bumps arrive as few pull requests rather than many
