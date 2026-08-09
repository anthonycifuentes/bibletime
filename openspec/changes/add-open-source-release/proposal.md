## Why

BibleTime is finished enough to hand to a worship leader, but there is nothing to hand them. The repo has no license, no tags, no releases, no CI, and no `.github/` at all. The landing page already ships a **Download — free** button pointing at `https://github.com/anthonycifuentes/bibletime/releases` — a page that today returns nothing. The desktop app only builds an unsigned, unpackaged `dir` for macOS arm64, on one laptop, by hand.

At the same time, making this repo public is a one-way door. Everything committed becomes permanently public, every dependency becomes an attack surface someone else can open a PR against, and `main` becomes writable by whoever gets a bad review waved through. The license, the contribution rules, and the branch protections have to land *with* the release, not after it.

## What Changes

### The repo becomes a real open source project

- **MIT license** at the repo root, with the copyright line naming Anthony Cifuentes. Chosen so a church volunteer, a fork, or a bundling distro never has to think about it.
- **`THIRD_PARTY_NOTICES.md`** enumerating every bundled non-code asset and its terms: the OFL fonts in `packages/fonts/`, the `Essential Sans Display` files that ship with **no license file** in-tree, and the Bible text in `apps/bibletime/public/bible-data/`. The MIT grant covers BibleTime's own source; this file states plainly what it does *not* cover.
- **README rewritten** for a stranger: what BibleTime is, screenshots, the hosted app at `https://bibletime-app.vercel.app`, per-platform install steps including the Gatekeeper/SmartScreen workaround for unsigned builds, and the dev quickstart. The current README is a design brief written for the author.
- **`docs/`** gains the pages the README should link to rather than absorb: `docs/install.md`, `docs/architecture.md`, `docs/bible-data.md` (provenance and how to build the trimmed JSON), and `docs/release.md` (how to cut the next tag).

### Contributing gets rules instead of vibes

- **`CONTRIBUTING.md`** — setup (pnpm 10.33.4, Node ≥20), the local gate (`pnpm lint && pnpm typecheck && pnpm build`), Conventional Commits, PR expectations, and the two architecture rules this codebase actually enforces: screaming architecture under `src/modules/<entity>` with no cross-module component imports, and the OpenSpec flow (`openspec/changes/`) for anything that changes behavior.
- **`CODE_OF_CONDUCT.md`** — Contributor Covenant 2.1, with a real reporting address.
- **Issue and PR templates** — bug report, feature request, and a PR checklist that asks for the OpenSpec change name when one applies. A `config.yml` routes security reports away from public issues.

### The repository gets protected

- **`SECURITY.md`** — private vulnerability reporting via GitHub Security Advisories, supported-versions table, and an explicit "do not open a public issue" line.
- **`CODEOWNERS`** — `@anthonycifuentes` owns everything, so no PR merges without the maintainer's review.
- **A `main` ruleset**: no direct pushes, PR required, CI checks required to pass, no force-push, no branch deletion.
- **Secret scanning and push protection enabled**, plus a repo scan for anything that shouldn't go public before the visibility flip. `.env*` is already gitignored and no secrets were found in `apps/*/src`, but this is verified once, deliberately, and recorded — not assumed.
- **Least-privilege workflow permissions**: `permissions: contents: read` by default, `contents: write` only on the release job, and every third-party action pinned to a commit SHA.
- **Dependabot** for pnpm and GitHub Actions, grouped and monthly, so the dependency surface doesn't rot.

### CI runs on every pull request

- **`.github/workflows/ci.yml`** — on PRs and pushes to `main`: pnpm install (frozen lockfile, cached), then `lint`, `typecheck`, and `build` through Turbo. One Ubuntu job. This is the check the `main` ruleset requires.

### Tagging cuts a release

- **`.github/workflows/release.yml`** — on `v*` tags: a build matrix over macOS, Windows, and Linux, each running `electron-builder`, uploading its artifacts to a **draft** GitHub Release that the maintainer reviews and publishes.
- **`electron-builder.yml` becomes distributable.** Today macOS targets `dir` on `arm64` only — that produces a folder, not something anyone can download and open. It becomes `dmg` + `zip` on `arm64` and `x64`; Windows stays NSIS; Linux stays AppImage. Artifact names get `${productName}-${version}-${arch}` so three platforms' files can coexist in one release.
- **Versions move to `0.1.0`** — root, `apps/bibletime`, `apps/desktop`. `apps/desktop/package.json` is what electron-builder stamps into the binary, so it is the one that must be right.
- **Builds ship unsigned.** No Apple Developer ID and no Windows EV cert exist. The release notes and `docs/install.md` say so, and give the right-click→Open / "More info → Run anyway" instructions instead of pretending the warning won't appear. The workflow is structured so adding signing later is adding secrets, not rewriting the job.
- **`v0.1.0` is tagged and published** — the first artifact the landing page's download button has ever had to point at.

## Capabilities

### New Capabilities

- `open-source-licensing`: the MIT grant and its boundary — what the license covers, the third-party notices file, how bundled fonts and Bible text are attributed, and the rule that any new bundled asset arrives with its terms recorded.
- `contribution-workflow`: how an outside contributor sets up, what gates their PR must clear locally and in CI, the commit and PR conventions, the architecture constraints they must respect, the code of conduct, and the issue/PR templates that collect this up front.
- `repository-protection`: the guarantees the public repo makes about itself — `main` is unpushable and review-gated, CI must pass to merge, secrets are scanned and blocked at push, vulnerabilities are reported privately, workflow tokens are least-privilege, actions are SHA-pinned, and dependencies are watched.
- `ci-checks`: the pull-request gate — what runs, on which events, with which toolchain versions, and what a failure blocks.
- `release-pipeline`: the tag-to-release path — the trigger, the three-platform matrix, the artifacts each platform produces and how they are named, the draft-first publish, the unsigned-build posture, and where the version number lives.
- `public-documentation`: what a stranger can learn without reading source — the README's contract, the install instructions per platform including unsigned-build warnings, the hosted web app link, and the `docs/` set.

### Modified Capabilities

<!-- None. openspec/specs/ is empty, and no existing requirement changes: the landing page
     already links to the Releases page and keeps doing exactly that — it merely stops
     linking to an empty one. -->

## Impact

**New:**
- `LICENSE`, `THIRD_PARTY_NOTICES.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- `.github/CODEOWNERS`, `.github/dependabot.yml`
- `.github/ISSUE_TEMPLATE/{bug_report.yml,feature_request.yml,config.yml}`, `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/{ci.yml,release.yml}`
- `docs/{install.md,architecture.md,bible-data.md,release.md}`

**Modified:**
- `README.md` — rewritten around install/use/contribute; the design-brief content moves to `docs/architecture.md`.
- `apps/desktop/electron-builder.yml` — macOS `dir` → `dmg` + `zip`, `arm64` + `x64`; artifact naming; `publish` configuration.
- `package.json`, `apps/bibletime/package.json`, `apps/desktop/package.json` — version `0.0.1` → `0.1.0`; the desktop one also gains `repository`, `license`, and `homepage` fields that electron-builder reads.

**Repo settings (outside the working tree):** `main` ruleset, secret scanning + push protection, private vulnerability reporting, default workflow permissions, and the visibility flip to public. These are configured via `gh` CLI or the web UI and verified, not committed.

**Accepted risk — explicitly decided:** `apps/bibletime/public/bible-data/rvr1960.json` (16 MB) is the full text of the Reina-Valera 1960, which is under copyright by Sociedades Bíblicas Unidas and is **not** public domain. Publishing this repository redistributes that text publicly, and every release binary embeds it. The maintainer has reviewed this and chosen to ship as-is; the swap to a public-domain edition (RVR 1909) is deliberately **out of scope** here. `THIRD_PARTY_NOTICES.md` and `docs/bible-data.md` record the provenance, the publisher, and the fact that the MIT license does not extend to this file, so the exposure is documented rather than silent. `packages/fonts/essential-sans/` carries the same shape of risk on a smaller scale — no license file accompanies it in-tree — and is documented the same way.

**Unchanged deliberately:** every application module, `packages/ui`, `packages/fonts` contents, the Vercel deployment, the OpenSpec workflow and its existing changes, and code signing/notarization (a later change, once certificates exist).

**Out of scope:** replacing or removing the RVR1960 data, git history rewriting, auto-update (`electron-updater`), Homebrew/winget/Flatpak distribution, translated docs, a changelog generator, and GitHub Discussions or Pages.
