## 1. License and third-party notices

- [x] 1.1 Add `LICENSE` at the repo root with the verbatim MIT text, `Copyright (c) 2026 Anthony Cifuentes`. Do not alter the wording — GitHub's detector must report "MIT".
- [x] 1.2 Inventory `packages/fonts/` — list every directory, note which ship an `OFL.txt` / `LICENSE.txt` and which do not.
- [x] 1.3 Write `THIRD_PARTY_NOTICES.md`: an opening paragraph stating that MIT covers BibleTime's source only, then a table of asset / path / terms.
- [x] 1.4 In that table, list the OFL fonts with their in-tree license paths, mark `packages/fonts/essential-sans/` as **terms unverified — no license file in-tree**, and list `apps/bibletime/public/bible-data/rvr1960.json` as © Sociedades Bíblicas Unidas, not public domain, not covered by MIT.
- [x] 1.5 Add `license`, `repository`, and `homepage` (`https://bibletime-app.vercel.app`) fields to `apps/desktop/package.json` — electron-builder folds these into the packaged metadata.

## 2. Versioning

- [x] 2.1 Bump `version` to `0.1.0` in the root `package.json`, `apps/bibletime/package.json`, and `apps/desktop/package.json`.
- [x] 2.2 Confirm all three read `0.1.0` and that nothing else in the tree hardcodes `0.0.1`.

## 3. Contributor-facing documents

- [x] 3.1 Write `CONTRIBUTING.md` — setup (Node ≥20, pnpm 10.33.4, `pnpm install`, `pnpm dev`) and the local gate `pnpm lint && pnpm typecheck && pnpm build`, stated as the same commands CI runs.
- [x] 3.2 Add the dependency rule: `pnpm-lock.yaml` must be committed with any `package.json` change, because CI installs with `--frozen-lockfile`.
- [x] 3.3 Add the conventions section — screaming architecture under `apps/bibletime/src/modules/<entity>` (`views/`, `components/`, `lib/`, `interfaces/`), no cross-module component imports, alias imports only.
- [x] 3.4 Document the OpenSpec flow: behavior changes start as a change under `openspec/changes/`; docs, dependency bumps, and no-behavior-change bug fixes do not.
- [x] 3.5 Specify Conventional Commits with the allowed prefixes and at least one worked example.
- [x] 3.6 Document local desktop packaging (`pnpm --filter desktop package`) and where output lands (`apps/desktop/release/`).
- [x] 3.7 Add the rule that any PR bundling a new font, translation, image, or media asset must add a matching `THIRD_PARTY_NOTICES.md` entry naming its license.
- [x] 3.8 Write `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1 with a real reporting contact filled in, no leftover placeholders. Link it from `CONTRIBUTING.md`.

## 4. Security policy and issue templates

- [x] 4.1 Write `SECURITY.md` — private reporting via GitHub Security Advisories, an explicit "do not open a public issue" line, an expected first-response window, and a supported-versions table naming the `0.1.x` line.
- [x] 4.2 Add `.github/ISSUE_TEMPLATE/bug_report.yml` collecting surface (desktop/web), OS, app version, reproduction steps, and expected vs. actual.
- [x] 4.3 Add `.github/ISSUE_TEMPLATE/feature_request.yml` asking what problem the feature solves and what the user does today instead.
- [x] 4.4 Add `.github/ISSUE_TEMPLATE/config.yml` routing security reports to private advisory reporting rather than a public issue.
- [x] 4.5 Add `.github/PULL_REQUEST_TEMPLATE.md` — summary, related issue or OpenSpec change name, and a checklist confirming lint/typecheck/build pass locally.
- [x] 4.6 Add `.github/CODEOWNERS` with `* @anthonycifuentes`.

## 5. Continuous integration workflow

- [x] 5.1 Create `.github/workflows/ci.yml` triggering on `pull_request` and `push` to `main`, with `permissions: { contents: read }`.
- [x] 5.2 Add setup steps: checkout, `pnpm/action-setup` pinned to the root `packageManager` version, `setup-node` with Node 20 and `cache: pnpm`.
- [x] 5.3 Install with `pnpm install --frozen-lockfile`; do **not** pass `--ignore-scripts` — the `allowBuilds` entries in `pnpm-workspace.yaml` need their postinstalls.
- [x] 5.4 Add `pnpm lint`, `pnpm typecheck`, and `pnpm build` as three separate steps so a failure is attributable from the log.
- [x] 5.5 Pin every third-party action to a full 40-character commit SHA with the version in a trailing comment.
- [ ] 5.6 Push the branch and confirm the workflow runs green end to end; fix any lint/typecheck failures the local runs did not surface.

## 6. Packaging configuration

- [x] 6.1 In `apps/desktop/electron-builder.yml`, replace the macOS `dir`/`arm64` target with `dmg` and `zip`, each for `arch: [arm64, x64]`. Keep `identity: null` and its explanatory comment.
- [x] 6.2 Add artifact naming (`${productName}-${version}-${arch}.${ext}`) so macOS arm64/x64 and the other platforms cannot collide in one release.
- [x] 6.3 Set `publish` so electron-builder does not attempt to upload — the workflow's publish job owns that.
- [x] 6.4 Leave `npmRebuild: false`, the `files` list, and the `extraResources` mapping of `../bibletime/.output` → `web` untouched, along with their comments.
- [x] 6.5 Run `pnpm --filter desktop package` locally on macOS and confirm the arm64 DMG mounts, the app launches, and the bundled Nitro server still serves the console.

## 7. Release workflow

- [x] 7.1 Create `.github/workflows/release.yml` on `push: tags: ['v*']` plus `workflow_dispatch`.
- [x] 7.2 Add a build job with `strategy: { fail-fast: false, matrix: { os: [macos-latest, windows-latest, ubuntu-latest] } }` and `permissions: { contents: read }`.
- [x] 7.3 Reuse the CI setup steps, then run `pnpm --filter desktop package` — not a reassembled sequence of the web build, tsc, and electron-builder.
- [x] 7.4 Upload `apps/desktop/release/*` installer files as a per-OS workflow artifact, excluding intermediate build directories.
- [x] 7.5 Add a publish job with `needs: build` and `permissions: { contents: write }` that downloads all artifacts and creates a **draft** release via a SHA-pinned `softprops/action-gh-release`.
- [x] 7.6 Guard the publish job so a `workflow_dispatch` run builds artifacts but never creates a release.
- [x] 7.7 Write the release-notes body: which asset to download per platform, the unsigned-build statement, and a link to `docs/install.md`.
- [ ] 7.8 Dry-run via `workflow_dispatch` and confirm all three platforms build and upload artifacts, and that no release object is created.

## 8. Dependabot

- [x] 8.1 Add `.github/dependabot.yml` with an `npm` ecosystem entry at `/` and a `github-actions` entry at `/`.
- [x] 8.2 Set both to a monthly schedule with grouped updates so routine bumps arrive as few PRs rather than many.

## 9. Documentation

- [x] 9.1 Write `docs/architecture.md` — move the motivation, design principles, and target-users prose out of the current README, and add the `apps/`/`packages/` layout, how the desktop shell serves the Nitro web output, and the OpenSpec planning flow.
- [x] 9.2 Write `docs/install.md` — which asset per platform (macOS arm64, macOS Intel, Windows, Linux), the macOS right-click-to-Open plus `xattr -dr com.apple.quarantine` step, Windows "More info → Run anyway", Linux `chmod +x`, and an explanation that these warnings exist because the builds are unsigned.
- [x] 9.3 Write `docs/bible-data.md` — upstream source (`github.com/mrk214/bible-data-es-spa`, `version_id` 149), the copyright holder, the statement that the text is not covered by MIT, the raw-input → `build-bible-data.ts` → `public/bible-data/` procedure, and how to add another translation.
- [x] 9.4 Write `docs/release.md` — the three version files to bump, the tag-and-push command, artifact verification, recovery from a failed build (delete draft + tag, re-tag), the `gh api` commands for every repository setting, and the pre-publication secret-audit checklist.
- [x] 9.5 Rewrite `README.md`: one-line description, screenshot, Download (Releases) and "Try it in your browser" (`https://bibletime-app.vercel.app`) above the fold, features in brief, install, development, then contributing/security/license links.
- [x] 9.6 Link all four `docs/` pages from the README and verify every link resolves to a file that exists.

## 10. Pre-publication audit

- [x] 10.1 Run `git log --all --full-history --name-only -- '*.env*' '*secret*' '*credential*' '*.pem' '*.key' '*.p12'` and confirm no matches in history.
- [x] 10.2 Run `git ls-files` and confirm no credential, certificate, or environment files are tracked.
- [ ] 10.3 Run a `gitleaks detect` pass over the tree and confirm it is clean; triage any finding before proceeding.
- [x] 10.4 Review every tracked file over 1 MB and confirm each is an intentional asset (Bible data, fonts, icons).
- [x] 10.5 Record the audit date and results in `docs/release.md`.

## 11. Repository settings

- [ ] 11.1 Enable secret scanning and push protection.
- [ ] 11.2 Enable private vulnerability reporting so `SECURITY.md`'s instructions work.
- [ ] 11.3 Set default workflow permissions to read-only and disable Actions creating or approving pull requests.
- [ ] 11.4 Create the `main` ruleset: pull request required with 1 approval and stale-review dismissal, required status check naming the CI job, block force-push (`non_fast_forward`), block branch deletion.
- [ ] 11.5 Verify the ruleset by attempting a direct push to `main` and confirming it is rejected.
- [x] 11.6 Record the exact `gh api` commands used for 11.1–11.4 in `docs/release.md`.

## 12. Go public and cut v0.1.0

- [ ] 12.1 Confirm sections 1–11 are merged to `main` and the audit in section 10 is clean.
- [x] 12.2 ~~Flip repository visibility to public.~~ **Already public** — discovered 2026-08-09. The repo has been public since it was created on 2026-07-28 (verified: unauthenticated `api.github.com` request returns 200). The proposal and design were written assuming it was private; that premise was wrong. Consequences: the "irreversible one-way door" in design.md decision 7 is **already open**, the RVR1960 exposure is live now rather than prospective, and the protections in section 11 are overdue rather than pre-emptive — they should be applied first, not last.
- [ ] 12.3 Set the repository description and topics, and add the website field pointing at `https://bibletime-app.vercel.app`.
- [ ] 12.4 Tag `v0.1.0` and push the tag.
- [ ] 12.5 Watch the release workflow and confirm all three platform jobs succeed.
- [ ] 12.6 Download the draft's artifacts and verify each: macOS arm64 and x64 DMGs mount and launch, the Windows NSIS installer runs, the Linux AppImage runs after `chmod +x`.
- [ ] 12.7 Confirm the app opens to the console (not the landing page) and that Bible, Songs, Media, and Notes tabs load in the packaged build.
- [ ] 12.8 Fill in the release notes and publish the draft.
- [ ] 12.9 Open `https://bibletime-app.vercel.app`, click **Download — free**, and confirm it lands on a Releases page with downloadable assets.
