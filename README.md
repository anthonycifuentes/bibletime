# BibleTime

A minimalist, local-first presentation app for churches and ministries. BibleTime displays Bible verses, sermon slides, song lyrics, announcements, images, and videos on a projector or external screen, with a simple control interface for the operator.

It ships as:

- **Desktop app** (Mac and Windows) via Electron
- **Web app** accessible from any browser

Both share the same core codebase and UI. For this phase, everything is local-first: content, media, and service plans are stored on the user's machine — no account, no login, no cloud dependency.

## Motivation

BibleTime sits between two existing approaches, aiming to take the best of both:

- **ProPresenter** — the industry standard for church presentation. Powerful (multi-output, stage displays, live triggers, media handling) but heavy, expensive, and more complex than most small churches or youth groups need.
- **Wiswords** — free, web-based, and very easy to use, focused on projecting Bible verses in Spanish. Simple onboarding, but it requires an account and an internet connection, and is scoped mainly to Scripture projection rather than full-service presentation (songs, sermons, announcements, media).

BibleTime's niche: ProPresenter's breadth of content types, Wiswords' simplicity, and full offline/local operation. No server, no login screen, no subscription — just open the app and start building today's service.

## Design Principles

- **Minimalist by default** — the operator's screen should feel closer to a clean checklist than a professional NLE. Few buttons, clear hierarchy, no nested settings menus for common tasks.
- **Local-first** — a service plan built five minutes before church starts should never depend on internet connectivity.
- **Fast to learn** — a volunteer with no training should be able to project a verse or a lyric slide within a minute of opening the app.
- **Two-screen mental model** — one screen for the operator (control view), one for the congregation (output view). This mirrors how every church already thinks about their setup (laptop + projector).
- **Visually calm output** — clean typography, generous whitespace, subtle backgrounds/transitions rather than busy templates. The projected output stays plain and legible; the control panel is where a more distinct, modern feel (e.g. a liquid-glass/translucency treatment) can live without competing with the content.

## Target Users

- Small-to-mid-size churches and church plants
- Youth groups and small-group Bible studies
- Independent preachers/ministries preparing their own services
- Anyone currently improvising with PowerPoint/Keynote for church slides

## Core Features

### Bible Module
- Offline Bible text, bundled locally (starting with one or two public-domain translations per language — e.g. an open Reina-Valera edition for Spanish, WEB/KJV for English — to avoid licensing issues; more versions can be added as data packs later)
- Search/browse by book → chapter → verse, and jump-to-reference (e.g. type "Juan 3:16")
- One-click "send to output" for a verse or verse range
- Recent/favorite verses list

### Song Lyrics Module
- Song library: title, author/tags, lyrics broken into labeled sections (verse, chorus, bridge)
- Slide-by-slide navigation while singing, with next-slide preview
- Basic song editor (paste lyrics, auto-split into slides, reorder sections)

### Sermon / Slide Module
- Simple slide builder: text slides, image slides, title slides
- Reorder, duplicate, and group slides into a sermon deck
- *(Stretch/Phase 2: import existing PowerPoint/Keynote/PDF decks)*

### Announcements Module
- Template-based announcement slides (image/background + heading + body text)
- Loop mode for pre-service announcement rotation

### Media Library
- Local import of images and videos (drag-and-drop)
- Thumbnail grid, basic tagging/search
- Videos and images can be sent directly to output, or embedded as slide backgrounds

### Service Plan (Playlist)
- Build a running order for the service by dragging in items from any module (songs, verses, sermon slides, announcements, media)
- Save/load service plans, duplicate a previous week's plan as a starting point

### Control Panel & Output
- Control window: library on one side, current service plan in the middle, live/next preview on the right — the operator's home screen
- Output window: the actual congregation-facing display, sent to a second monitor/projector, background is always clean (no operator UI leaking through)
- Blackout/clear-screen shortcut
- Basic playback controls for video/audio backgrounds (play, pause, loop, volume)
- *(Phase 2: stage display/confidence monitor with next-slide + clock, for the person leading up front)*

### Import/Export
- Export the whole library + service plans as a single local backup file
- Import to restore or move to another machine — this is the "sync" workaround until real cloud sync exists

## Project Structure

This is a pnpm/Turborepo monorepo:

```
apps/
  web/        # Web app (TanStack Start)
packages/
  ui/         # Shared shadcn/ui component library
```

## Development

```bash
pnpm install
pnpm dev
```

Other scripts:

```bash
pnpm build      # build all apps/packages
pnpm lint       # lint all apps/packages
pnpm format     # format with prettier
pnpm typecheck  # typecheck all apps/packages
```

### Adding UI components

Add shadcn/ui components to the shared `ui` package by running this at the repo root:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Components are placed in `packages/ui/src/components` and imported as:

```tsx
import { Button } from "@workspace/ui/components/button";
```
