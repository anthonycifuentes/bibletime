# Contributing to BibleTime

Thanks for wanting to help. BibleTime is a free, local-first presentation app for churches and
ministries, and it stays that way because people fix things they run into.

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Getting set up

You need:

- **Node.js 20 or newer** (`engines.node` is `>=20`)
- **pnpm 10.33.4** — the version in the root `packageManager` field. The easiest way to get the
  right one is `corepack enable`, which reads that field for you.

```bash
git clone https://github.com/anthonycifuentes/bibletime.git
cd bibletime
pnpm install
pnpm dev
```

`pnpm dev` starts the web app on <http://localhost:3000>. The console lives at `/library`; the
public landing page is at `/`.

To run the Electron shell against that dev server:

```bash
pnpm --filter desktop dev
```

To build an installable desktop app locally:

```bash
pnpm --filter desktop package
```

Output lands in `apps/desktop/release/`. Local builds are unsigned — see
[`docs/install.md`](./docs/install.md) for the warnings that produces and how to get past them.

---

## Before you open a pull request

Run the same three commands CI runs. If they pass locally, they pass in CI:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

All three are Turbo tasks that fan out across every workspace. A failure in any of them blocks
the merge.

### Dependency changes

If you touch any `package.json`, **commit the updated `pnpm-lock.yaml` with it**. CI installs
with `pnpm install --frozen-lockfile`, so a lockfile that doesn't match the manifests fails the
run before a single test or build step executes.

---

## Code conventions

### Module structure

The web app follows **screaming architecture**: the folder names tell you what the app does,
not what framework it uses. One module per domain under `apps/bibletime/src/modules/<entity>`:

```
modules/songs/
├── views/           # full screens, composed from this module's components
├── components/      # UI owned by this module
├── lib/             # module-local helpers, constants, pure logic
├── interfaces/      # module-local types
└── index.ts         # the module's public surface
```

Existing modules — `bible`, `core`, `landing`, `library`, `media`, `notes`, `presentation`,
`sermons`, `service-plan`, `settings`, `songs`, `templates` — all follow this shape. New domains
get a new module rather than a folder inside an existing one.

**A module must not import components from another feature module.** If two modules need the
same component, it belongs in `packages/ui` or in `modules/core`. This is the rule that keeps
modules independently movable; a cross-module component import is the one review comment you
can count on.

### Imports

Use the configured path aliases, not deep relative paths:

```ts
import { Button } from "@workspace/ui/components/button"
import { useLocale } from "@/modules/core/i18n"
```

```ts
// don't
import { Button } from "../../../../packages/ui/src/components/button"
```

`@/*` maps to `apps/bibletime/src/*` and `@workspace/ui/*` to `packages/ui/src/*`.

### Shared UI components

Add shadcn/ui components to the shared package from the repo root:

```bash
pnpm dlx shadcn@latest add button -c apps/bibletime
```

They land in `packages/ui/src/components/` and are imported via `@workspace/ui/components/*`.

---

## Planning changes with OpenSpec

Anything that **changes behavior** starts as an OpenSpec change under `openspec/changes/`,
before the code is written. That gives us a proposal (why), a design (how), specs (what it must
do), and a task list — reviewed as a plan rather than argued about inside a large diff.

```bash
openspec new change add-my-feature
```

See [`docs/architecture.md`](./docs/architecture.md#planning-with-openspec) for the flow, and
any folder under `openspec/changes/` for a worked example.

**You do not need an OpenSpec change for:** documentation, dependency bumps, typo fixes, or bug
fixes that restore already-specified behavior. When in doubt, open an issue first and ask.

---

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>
```

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

```
feat(songs): auto-split pasted lyrics into labeled sections
fix(desktop): load the preload script as CommonJS so the bridge exists
docs: document the unsigned-build warning on Windows
```

Write the description in the imperative — "add", not "added" or "adds".

---

## Pull requests

- **One concern per PR.** A refactor and a feature in the same diff take three times as long to
  review.
- Fill in the PR template: what changed, the related issue or OpenSpec change name, and
  confirmation that lint/typecheck/build pass locally.
- CI must be green and the maintainer must approve — every path is owned via `CODEOWNERS`, so
  every PR gets a review.
- If your change alters the UI, include a screenshot. If it alters the projected output, include
  both the console and the output view.

---

## Bundled assets

BibleTime ships fonts and Bible text inside the app. Those are not covered by our MIT license,
and every one of them has to be accounted for.

**Any pull request that adds a bundled non-code asset — a font, a Bible translation, an image,
or media — must:**

1. Add a row to [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) naming the asset, its path,
   and its license.
2. Include the upstream license file in-tree alongside the asset, where one exists.

A PR that adds a font or translation with no license information is incomplete and will be
asked for changes. If you don't know an asset's license, that is the answer to find *before*
opening the PR — not after.

For Bible translations specifically, read [`docs/bible-data.md`](./docs/bible-data.md) first.
Prefer public-domain or openly licensed editions.

---

## Reporting bugs and requesting features

Use the [issue templates](https://github.com/anthonycifuentes/bibletime/issues/new/choose). For
bugs, the app version and your OS are the two fields that most often decide whether a report is
actionable.

**Do not report security vulnerabilities in a public issue.** See
[`SECURITY.md`](./SECURITY.md).
