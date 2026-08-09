# Architecture and design

Background on why BibleTime exists, the principles it's built on, and how the code is laid out.

---

## Motivation

BibleTime sits between two existing approaches, aiming to take the best of both:

- **ProPresenter** — the industry standard for church presentation. Powerful (multi-output,
  stage displays, live triggers, media handling) but heavy, expensive, and more complex than
  most small churches or youth groups need.
- **Wiswords** — free, web-based, and very easy to use, focused on projecting Bible verses in
  Spanish. Simple onboarding, but it requires an account and an internet connection, and is
  scoped mainly to Scripture projection rather than full-service presentation.

BibleTime's niche: ProPresenter's breadth of content types, Wiswords' simplicity, and offline
local operation. No server, no login screen, no subscription — open the app and start building
today's service.

## Design principles

- **Minimalist by default** — the operator's screen should feel closer to a clean checklist than
  a professional video editor. Few buttons, clear hierarchy, no nested settings menus for common
  tasks.
- **Local-first** — a service plan built five minutes before church starts should never depend on
  internet connectivity.
- **Fast to learn** — a volunteer with no training should be able to project a verse or a lyric
  slide within a minute of opening the app.
- **Two-screen mental model** — one screen for the operator (control view), one for the
  congregation (output view). This mirrors how every church already thinks about their setup:
  laptop plus projector.
- **Visually calm output** — clean typography, generous whitespace, subtle backgrounds and
  transitions rather than busy templates. The projected output stays plain and legible; the
  control panel is where a more distinct, modern feel can live without competing with the
  content.

## Target users

- Small-to-mid-size churches and church plants
- Youth groups and small-group Bible studies
- Independent preachers and ministries preparing their own services
- Anyone currently improvising with PowerPoint or Keynote for church slides

---

## Repository layout

A pnpm workspace driven by Turborepo:

```
apps/
  bibletime/     # the app itself — TanStack Start (React), package name "web"
  desktop/       # Electron shell that wraps it, package name "desktop"
packages/
  ui/            # shared shadcn/ui component library (@workspace/ui)
  fonts/         # bundled font files and their @font-face CSS (@workspace/fonts)
openspec/        # change proposals, designs, specs, and task lists
docs/            # this documentation
```

> The app directory is `apps/bibletime/` but its package name is `web`. Turbo filters use the
> package name, so it's `pnpm --filter web <script>`, not `--filter bibletime`.

### Module structure

`apps/bibletime/src/modules/` follows **screaming architecture** — the folder names describe
what the app does, not what framework it's built with. One module per domain:

```
modules/
  bible/          core/          landing/       library/
  media/          notes/         presentation/  sermons/
  service-plan/   settings/      songs/         templates/
```

Each module has the same internal shape:

```
modules/songs/
├── views/          # full screens, composed from this module's own components
├── components/     # UI owned by this module
├── services/       # data access and side effects
├── lib/            # module-local helpers, constants, pure logic
├── interfaces/     # module-local types
└── index.ts        # the module's public surface
```

**Modules do not import components from each other.** Shared UI belongs in `packages/ui`;
shared app-level concerns (i18n, theme, providers) belong in `modules/core`. This is what keeps
a module something you can reason about, move, or delete on its own.

Imports use path aliases — `@/*` for `apps/bibletime/src/*`, `@workspace/ui/*` for
`packages/ui/src/*` — never deep relative paths.

---

## How the desktop app works

This is the least obvious part of the codebase, and the part most likely to break if changed
carelessly.

The Electron app does **not** load a folder of static HTML. `apps/bibletime` is a TanStack Start
application that builds to a **Nitro SSR server** in `.output/`. So the desktop shell starts that
server in-process and points a `BrowserWindow` at it:

1. `apps/desktop/src/main.ts` picks a free port and sets `PORT`/`HOST` to `127.0.0.1`.
2. `startBundledServer` imports the bundled Nitro entry from the app's `Resources/web`.
3. The main window loads `http://127.0.0.1:<port>/library` — the console, not the landing page.
4. A second window renders `/present` on the external display for the congregation.

In development it skips all of that and loads `http://localhost:3000` (override with
`BIBLETIME_WEB_URL`).

### Why the packaging config looks the way it does

`apps/desktop/electron-builder.yml` carries three constraints that each came from a real bug.
Read the comments there before changing it:

- **`npmRebuild: false`** — nothing in this package builds from source, and leaving the rebuild
  step on makes `@electron/rebuild` walk pnpm's store and fail on the workspace links it finds.
- **Only `dist/**` and `package.json` go inside the asar** — the renderer is an SSR server whose
  entry uses dynamic imports, and those do not resolve from inside an asar archive.
- **`extraResources` copies `apps/bibletime/.output` to `Resources/web` unpacked** — same reason.

---

## Local-first, and the one exception

Content, media, and service plans live on the user's machine. There is no account system, no
backend, and nothing to sign in to.

The **one** network call in normal operation is optional: the Bible module can fetch a catalog of
additional translations from a public static host, so a user can add versions beyond the bundled
one. Everything already downloaded, and the bundled translation, works with no connection at all.
See [`bible-data.md`](./bible-data.md).

---

## Planning with OpenSpec

Behavior changes are planned before they're implemented, using
[OpenSpec](https://github.com/Fission-AI/OpenSpec). Each change lives in its own folder under
`openspec/changes/<change-name>/`:

| File | What it holds |
| --- | --- |
| `proposal.md` | Why the change is needed, what changes, what's out of scope |
| `design.md` | Technical decisions and their rationale, risks, trade-offs |
| `specs/<capability>/spec.md` | Testable requirements as `WHEN`/`THEN` scenarios |
| `tasks.md` | Ordered, checkable implementation steps |

The point is that the plan gets reviewed as a plan, instead of being argued about inside a
600-line diff. Browse any folder under `openspec/changes/` for a worked example.

```bash
openspec new change add-my-feature   # scaffold
openspec status --change add-my-feature
openspec validate add-my-feature
```

You do **not** need an OpenSpec change for documentation, dependency bumps, typo fixes, or bug
fixes that restore already-specified behavior.

---

## Development

```bash
pnpm install
pnpm dev                       # web app on http://localhost:3000
pnpm --filter desktop dev      # Electron shell against that dev server
```

| Command | Does |
| --- | --- |
| `pnpm build` | Build every app and package |
| `pnpm lint` | Lint everything |
| `pnpm typecheck` | Typecheck everything |
| `pnpm format` | Format with Prettier |
| `pnpm --filter desktop package` | Build installable desktop artifacts into `apps/desktop/release/` |

### Adding UI components

Add shadcn/ui components to the shared package from the repo root:

```bash
pnpm dlx shadcn@latest add button -c apps/bibletime
```

They land in `packages/ui/src/components/` and are imported as:

```tsx
import { Button } from "@workspace/ui/components/button"
```
