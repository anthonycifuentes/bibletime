import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { gsap } from "gsap"

import type { SlideTemplate } from "@/modules/presentation/interfaces"
import {
  getAnimatedPreset,
  getFontStack,
} from "@/modules/presentation/services"
import { cn } from "@workspace/ui/lib/utils"

export interface SlidePreviewProps {
  template: SlideTemplate
  text?: string
  /** Human-readable label shown under the text, e.g. "Génesis 1:1". */
  reference?: string
  emptyMessage?: string
  className?: string
  /** Merged onto the root element after the background-derived styles, e.g. for a caller-supplied `aspectRatio`. */
  style?: CSSProperties
  /**
   * Multiplies the template's font size for display only (e.g. a small
   * thumbnail next to the editor) — never written back to the template.
   * @default 1
   */
  scale?: number
}

const backgroundStyle = (template: SlideTemplate): CSSProperties => {
  switch (template.background.type) {
    case "color":
      return { backgroundColor: template.background.value }
    case "gradient":
      return { backgroundImage: template.background.value }
    case "image":
      return {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${template.background.value})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    case "video":
    case "animated":
      // Neither can be a CSS `background` — both render as absolutely
      // positioned elements instead (see the component body below).
      return {}
  }
}

/** Fixed, subtle crossfade timing for the text-animation toggle — intentionally not user-configurable. */
const TEXT_FADE_OUT = { duration: 0.2, ease: "power1.out" }
const TEXT_FADE_IN = { duration: 0.3, ease: "power1.out" }
/** The reference line's resting opacity (matches its `opacity-80` class) — the fade-in ends here, not at 1, so GSAP's inline style doesn't permanently override the dimmer look. */
const REFERENCE_OPACITY = 0.8

/**
 * Renders text (a verse today; a song line or announcement once those
 * modules exist) the way it would appear on the projected output, styled
 * entirely from a `SlideTemplate` — background, font, color, size, and
 * spacing all come from the template, nothing is hardcoded here.
 */
export function SlidePreview({
  template,
  text,
  reference,
  emptyMessage,
  className,
  style,
  scale = 1,
}: SlidePreviewProps) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const referenceRef = useRef<HTMLParagraphElement>(null)
  const [displayed, setDisplayed] = useState({ text, reference })

  // Crossfades the displayed text/reference whenever the incoming content
  // changes — never on a style-only re-render, since `text`/`reference` are
  // the only values in the dependency array.
  useEffect(() => {
    if (text === displayed.text && reference === displayed.reference) return

    if (!template.textAnimation) {
      setDisplayed({ text, reference })
      return
    }

    const targets = [textRef.current, referenceRef.current].filter(
      (node): node is HTMLParagraphElement => node !== null
    )
    if (targets.length === 0) {
      setDisplayed({ text, reference })
      return
    }

    const textNode = textRef.current
    const referenceNode = referenceRef.current

    const timeline = gsap.timeline()
    timeline
      .to(targets, { opacity: 0, ...TEXT_FADE_OUT })
      .call(() => setDisplayed({ text, reference }))
    if (textNode) timeline.to(textNode, { opacity: 1, ...TEXT_FADE_IN }, ">")
    if (referenceNode)
      timeline.to(
        referenceNode,
        { opacity: REFERENCE_OPACITY, ...TEXT_FADE_IN },
        "<"
      )

    return () => {
      timeline.kill()
    }
  }, [text, reference])

  const textStyle: CSSProperties = {
    fontFamily: getFontStack(template.fontFamily),
    color: template.fontColor,
    fontSize: template.fontSize * scale,
    fontWeight: template.bold ? 700 : 400,
    fontStyle: template.italic ? "italic" : "normal",
    // Longhand `textDecorationLine`, not the `textDecoration` shorthand — mixing
    // the shorthand with `textDecorationColor` triggers a React style-diffing warning.
    textDecorationLine: template.underline ? "underline" : "none",
    textDecorationColor: template.underlineColor,
    textAlign: template.textAlign,
    lineHeight: template.lineHeight,
    letterSpacing: `${template.letterSpacing}em`,
  }

  const animatedPreset =
    template.background.type === "animated"
      ? getAnimatedPreset(template.background.presetId)
      : undefined
  const AnimatedBackgroundComponent = animatedPreset?.Component

  return (
    <div
      className={cn(
        "relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden rounded-lg px-10 py-16 text-center ring-1",
        className
      )}
      style={{ ...backgroundStyle(template), ...style }}
    >
      {template.background.type === "video" ? (
        <>
          <video
            key={template.background.value}
            src={template.background.value}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-black/35" />
        </>
      ) : null}

      {template.background.type === "animated" &&
      AnimatedBackgroundComponent ? (
        <>
          <div className="absolute inset-0 size-full overflow-hidden">
            <AnimatedBackgroundComponent {...template.background.params} />
          </div>
          <div className="absolute inset-0 bg-black/35" />
        </>
      ) : null}

      {displayed.text ? (
        <>
          {/* `relative` — without it, the absolutely positioned video/overlay above would paint on top regardless of DOM order. */}
          <p
            ref={textRef}
            className="relative max-w-prose text-balance"
            style={textStyle}
          >
            {displayed.text}
          </p>
          {displayed.reference ? (
            <p
              ref={referenceRef}
              className="relative text-sm tracking-wide uppercase opacity-80"
              style={{
                fontFamily: textStyle.fontFamily,
                color: textStyle.color,
              }}
            >
              {displayed.reference}
            </p>
          ) : null}
        </>
      ) : (
        <p
          className="text-sm"
          style={{ color: template.fontColor, opacity: 0.7 }}
        >
          {emptyMessage ?? "Selecciona un versículo para previsualizar."}
        </p>
      )}
    </div>
  )
}
