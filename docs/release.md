# Release and repository runbook

For maintainers. How to cut a release, and how the repository's protections are configured.

---

## Cutting a release

### 1. Bump the version

Three files, all to the same number:

| File | Why it matters |
| --- | --- |
| `apps/desktop/package.json` | **The authoritative one.** electron-builder stamps this into the binary and into every artifact filename |
| `apps/bibletime/package.json` | Kept in sync so the three don't drift |
| `package.json` (root) | Same |

```bash
grep '"version"' package.json apps/bibletime/package.json apps/desktop/package.json
```

All three must print the same value before you tag.

### 2. Verify locally

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm build
pnpm --filter desktop package
```

The last command writes installers to `apps/desktop/release/`. On macOS you'll get four files
(`arm64`/`x64` × `dmg`/`zip`). Mount one and confirm the app opens and the console loads:

```bash
hdiutil attach apps/desktop/release/BibleTime-<version>-arm64.dmg
open "/Volumes/BibleTime <version>-arm64/BibleTime.app"
# when done
hdiutil detach "/Volumes/BibleTime <version>-arm64"
```

### 3. Tag and push

```bash
git tag v0.1.0
git push origin v0.1.0
```

The tag is what triggers `.github/workflows/release.yml`. Nothing else does.

### 4. Watch the build

```bash
gh run watch
```

Three jobs run in parallel — macOS, Windows, Linux. `fail-fast` is off, so one failing platform
still leaves the others' artifacts for inspection.

### 5. Verify the draft, then publish

The workflow creates a **draft** release. It is not visible to anyone until you publish it.

```bash
gh release view v0.1.0
gh release download v0.1.0 --dir /tmp/bibletime-verify
```

Check each artifact before publishing:

- [ ] `BibleTime-<version>-arm64.dmg` mounts and the app launches on Apple Silicon
- [ ] `BibleTime-<version>-x64.dmg` mounts and the app launches on Intel (or under Rosetta)
- [ ] `BibleTime-<version>-x64.exe` installs and runs on Windows
- [ ] `BibleTime-<version>-x86_64.AppImage` runs on Linux after `chmod +x`
- [ ] The app opens to the **console**, not the landing page
- [ ] Bible, Songs, Media, and Notes tabs all load
- [ ] Presenting to a second display works

Then publish:

```bash
gh release edit v0.1.0 --draft=false --latest
```

Finally, open <https://bibletime-app.vercel.app>, click **Download — free**, and confirm it lands
on a Releases page with downloadable assets.

### If a build fails

Because the release is a draft, a broken build never reached anyone. Discard and retry:

```bash
gh release delete v0.1.0 --yes
git push --delete origin v0.1.0
git tag -d v0.1.0
# fix, commit, then tag again
```

Re-using a tag is fine while the release is still a draft. Once a version has been **published**,
never re-use its tag — cut `v0.1.1` instead.

### Dry run

`workflow_dispatch` builds all three platforms and uploads workflow artifacts without creating
any release object:

```bash
gh workflow run release.yml
```

---

## Code signing (not yet enabled)

Releases are unsigned. `apps/desktop/electron-builder.yml` sets `identity: null` for macOS, which
stops electron-builder from picking up a random keychain identity and failing mid-build.

To enable signing later:

**macOS** — add repository secrets `CSC_LINK` (base64 `.p12`) and `CSC_KEY_PASSWORD`, plus
`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` for notarization. Remove
`identity: null`.

**Windows** — add `CSC_LINK` and `CSC_KEY_PASSWORD` for the code-signing certificate.

The workflow structure doesn't change; signing is additive. Until then,
[`install.md`](./install.md) documents the warnings users will see.

---

## Repository settings

These live in GitHub, not in the repo, so they're recorded here to stay reproducible. Run them
from a machine authenticated with `gh auth login`.

> **Applied 2026-08-09.** Secret scanning + push protection, private vulnerability reporting,
> read-only workflow permissions, the `main` ruleset (id `20598630`, verified by a rejected
> direct push), and the repository description/homepage/topics are all live.
>
> **Final ruleset state:** `deletion`, `non_fast_forward`, `pull_request`
> (`required_approving_review_count: 0`), and `required_status_checks`
> (`Lint, typecheck, build`), with **no bypass actors** — the rules apply to the owner too.
>
> The approval count is `0` rather than `1` because a sole maintainer cannot approve their own
> PR, and requiring one made `main` unmergeable. The alternative — adding the admin role as a
> bypass actor — would also have let the maintainer merge past a red CI run, which defeats the
> point of the gate. Raise it back to `1` (and re-enable `require_code_owner_review`) the day a
> second maintainer joins; `CODEOWNERS` is already in place for that.
>
> `allow_auto_merge` and `delete_branch_on_merge` are enabled, so `pnpm ship` can queue a PR to
> squash-merge itself the moment CI passes without weakening any rule.
>
> <details><summary>Superseded: the interim ruleset had no status-check rule</summary>
>
> While the GitHub account was locked for billing, CI could not run, so requiring a check that
> could never report would have made every PR unmergeable. The rule was added once Actions
> worked again:
>
> ```bash
> gh api -X PUT repos/anthonycifuentes/bibletime/rulesets/20598630 --input - <<'JSON'
> { "rules": [ { "type": "deletion" }, { "type": "non_fast_forward" },
>   { "type": "pull_request", "parameters": { "required_approving_review_count": 1,
>     "dismiss_stale_reviews_on_push": true, "require_code_owner_review": true,
>     "require_last_push_approval": false, "required_review_thread_resolution": false,
>     "allowed_merge_methods": ["squash","merge","rebase"] } },
>   { "type": "required_status_checks", "parameters": {
>     "strict_required_status_checks_policy": true,
>     "required_status_checks": [ { "context": "Lint, typecheck, build" } ] } } ] }
> JSON
> ```
>
> </details>

```bash
REPO=anthonycifuentes/bibletime
```

### Secret scanning and push protection

```bash
gh api -X PATCH "repos/$REPO" \
  -f 'security_and_analysis[secret_scanning][status]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
```

### Private vulnerability reporting

Makes the reporting flow in [`SECURITY.md`](../SECURITY.md) actually work.

```bash
gh api -X PUT "repos/$REPO/private-vulnerability-reporting"
```

### Least-privilege Actions defaults

```bash
gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions=read \
  -F can_approve_pull_request_reviews=false
```

### Branch protection ruleset for `main`

Requires a reviewed PR with passing CI; blocks force-pushes and deletion.

```bash
gh api -X POST "repos/$REPO/rulesets" --input - <<'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["squash", "merge", "rebase"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "Lint, typecheck, build" }
        ]
      }
    }
  ]
}
JSON
```

> The status check context must match the CI job's `name:` exactly. If you rename the job in
> `.github/workflows/ci.yml`, update the ruleset too, or the required check will never report and
> every PR will sit blocked.

Verify it works:

```bash
git checkout main
echo "# test" >> README.md && git commit -am "test: direct push" && git push origin main
# expected: rejected by the ruleset
git reset --hard origin/main
```

### Repository metadata

```bash
gh repo edit "$REPO" \
  --description "Free, local-first presentation app for churches — Bible verses, songs, sermons, notes, and media on a projector." \
  --homepage "https://bibletime-app.vercel.app" \
  --add-topic church --add-topic presentation --add-topic bible \
  --add-topic electron --add-topic react --add-topic typescript \
  --add-topic worship --add-topic local-first --add-topic tanstack-start
```

---

## Pre-publication secret audit

Run **before** making the repository public. Making it public is irreversible for anything
already committed — history included.

```bash
# 1. No environment or credential files anywhere in history
git log --all --full-history --name-only \
  -- '*.env' '*.env.*' '*secret*' '*credential*' '*.pem' '*.key' '*.p12' '*.pfx'

# 2. Nothing sensitive currently tracked
git ls-files | grep -iE '\.(env|pem|key|p12|pfx)$|secret|credential'

# 3. Full-tree secret scan
brew install gitleaks
gitleaks detect --no-git --redact -v

# 4. Every tracked file over 1 MB is an intentional asset
git ls-files -z | xargs -0 du -h 2>/dev/null | sort -rh | head -20
```

All four must come back clean (or explained) before the visibility flip.

### Audit log

| Date | Result |
| --- | --- |
| 2026-08-08 | ✅ **No secrets found.** No `.env`, `.pem`, `.key`, `.p12`, or credential-shaped file appears anywhere in git history or in the tracked tree. All 587 tracked files were pattern-scanned for AWS keys, GitHub/Slack/OpenAI tokens, Google API keys, private-key blocks, and assigned `password`/`secret`/`token` literals — no hits. Largest tracked file is `apps/bibletime/public/bible-data/rvr1960.json` (16.2 MB, intentional — see [`bible-data.md`](./bible-data.md)); everything else over 200 KB is a bundled typeface under `packages/fonts/`. External hosts referenced in source are all benign (`github.com`, `mrk214.github.io`, `lrclib.net`, `bibletime-app.vercel.app`, docs links). ⚠️ Two follow-ups — see below. |

> **⚠️ `gitleaks` was not run.** It isn't installed on the maintainer's machine, so a pattern-based
> scan was substituted for the 2026-08-08 audit. Run the real tool once before flipping
> visibility — it covers entropy-based detection that pattern matching misses:
>
> ```bash
> brew install gitleaks && gitleaks detect --no-git --redact -v
> ```

> **⚠️ Outstanding before publishing: the screenshots are not committed.**
>
> `apps/bibletime/public/img/{bible-tab,songs-tab,templates,present,new-template}.png` exist in
> the working tree but have never been added to git. They are not ignored — they were simply
> never staged.
>
> This is not a new problem, and it is not caused by open-sourcing. It means:
>
> - The landing page at <https://bibletime-app.vercel.app> is **already** rendering broken
>   images in production, because `landing-content.ts` points at `/img/bible-tab.png` and the
>   Vercel build has no such file.
> - The screenshots in `README.md` will 404 on GitHub until these are committed.
>
> Fix before publishing:
>
> ```bash
> git add apps/bibletime/public/img/
> ```
>
> These are large PNGs (~9.3 MB total, `new-template.png` alone is 4.4 MB). Consider compressing
> them or converting to WebP first — they ship in every release binary as part of the bundled
> web output.

---

## Going public

> **The repository is already public.** Verified 2026-08-09 — it has been public since it was
> created on 2026-07-28. Step 5 below is therefore already done, and the ordering advice is now
> about *catching up* rather than sequencing a flip: **apply the protections in the section above
> first**, because `main` is currently public and unprotected. The RVR1960 licensing exposure
> described in [`bible-data.md`](./bible-data.md) is live, not prospective.

Order matters. Each step assumes the previous one is done.

1. Merge all license, docs, template, and workflow changes to `main`.
2. Run the secret audit above; resolve anything it surfaces.
3. Apply every repository setting in the section above.
4. Confirm CI is green on `main`.
5. **Flip visibility** — this is the irreversible step:

   ```bash
   gh repo edit "$REPO" --visibility public --accept-visibility-change-consequences
   ```

6. Set the repository metadata (description, homepage, topics).
7. Tag `v0.1.0` and follow the release steps above.

Tagging before step 5 would build a release inside a private repository, producing a Releases
page nobody outside can reach. Flipping before step 3 would leave a window where `main` is public
and unprotected.
