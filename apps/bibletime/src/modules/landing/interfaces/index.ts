import type { TranslationKey } from "@/modules/core/i18n"

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
