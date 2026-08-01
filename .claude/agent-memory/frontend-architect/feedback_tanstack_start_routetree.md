---
name: feedback-tanstack-start-routetree
description: apps/bibletime (TanStack Start) needs a build/dev run to regenerate routeTree.gen.ts before typecheck will pass on new routes
metadata:
  type: feedback
---

In `apps/bibletime` (TanStack Start + `@tanstack/react-router`), `src/routeTree.gen.ts` is auto-generated and must NOT be hand-edited. Adding new files under `src/routes/` does not update it by itself — nothing runs the generator until Vite's TanStack Start plugin fires.

**Why:** Typed `Link to="..."`, `useNavigate({ to: ... })`, and `Route.useParams()`/`useSearch()` all type-check against the `FileRoutesByPath`/`FileRoutesByTo` interfaces declared in `routeTree.gen.ts`. If it's stale, `tsc --noEmit` fails on any new route's typed path even though the route file itself is correct.

**How to apply:** After adding/renaming route files in this app, run `pnpm --filter web build` once (a full one-shot build, not the dev server — confirmed safe to run even under a "don't run the dev server" constraint) to regenerate `routeTree.gen.ts`, then delete the `dist/` output it produces before finishing. Only after that will `pnpm --filter web typecheck` reliably reflect the new routes. This was needed when scaffolding the `bible` module's `/bible`, `/bible/$bookUsfm`, and `/bible/$bookUsfm/$chapterUsfm` routes (see [[project-bibletime-view-local-bible]]).
