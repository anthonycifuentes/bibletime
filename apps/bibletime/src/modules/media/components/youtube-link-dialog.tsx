import { useState } from "react"

import { useTranslation } from "@/modules/core/i18n"
import { extractYouTubeVideoId } from "@/modules/core/lib"
import type { MediaSlideData } from "@/modules/media/interfaces"
import { buildYouTubeSlide } from "@/modules/media/lib/build-media-slide"
import { probeYouTubeVideo } from "@/modules/media/services"
import type { YouTubeProbeResult } from "@/modules/media/services"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

interface YouTubeLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Hands the finished slide back so the panel can append or present it. */
  onAdd: (slide: MediaSlideData) => void
}

/**
 * Turns a pasted YouTube URL into a slide.
 *
 * The link is checked against YouTube's oEmbed endpoint while the operator
 * is still here, so an unembeddable or deleted video is discovered at a
 * desk rather than in front of a room. A probe that cannot reach the
 * network is deliberately *not* a rejection — being offline says nothing
 * about the link (see `enable-media-tab-on-web` design decision 11).
 */
export function YouTubeLinkDialog({ open, onOpenChange, onAdd }: YouTubeLinkDialogProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState("")
  const [startSeconds, setStartSeconds] = useState("")
  const [loop, setLoop] = useState(false)
  const [muted, setMuted] = useState(true)
  const [probe, setProbe] = useState<YouTubeProbeResult | null>(null)
  const [isProbing, setIsProbing] = useState(false)

  const videoId = extractYouTubeVideoId(url)
  const isUrlInvalid = url.trim().length > 0 && videoId === null

  const reset = () => {
    setUrl("")
    setStartSeconds("")
    setLoop(false)
    setMuted(true)
    setProbe(null)
  }

  /** Probes on blur rather than on every keystroke, so a half-typed URL isn't a request. */
  const handleProbe = async () => {
    if (!videoId) return
    setIsProbing(true)
    setProbe(await probeYouTubeVideo(videoId))
    setIsProbing(false)
  }

  const handleAdd = () => {
    if (!videoId) return

    const parsedStart = Number.parseInt(startSeconds, 10)
    onAdd(
      buildYouTubeSlide(videoId, {
        title: probe?.status === "ok" ? probe.title : undefined,
        startSeconds: Number.isFinite(parsedStart) && parsedStart > 0 ? parsedStart : undefined,
        loop,
        muted,
      })
    )

    reset()
    onOpenChange(false)
  }

  /** A warning, never a blocker — the video may well be fine. */
  const probeNotice = (): string | null => {
    if (isUrlInvalid) return t("media.youtubeInvalidUrl")
    if (!probe) return null

    switch (probe.status) {
      case "not-embeddable":
        return t("media.youtubeNotEmbeddable")
      case "unavailable":
        return t("media.youtubeUnavailable")
      default:
        return null
    }
  }

  const notice = probeNotice()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("media.addYouTube")}</DialogTitle>
          <DialogDescription>{t("media.youtubeDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              setProbe(null)
            }}
            onBlur={() => void handleProbe()}
            placeholder={t("media.youtubeUrlPlaceholder")}
            aria-label={t("media.youtubeUrlPlaceholder")}
          />

          {/* The resolved title doubles as confirmation that the link is the video they meant. */}
          {probe?.status === "ok" && probe.title ? (
            <p className="text-xs text-muted-foreground">{probe.title}</p>
          ) : null}

          {isProbing ? <p className="text-xs text-muted-foreground">{t("media.youtubeChecking")}</p> : null}

          <Input
            type="number"
            min={0}
            value={startSeconds}
            onChange={(event) => setStartSeconds(event.target.value)}
            placeholder={t("media.youtubeStartSeconds")}
            aria-label={t("media.youtubeStartSeconds")}
          />

          <div className="flex gap-2">
            <Button type="button" variant={loop ? "default" : "outline"} size="sm" onClick={() => setLoop(!loop)}>
              {t("media.loop")}
            </Button>
            <Button type="button" variant={muted ? "default" : "outline"} size="sm" onClick={() => setMuted(!muted)}>
              {t("media.mute")}
            </Button>
          </div>

          {notice ? <p className="text-xs text-destructive">{notice}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("media.cancel")}
          </Button>
          <Button type="button" disabled={!videoId} onClick={handleAdd}>
            {t("media.youtubeAdd")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
