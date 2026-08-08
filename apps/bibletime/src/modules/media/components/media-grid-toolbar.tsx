import { useTranslation } from "@/modules/core/i18n"
import type { MediaEntryKind, MediaSortKey, MediaViewSettings } from "@/modules/media/interfaces"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Slider } from "@workspace/ui/components/slider"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, RefreshIcon } from "@hugeicons/core-free-icons"

/** Tile-width bounds for the size slider, in pixels. */
export const MIN_TILE_SIZE = 96
export const MAX_TILE_SIZE = 288

interface MediaGridToolbarProps {
  view: MediaViewSettings
  onViewChange: (view: MediaViewSettings) => void
  onRefresh: () => void
  /** How many files the current filter hides, so a filtered-to-nothing grid isn't mistaken for an empty folder. */
  hiddenCount: number
  /** Set while drilled into a document — swaps the toolbar's left side for a back affordance. */
  documentTitle?: string
  onBack?: () => void
}

/** Sorting, filtering, searching, and tile sizing for the file grid — all persisted so they survive a bottom-tab round-trip. */
export function MediaGridToolbar({
  view,
  onViewChange,
  onRefresh,
  hiddenCount,
  documentTitle,
  onBack,
}: MediaGridToolbarProps) {
  const { t } = useTranslation()

  const update = (patch: Partial<MediaViewSettings>) => onViewChange({ ...view, ...patch })

  if (documentTitle) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="ghost" size="icon-sm" onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          <span className="sr-only">{t("media.backToFolder")}</span>
        </Button>
        <span className="truncate text-sm font-medium">{documentTitle}</span>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Input
        value={view.search}
        onChange={(event) => update({ search: event.target.value })}
        placeholder={t("media.searchPlaceholder")}
        aria-label={t("media.searchPlaceholder")}
        className="h-8 w-40"
      />

      <Select
        items={[
          { value: "name", label: t("media.sortName") },
          { value: "date", label: t("media.sortDate") },
          { value: "size", label: t("media.sortSize") },
        ]}
        value={view.sortKey}
        onValueChange={(value) => update({ sortKey: value as MediaSortKey })}
      >
        <SelectTrigger className="h-8 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">{t("media.sortName")}</SelectItem>
          <SelectItem value="date">{t("media.sortDate")}</SelectItem>
          <SelectItem value="size">{t("media.sortSize")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        items={[
          { value: "all", label: t("media.kindAll") },
          { value: "image", label: t("media.kindImage") },
          { value: "video", label: t("media.kindVideo") },
          { value: "document", label: t("media.kindDocument") },
        ]}
        value={view.kindFilter ?? "all"}
        onValueChange={(value) =>
          update({ kindFilter: value === "all" ? null : (value as MediaEntryKind) })
        }
      >
        <SelectTrigger className="h-8 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("media.kindAll")}</SelectItem>
          <SelectItem value="image">{t("media.kindImage")}</SelectItem>
          <SelectItem value="video">{t("media.kindVideo")}</SelectItem>
          <SelectItem value="document">{t("media.kindDocument")}</SelectItem>
        </SelectContent>
      </Select>

      <Slider
        value={view.thumbnailSize}
        min={MIN_TILE_SIZE}
        max={MAX_TILE_SIZE}
        step={8}
        onValueChange={(value) => update({ thumbnailSize: value })}
        aria-label={t("media.thumbnailSize")}
        className="w-24"
      />

      <Button type="button" variant="ghost" size="icon-sm" onClick={onRefresh}>
        <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
        <span className="sr-only">{t("media.refresh")}</span>
      </Button>

      {hiddenCount > 0 ? (
        <span className="text-xs text-muted-foreground">{t("media.hiddenCount", { count: hiddenCount })}</span>
      ) : null}
    </div>
  )
}
