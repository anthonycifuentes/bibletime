import { useTranslation } from "@/modules/core/i18n"
import { DownloadActions } from "@/modules/landing/components/download-actions"

/**
 * The grid's first cell: who this is and what it does, then the two
 * actions. Deliberately not a card — it holds real links, and a card is a
 * `<button>` that can't legally contain them.
 */
export function LandingHero() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col justify-between gap-8 rounded-3xl border border-border bg-card p-6 sm:p-8 md:col-span-2">
      <div className="flex flex-col gap-5">
        <img
          src="/icon-192.png"
          alt=""
          width={64}
          height={64}
          className="size-14 rounded-2xl border border-border sm:size-16"
        />

        <div className="flex flex-col gap-3">
          <h1 className="text-4xl leading-[0.95] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            BibleTime
          </h1>
          <p className="max-w-md text-base text-pretty text-muted-foreground sm:text-lg">
            {t("landing.tagline")}
          </p>
        </div>
      </div>

      <DownloadActions />
    </div>
  )
}
