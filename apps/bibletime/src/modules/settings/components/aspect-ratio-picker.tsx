import { ASPECT_RATIO_OPTIONS, useAspectRatio } from "@/modules/core/aspect-ratio"
import type { AspectRatioId } from "@/modules/core/aspect-ratio"
import { useTranslation } from "@/modules/core/i18n"
import type { TranslationKey } from "@/modules/core/i18n"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

/** Drives the aspect ratio every `SlidePreview`/`SlideFrame` renders at — console preview, editor thumbnails, and the projected output window. */
export function AspectRatioPicker() {
  const { aspectRatio, setAspectRatio } = useAspectRatio()
  const { t } = useTranslation()

  const options = ASPECT_RATIO_OPTIONS.map((option) => ({
    value: option.id,
    label: t(`settings.aspectRatio.${option.id}` as TranslationKey),
  }))

  return (
    <Select
      items={options}
      value={aspectRatio}
      onValueChange={(value) => setAspectRatio(value as AspectRatioId)}
    >
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
