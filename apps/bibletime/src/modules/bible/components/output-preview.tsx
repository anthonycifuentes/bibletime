interface OutputPreviewProps {
  /** The chapter's human-readable label, e.g. "Juan 3". */
  chapterHuman: string
  verseNumber?: number
  verseText?: string
}

/**
 * Visual-only mockup of how the selected verse would look on the projected
 * output screen: large centered type, minimal chrome, matching the app's
 * "visually calm output" design principle. Purely presentational — this
 * does not send anything to a real second window/display.
 */
export function OutputPreview({ chapterHuman, verseNumber, verseText }: OutputPreviewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 rounded-lg bg-background px-10 py-16 text-center">
      {verseText ? (
        <>
          <p className="max-w-prose text-3xl leading-relaxed font-medium text-balance">
            {verseText}
          </p>
          <p className="text-sm tracking-wide text-muted-foreground uppercase">
            {chapterHuman}
            {verseNumber !== undefined ? `:${verseNumber}` : ""}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Selecciona un versículo para previsualizar.</p>
      )}
    </div>
  )
}
