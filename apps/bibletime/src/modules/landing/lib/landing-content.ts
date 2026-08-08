import type { LandingCard } from "@/modules/landing/interfaces"

/**
 * The Releases index rather than per-platform asset URLs: an asset link
 * carries the version in its path and 404s on the next release unless the
 * landing page is edited in lockstep. The index is always current.
 */
export const RELEASES_URL = "https://github.com/anthonycifuentes/bibletime/releases"

export const REPOSITORY_URL = "https://github.com/anthonycifuentes/bibletime"

/** Where "open it in the browser" goes — the console lives here, not at `/`. */
export const CONSOLE_ROUTE = "/library" as const

/**
 * The bento grid, in reading order. `image: null` renders the placeholder
 * frame at the card's final aspect ratio, so dropping a real screenshot in
 * later moves nothing on the page.
 */
export const LANDING_CARDS: LandingCard[] = [
  {
    id: "bible",
    titleKey: "landing.card.bible.title",
    blurbKey: "landing.card.bible.blurb",
    detailKey: "landing.card.bible.detail",
    altKey: "landing.card.bible.alt",
    image: null,
    aspect: "wide",
    span: "md",
  },
  {
    id: "songs",
    titleKey: "landing.card.songs.title",
    blurbKey: "landing.card.songs.blurb",
    detailKey: "landing.card.songs.detail",
    altKey: "landing.card.songs.alt",
    image: null,
    aspect: "phone",
    span: "sm",
  },
  {
    id: "media-notes",
    titleKey: "landing.card.mediaNotes.title",
    blurbKey: "landing.card.mediaNotes.blurb",
    detailKey: "landing.card.mediaNotes.detail",
    altKey: "landing.card.mediaNotes.alt",
    image: null,
    aspect: "phone",
    span: "sm",
  },
  {
    id: "templates",
    titleKey: "landing.card.templates.title",
    blurbKey: "landing.card.templates.blurb",
    detailKey: "landing.card.templates.detail",
    altKey: "landing.card.templates.alt",
    image: null,
    aspect: "wide",
    span: "md",
  },
  {
    id: "presentation",
    titleKey: "landing.card.presentation.title",
    blurbKey: "landing.card.presentation.blurb",
    detailKey: "landing.card.presentation.detail",
    altKey: "landing.card.presentation.alt",
    image: null,
    aspect: "wide",
    span: "md",
  },
  {
    id: "offline",
    titleKey: "landing.card.offline.title",
    blurbKey: "landing.card.offline.blurb",
    detailKey: "landing.card.offline.detail",
    altKey: "landing.card.offline.alt",
    image: null,
    aspect: "wide",
    span: "md",
  },
]
