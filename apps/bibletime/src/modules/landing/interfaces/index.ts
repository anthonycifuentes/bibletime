import type { TranslationKey } from "@/modules/core/i18n"

/**
 * One downloadable installer. macOS is two entries because the Intel and
 * Apple Silicon builds are not interchangeable — handing an Intel Mac the
 * arm64 DMG produces an app that will not open.
 */
export type DownloadTargetId = "windows" | "macos-arm64" | "macos-x64" | "linux"

/** The platform families the icon row and OS detection deal in. */
export type PlatformFamily = "windows" | "macos" | "linux"

export interface DownloadTarget {
  id: DownloadTargetId
  /** Platform name — "Windows", "macOS", "Linux". */
  labelKey: TranslationKey
  /** The qualifier under it — file type and architecture. */
  hintKey: TranslationKey
  /** Direct link to the release asset. */
  url: string
}

/**
 * Where the browser-rendered `<install>` button has got to.
 *
 * - `idle` — the button is up, nothing has happened yet.
 * - `installed` — the install went through, or the page is already running as
 *   an installed app.
 * - `dismissed` — the prompt was closed without installing. The button stays;
 *   only the line under it changes.
 * - `unavailable` — the browser declined to render a usable button.
 */
export type WebInstallState = "idle" | "installed" | "dismissed" | "unavailable"

export type LandingCardId =
  | "bible"
  | "songs"
  | "media-notes"
  | "templates"
  | "presentation"
  | "offline"

/**
 * One cell of the bento grid. Everything visible about a card is data —
 * the components only know how to render a `LandingCard`, never which card
 * they're rendering — so adding a screenshot is editing `image` here and
 * dropping the file in `public/img/`, and nothing else.
 */
export interface LandingCard {
  id: LandingCardId
  titleKey: TranslationKey
  /** The one-liner shown while the card is collapsed. */
  blurbKey: TranslationKey
  /** The longer copy revealed when the card is expanded. */
  detailKey: TranslationKey
  altKey: TranslationKey
  /** `null` until a real screenshot exists — the frame renders its placeholder. */
  image: string | null
  /**
   * Shape of the screenshot frame. `screen` is the app window's own 4:3;
   * `wide` is 16:9, the shape of a slide; `phone` is the tall placeholder
   * box a card without a screenshot falls back to.
   */
  aspect: "phone" | "screen" | "wide"
  /** How wide the card sits in the grid while collapsed. */
  span: "sm" | "md"
}
