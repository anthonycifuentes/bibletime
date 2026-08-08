import { createFileRoute } from "@tanstack/react-router"

import { LandingView } from "@/modules/landing"

/**
 * The site root is the public landing page, not a door into the console —
 * the console lives at `/library` and is entered by an explicit action.
 */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "BibleTime — free Bible presentation software",
      },
      {
        name: "description",
        content:
          "Project the Bible, songs, media, and notes from one place. Free, offline-first, for macOS, Windows, and Linux.",
      },
    ],
  }),
  component: LandingView,
})
