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
 * dropping the file in `public/landing/`, and nothing else.
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
  /** Shape of the screenshot frame: a tall app window or a wide one. */
  aspect: "phone" | "wide"
  /** How wide the card sits in the grid while collapsed. */
  span: "sm" | "md"
}
