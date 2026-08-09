## Context

This change is almost entirely additive files plus repo settings. There is very little application code to touch, but several details of the existing setup constrain how the release job must be written.

**What exists today:**

- **A pnpm 10.33.4 / Turborepo monorepo.** `pnpm-workspace.yaml` globs `apps/*` and `packages/*`. Root scripts are thin wrappers: `build` → `turbo build`, likewise `lint`, `typecheck`, `format`. Every app declares those same task names, so one `pnpm build` at the root fans out correctly.
- **`pnpm-workspace.yaml` carries an `allowBuilds` block** (`esbuild`, `lightningcss`, `unrs-resolver` true; `msw` false) and the root `package.json` an `onlyBuiltDependencies` list. pnpm 10 blocks postinstall scripts by default, so CI must not add `--ignore-scripts` or these native packages silently fail to build.
- **`.npmrc` is empty** and `engines.node` is `>=20`. There is no `.nvmrc`, so the CI toolchain versions have to be stated in the workflow rather than read from a file.
- **The desktop packaging is unusual, and deliberately so.** `apps/desktop/electron-builder.yml` has three comments explaining hard-won constraints: `npmRebuild: false` (because `@electron/rebuild` walks pnpm's store and chokes on workspace links), only `dist/**` and `package.json` inside the asar, and `extraResources` copying `../bibletime/.output` to `Resources/web` **unpacked** — because the renderer is a Nitro SSR server started by `startBundledServer` in `src/main.ts`, and its dynamic imports do not resolve from inside an asar. None of that may be disturbed.
- **`package` is a three-step script**: `pnpm --filter web build` → `pnpm run build` (tsc for main, plus a separate tsc pass emitting `preload.cjs` as CommonJS) → `electron-builder`. The release job runs this same script, not a reassembled version of it.
- **macOS currently targets `dir` on `arm64` with `identity: null`.** A `dir` target is a `.app` folder — useful for local smoke tests, useless as a download. `identity: null` exists because electron-builder otherwise grabs whatever Developer ID is in the local keychain and then fails partway through signing.
- **The landing page already links to Releases.** `apps/bibletime/src/modules/landing/lib/landing-content.ts` holds the URL as a named constant. Nothing in the app needs to change for the release to be reachable.
- **`.gitignore` already covers the dangerous paths** — `.env*`, `node_modules`, `release`, `.vercel`, `.output`. The pre-publication audit is a verification step, not a cleanup project.
- **`openspec/specs/` is empty.** All prior changes live unarchived under `openspec/changes/`. Contributor docs must describe the OpenSpec flow as it is actually practiced here.

**The one-way door:** flipping visibility to public is irreversible for anything already committed. The audit and the protections must be in place *before* the flip, and the flip must come before the tag — otherwise the first release exists in a repo nobody can see.

## Goals / Non-Goals

**Goals:**

- A stranger can find BibleTime, understand it, download a working build for their OS, and get past the unsigned-app warning — without asking anyone.
- `main` cannot be pushed to, force-pushed, or merged into without review and a green CI run.
- The license boundary is stated precisely: MIT covers BibleTime's source, and the bundled Bible text and fonts are called out as *not* covered.
- Cutting release *n+1* is `git tag vX.Y.Z && git push --tags`, then clicking Publish on a draft.
- CI is one job, under five minutes, and is the same command a contributor runs locally.
- Adding code signing later is adding two secrets and deleting one config line — not rewriting the workflow.

**Non-Goals:**

- Replacing the RVR1960 data or rewriting git history. Explicitly decided against; see Risks.
- Code signing, notarization, or stapling. No certificates exist yet.
- Auto-update (`electron-updater`), package managers (Homebrew, winget, Flatpak), or a Snap/deb/rpm matrix.
- A test suite or coverage gate. There are no tests to run; CI gates what actually exists.
- Translated documentation, a changelog generator, Discussions, or GitHub Pages.

## Decisions

### 1. MIT, with the asset boundary stated in a separate file

`LICENSE` is verbatim MIT — no modifications, so GitHub's license detector recognizes it and the sidebar reads "MIT". Copyright line: `Copyright (c) 2026 Anthony Cifuentes`.

Modifying the LICENSE text to carve out the Bible data would be the intuitive move and is the wrong one: a non-standard LICENSE stops being detected as MIT, and downstream tooling starts flagging the project as unlicensed. The boundary goes in `THIRD_PARTY_NOTICES.md` instead, referenced from `LICENSE`'s neighborhood in the README, listing:

| Asset | Path | Terms |
| --- | --- | --- |
| OFL fonts (Cinzel, Geist, Quicksand, Limelight, Smokum, Mea Culpa, Manufacturing Consent, …) | `packages/fonts/<name>/` | SIL OFL 1.1 — each ships its own `OFL.txt`/`LICENSE.txt` in-tree |
| Essential Sans Display | `packages/fonts/essential-sans/` | **No license file present.** Terms unverified; not covered by MIT |
| Reina-Valera 1960 text | `apps/bibletime/public/bible-data/rvr1960.json` | © Sociedades Bíblicas Unidas. **Not public domain, not covered by MIT** |

*Alternative considered:* dual-licensing code MIT and content CC-BY. Rejected — it implies BibleTime holds rights to the content it can grant, which for RVR1960 it does not.

### 2. Version `0.1.0`, and `apps/desktop/package.json` is the one that matters

electron-builder reads `version` from the package it is invoked in. `apps/desktop/package.json` is therefore the binary's version and the source of `${version}` in artifact names. The root and `apps/bibletime` move to `0.1.0` too, purely so the three don't drift and confuse the next person.

`0.1.0` rather than `1.0.0`: this is a first public build with no signing, no auto-update, and one Bible translation. `0.x` sets the right expectation, and semver-wise it says "the API is not stable yet," which is honest.

`apps/desktop/package.json` also gains `license: "MIT"`, `repository`, and `homepage` — electron-builder folds these into the app metadata, and their absence shows up in the packaged `package.json`.

*Alternative considered:* a version-sync script or Changesets. Rejected as premature for three private packages that move together; `docs/release.md` names the three files instead.

### 3. macOS ships DMG + ZIP on both architectures; the rest of the config is left alone

```yaml
mac:
  target:
    - { target: dmg, arch: [arm64, x64] }
    - { target: zip, arch: [arm64, x64] }
  identity: null
```

DMG is what a Mac user expects to double-click. ZIP is included because it is what `electron-updater` consumes later and because it is the format that survives being passed around in chat. `x64` is added for Intel Macs, which plenty of church sound booths still run — cross-arch packaging on an arm64 runner is supported and needs no extra tooling.

`identity: null` **stays**. It is the difference between an unsigned build that works and a build that fails at the signing step on a runner with no keychain. `npmRebuild: false`, the `files` list, and the `extraResources` mapping are untouched — the comments in that file explain why, and each was earned by a bug.

Artifact naming becomes `${productName}-${version}-${arch}.${ext}` so `BibleTime-0.1.0-arm64.dmg` and `BibleTime-0.1.0-x64.dmg` can sit in the same release without collision. Linux keeps AppImage; Windows keeps NSIS (one `.exe` per release, x64).

### 4. Two workflows, both least-privilege, all third-party actions SHA-pinned

**`ci.yml`** — `pull_request` and `push: [main]`, `permissions: { contents: read }`, one `ubuntu-latest` job:

```
checkout → pnpm/action-setup → setup-node (node 20, cache: pnpm)
→ pnpm install --frozen-lockfile → pnpm lint → pnpm typecheck → pnpm build
```

`--frozen-lockfile` makes a stale lockfile a CI failure rather than a silent resolution difference. No `--ignore-scripts` — see Context; the `allowBuilds` entries need their postinstalls. Turbo caching is left off: with no remote cache, a cold GitHub runner gets nothing from it, and correctness beats a cache miss.

**`release.yml`** — `on: push: tags: ['v*']`, plus `workflow_dispatch` for dry runs.

- A build job over `[macos-latest, windows-latest, ubuntu-latest]` with `fail-fast: false`, each running `pnpm --filter desktop package`, then uploading `apps/desktop/release/*` as a workflow artifact. `permissions: { contents: read }`.
- A single publish job, `needs: build`, `permissions: { contents: write }`, downloading all artifacts and creating a **draft** release with `softprops/action-gh-release` pinned to a SHA.

`contents: write` is scoped to that one job, so a compromised dependency in the build step cannot write to the repo.

*Alternative considered:* electron-builder's built-in `--publish always` with `GH_TOKEN`. Rejected — it needs write permission in every matrix job, and it publishes as each platform finishes, so a Windows failure leaves a half-populated public release. Artifacts-then-one-publish means either all three land or nothing does.

*Alternative considered:* publishing directly instead of drafting. Rejected for a first release: a draft lets the maintainer check the DMG actually opens before anyone can download it.

### 5. Unsigned is documented, not hidden

Every platform will warn. macOS says the app "is damaged or can't be opened" (the Gatekeeper quarantine message for unsigned downloads); Windows SmartScreen shows a blue "unrecognized app" panel; Linux AppImages need `chmod +x`.

`docs/install.md` and the release notes give the exact steps — right-click → Open, or `xattr -dr com.apple.quarantine /Applications/BibleTime.app`; "More info" → "Run anyway"; `chmod +x`. A user who hits an unexplained warning assumes malware and leaves. Naming it first turns it into a known quirk.

The workflows are shaped so that signing later means adding `CSC_LINK`/`CSC_KEY_PASSWORD` (and `APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID` for notarization) as secrets and removing `identity: null` — no restructuring.

### 6. Protections are configured via `gh`, and verified, not assumed

Repo settings can't be committed. They are applied with `gh api` calls recorded verbatim in `docs/release.md` so they are reproducible and reviewable:

- **Ruleset on `main`**: `pull_request` required (1 approval, dismiss stale reviews), `required_status_checks` naming the CI job, `non_fast_forward` (blocks force-push), `deletion` blocked.
- **Secret scanning + push protection**: on.
- **Private vulnerability reporting**: on — this is what makes `SECURITY.md`'s instructions actually work.
- **Default workflow permissions**: read-only, and "allow GitHub Actions to create and approve pull requests" off.
- **`.github/CODEOWNERS`**: `* @anthonycifuentes`. Combined with the ruleset, every PR needs the maintainer.

The pre-flip audit is a specific checklist, not a vibe: `git log --all --full-history -- '*.env*'` returns nothing, `git ls-files` contains no key/credential paths, and a `gitleaks detect --no-git` pass over the tree is clean. It runs against **history**, not just the working tree, because history is what goes public.

### 7. Ordering: protect → publish → tag

1. Docs, license, templates, workflows merged while still private.
2. Audit history for secrets.
3. Apply repo settings — ruleset, scanning, CODEOWNERS, workflow permissions.
4. Flip visibility to public.
5. Tag `v0.1.0`, let the matrix build, review the draft, publish.

Tagging before the flip would run the release in a private repo and produce a Releases page nobody outside can reach. Flipping before the ruleset would leave a window where `main` is public and unprotected.

### 8. README is rewritten; the design brief moves rather than dies

The current README is a product design document — motivation, design principles, target users, feature inventory. That is genuinely useful context, and it is the wrong first screen for someone who wants a download link.

New README: one-line description, screenshot, **Download** and **Try it in your browser** (`https://bibletime-app.vercel.app`) up top, then features in brief, then install, then development, then contributing/license. The existing motivation/principles/target-users prose moves to `docs/architecture.md` alongside the monorepo layout — nothing is lost, it just stops being the front door.

## Risks / Trade-offs

**[RVR1960 is copyrighted and this change publishes it]** → *Accepted by the maintainer after the risk was raised; the swap to a public-domain edition is out of scope.* The mitigation carried here is documentary, not legal: `THIRD_PARTY_NOTICES.md` and `docs/bible-data.md` name the publisher, state that the text is not covered by MIT, and record its provenance (`github.com/mrk214/bible-data-es-spa`, version_id 149). If a takedown request ever arrives, the file is one `git rm` plus a data-pack loader away from removal — the app reads the JSON through a single path, so nothing else unravels. Note that a later removal does **not** retroactively clear the git history or the shipped binaries.

**[Essential Sans Display ships with no license file]** → Documented as "terms unverified" rather than asserted to be free. The realistic fix is verifying the license or substituting an OFL face for the UI font; that is a follow-up change, not this one.

**[Unsigned builds get flagged, and some users will bounce]** → Install docs lead with it and give exact commands per platform. Ceiling on the mitigation: some corporate-managed machines block unsigned executables at policy level regardless. Signing is the real fix and is scoped out.

**[Cross-arch macOS packaging is less exercised than native]** → `fail-fast: false` on the matrix means one broken arch doesn't kill the other artifacts, and the draft-first flow means a bad DMG is caught before anyone downloads it. Manual verification of both DMGs is an explicit release task.

**[`--frozen-lockfile` will fail CI whenever the lockfile drifts]** → Intended. `CONTRIBUTING.md` tells contributors to commit `pnpm-lock.yaml` alongside any `package.json` change.

**[16 MB of Bible JSON plus ~40 font files inflate every artifact and every clone]** → Accepted. It is the price of local-first: the app must work with no network. Release assets will run to a few hundred MB across three platforms, which is within GitHub's 2 GB per-file limit with enormous headroom.

**[A public repo attracts drive-by and AI-generated PRs]** → CODEOWNERS plus the `main` ruleset means nothing merges without the maintainer. The PR template asks for the OpenSpec change name, which raises the cost of a low-effort contribution. Actions from forks require approval by default, so a hostile PR cannot run workflows unprompted.

## Migration Plan

There is no data or API migration. The rollout is the ordering in Decision 7, and each step has a way back:

- **Docs, workflows, config** — ordinary commits on a branch; revert if wrong.
- **Repo settings** — reversible in the UI at any point.
- **Visibility flip** — *irreversible for what is already public.* Gated on the history audit; this is the step to be slow about.
- **The tag** — if the build fails or an artifact is bad, delete the draft release and the tag, fix, and re-tag. Because the release is created as a draft, a broken `v0.1.0` is never visible to users. `v0.1.1` is also always available rather than reusing a tag.

## Open Questions

- **Contact address for `CODE_OF_CONDUCT.md` and `SECURITY.md`.** Placeholder is the maintainer's GitHub profile plus private vulnerability reporting; a dedicated address can be substituted at implementation time if preferred.
- **Whether `workflow_dispatch` on `release.yml` should be able to produce a draft, or only build-and-discard.** Leaning build-and-discard, so a dry run can never create a release object.
- **Whether Windows builds should also produce a portable `.exe`** alongside the NSIS installer, for locked-down machines where users can't install software. Cheap to add; deferred unless asked for.
