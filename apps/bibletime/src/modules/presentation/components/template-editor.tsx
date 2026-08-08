import { useRef } from "react"
import type { ReactNode } from "react"

import type { SlideBackground, SlideTemplate, SlideTextAlign } from "@/modules/presentation/interfaces"
import {
  ANIMATED_BACKGROUND_REGISTRY,
  DEFAULT_GRADIENT_SPEC,
  FONT_REGISTRY,
  PRESET_BACKGROUNDS,
  applyGradientSpec,
  getAnimatedPreset,
  getDefaultAnimatedParams,
} from "@/modules/presentation/services"
import { GradientEditor } from "@/modules/presentation/components/gradient-editor"
import { useTranslation } from "@/modules/core/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { SliderComfortable } from "@workspace/ui/components/slider-comfortable"
import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiMagicIcon,
  Delete02Icon,
  PaintBoardIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  Upload01Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons"

const MAX_IMAGE_BYTES = 3 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

interface TemplateEditorProps {
  template: SlideTemplate
  onChange: (patch: Partial<SlideTemplate>) => void
  onReset: () => void
  /** Whether the current storage driver can hold video background media locally (desktop only). */
  canUseVideoBackground: boolean
}

/** Frees a background's video media (if it has any) before it's replaced/removed — a no-op for every other background type. */
const releaseVideoMedia = (background: SlideBackground): void => {
  if (background.type === "video" && window.bibletime?.templateMedia) {
    void window.bibletime.templateMedia.remove(background.value)
  }
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

/**
 * The slide template editor: background, typography, and spacing controls,
 * all writing straight through `onChange` to the persisted `SlideTemplate`.
 * Built from the app's own design-system primitives (Card/Button/Select/
 * Input), not a copy of any reference tool's visual style.
 */
export function TemplateEditor({ template, onChange, onReset, canUseVideoBackground }: TemplateEditorProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)

  const setBackground = (background: SlideBackground) => {
    releaseVideoMedia(template.background)
    onChange({ background })
  }

  const setBackgroundParam = (key: string, value: number | string | boolean) => {
    if (template.background.type !== "animated") return
    onChange({
      background: {
        ...template.background,
        params: { ...template.background.params, [key]: value },
      },
    })
  }

  const handleImageUpload = (file: File | undefined) => {
    if (!file) return

    if (file.size > MAX_IMAGE_BYTES) {
      window.alert("La imagen es muy grande (máximo 3 MB).")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBackground({ type: "image", value: reader.result })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleVideoUpload = async (file: File | undefined) => {
    if (!file || !window.bibletime?.templateMedia) return

    if (file.size > MAX_VIDEO_BYTES) {
      window.alert("El video es muy grande (máximo 100 MB).")
      return
    }

    const extension = file.name.split(".").pop() ?? "mp4"
    const buffer = await file.arrayBuffer()
    const reference = await window.bibletime.templateMedia.save(buffer, extension)
    setBackground({ type: "video", value: reference })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Fondo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-6 gap-2">
            {PRESET_BACKGROUNDS.map((preset) => {
              const isActive =
                (template.background.type === "color" || template.background.type === "gradient") &&
                template.background.type === preset.background.type &&
                template.background.value === preset.background.value

              return (
                <button
                  key={preset.label}
                  type="button"
                  title={preset.label}
                  aria-label={preset.label}
                  onClick={() => setBackground(preset.background)}
                  className={cn(
                    "aspect-square rounded-md ring-1 ring-border transition-all",
                    isActive && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                  )}
                  style={
                    preset.background.type === "color"
                      ? { backgroundColor: preset.background.value }
                      : { backgroundImage: preset.background.value }
                  }
                />
              )
            })}
          </div>

          <SettingRow label="Color sólido">
            <input
              type="color"
              value={template.background.type === "color" ? template.background.value : "#111114"}
              onChange={(event) => setBackground({ type: "color", value: event.target.value })}
              className="size-8 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
            />
          </SettingRow>

          <SettingRow label={t("templates.gradient.title")}>
            <div className="flex items-center gap-2">
              {template.background.type === "gradient" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setBackground(PRESET_BACKGROUNDS[1].background)}
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  <span className="sr-only">{t("templates.gradient.remove")}</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBackground(applyGradientSpec(DEFAULT_GRADIENT_SPEC))}
                >
                  <HugeiconsIcon icon={PaintBoardIcon} strokeWidth={2} />
                  {t("templates.gradient.title")}
                </Button>
              )}
            </div>
          </SettingRow>

          {/*
            Expands in place while the background is a gradient — the same
            shape as the animated-background controls further down, so the
            rail reads consistently rather than opening a second surface.
          */}
          {template.background.type === "gradient" ? (
            <GradientEditor background={template.background} onChange={setBackground} />
          ) : null}

          <SettingRow label="Imagen">
            <div className="flex items-center gap-2">
              {template.background.type === "image" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setBackground(PRESET_BACKGROUNDS[0].background)}
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  <span className="sr-only">Quitar imagen</span>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} />
                Subir
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleImageUpload(event.target.files?.[0])}
              />
            </div>
          </SettingRow>

          {canUseVideoBackground ? (
            <SettingRow label="Video">
              <div className="flex items-center gap-2">
                {template.background.type === "video" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setBackground(PRESET_BACKGROUNDS[0].background)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    <span className="sr-only">Quitar video</span>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <HugeiconsIcon icon={Video01Icon} strokeWidth={2} />
                  Subir
                </Button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => void handleVideoUpload(event.target.files?.[0])}
                />
              </div>
            </SettingRow>
          ) : null}

          <SettingRow label="Animado">
            <div className="flex items-center gap-2">
              {template.background.type === "animated" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setBackground(PRESET_BACKGROUNDS[0].background)}
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  <span className="sr-only">Quitar fondo animado</span>
                </Button>
              ) : null}
              <Select
                items={ANIMATED_BACKGROUND_REGISTRY.map(({ id, label }) => ({ value: id, label }))}
                value={template.background.type === "animated" ? template.background.presetId : null}
                onValueChange={(value) => {
                  if (!value) return
                  const preset = getAnimatedPreset(value)
                  if (!preset) return
                  setBackground({ type: "animated", presetId: preset.id, params: getDefaultAnimatedParams(preset) })
                }}
              >
                <SelectTrigger size="sm" className="w-32">
                  <SelectValue placeholder="Elegir" />
                </SelectTrigger>
                <SelectContent>
                  {ANIMATED_BACKGROUND_REGISTRY.map(({ id, label }) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SettingRow>

          {template.background.type === "animated"
            ? getAnimatedPreset(template.background.presetId)?.controls.map((control) => {
                const background = template.background
                const currentValue =
                  background.type === "animated" && control.key in background.params
                    ? background.params[control.key]
                    : control.default

                if (control.type === "number") {
                  return (
                    <SliderComfortable
                      key={control.key}
                      variant="scrubber"
                      label={control.label}
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={typeof currentValue === "number" ? currentValue : control.default}
                      onChange={(value) => setBackgroundParam(control.key, value)}
                      formatValue={(value) => value.toFixed(2)}
                    />
                  )
                }

                if (control.type === "boolean") {
                  const isOn = typeof currentValue === "boolean" ? currentValue : control.default
                  return (
                    <SettingRow key={control.key} label={control.label}>
                      <Button
                        type="button"
                        variant={isOn ? "default" : "outline"}
                        size="sm"
                        aria-pressed={isOn}
                        onClick={() => setBackgroundParam(control.key, !isOn)}
                      >
                        {isOn ? "Sí" : "No"}
                      </Button>
                    </SettingRow>
                  )
                }

                const colorValue = typeof currentValue === "string" ? currentValue : control.default
                return (
                  <SettingRow key={control.key} label={control.label}>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorValue}
                        onChange={(event) => setBackgroundParam(control.key, event.target.value)}
                        className="size-8 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                      />
                      <Input
                        value={colorValue}
                        onChange={(event) => setBackgroundParam(control.key, event.target.value)}
                        className="w-24"
                        aria-label={control.label}
                      />
                    </div>
                  </SettingRow>
                )
              })
            : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipografía</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <SettingRow label="Familia">
            <Select
              items={FONT_REGISTRY.map(({ id, label }) => ({ value: id, label }))}
              value={template.fontFamily}
              onValueChange={(value) => {
                if (value) onChange({ fontFamily: value })
              }}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_REGISTRY.map(({ id, label }) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Color de texto">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={template.fontColor}
                onChange={(event) => onChange({ fontColor: event.target.value })}
                className="size-8 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
              />
              <Input
                value={template.fontColor}
                onChange={(event) => onChange({ fontColor: event.target.value })}
                className="w-24"
                aria-label="Color de texto en hexadecimal"
              />
            </div>
          </SettingRow>

          <SliderComfortable
            variant="scrubber"
            label="Tamaño"
            value={template.fontSize}
            onChange={(value) => onChange({ fontSize: value })}
            step={2}
            min={16}
            max={96}
            formatValue={(value) => `${value}px`}
          />

          <SettingRow label="Estilo">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={template.bold ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onChange({ bold: !template.bold })}
              >
                <HugeiconsIcon icon={TextBoldIcon} strokeWidth={2} />
              </Button>
              <Button
                type="button"
                variant={template.italic ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onChange({ italic: !template.italic })}
              >
                <HugeiconsIcon icon={TextItalicIcon} strokeWidth={2} />
              </Button>
              <Button
                type="button"
                variant={template.underline ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onChange({ underline: !template.underline })}
              >
                <HugeiconsIcon icon={TextUnderlineIcon} strokeWidth={2} />
              </Button>
            </div>
          </SettingRow>

          {template.underline ? (
            <SettingRow label="Color de subrayado">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={template.underlineColor}
                  onChange={(event) => onChange({ underlineColor: event.target.value })}
                  className="size-8 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                />
                <Input
                  value={template.underlineColor}
                  onChange={(event) => onChange({ underlineColor: event.target.value })}
                  className="w-24"
                  aria-label="Color de subrayado en hexadecimal"
                />
              </div>
            </SettingRow>
          ) : null}

          <SettingRow label="Alineación">
            <div className="flex items-center gap-1">
              {(
                [
                  { value: "left", icon: TextAlignLeftIcon },
                  { value: "center", icon: TextAlignCenterIcon },
                  { value: "right", icon: TextAlignRightIcon },
                ] satisfies { value: SlideTextAlign; icon: typeof TextAlignLeftIcon }[]
              ).map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={template.textAlign === option.value ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => onChange({ textAlign: option.value })}
                >
                  <HugeiconsIcon icon={option.icon} strokeWidth={2} />
                </Button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Animar texto">
            <Button
              type="button"
              variant={template.textAnimation ? "default" : "outline"}
              size="icon-sm"
              aria-pressed={template.textAnimation}
              onClick={() => onChange({ textAnimation: !template.textAnimation })}
            >
              <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} />
              <span className="sr-only">Animar texto</span>
            </Button>
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Espaciado</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <SliderComfortable
            variant="scrubber"
            label="Interlineado"
            value={template.lineHeight}
            onChange={(value) => onChange({ lineHeight: value })}
            step={0.1}
            min={1}
            max={2.5}
            formatValue={(value) => value.toFixed(2)}
          />

          <SliderComfortable
            variant="scrubber"
            label="Espaciado de letras"
            value={template.letterSpacing}
            onChange={(value) => onChange({ letterSpacing: value })}
            step={0.01}
            min={-0.05}
            max={0.3}
            formatValue={(value) => `${value.toFixed(2)}em`}
          />
        </CardContent>
      </Card>

      <Button type="button" variant="ghost" size="sm" onClick={onReset} className="self-start">
        Restablecer plantilla
      </Button>
    </div>
  )
}
