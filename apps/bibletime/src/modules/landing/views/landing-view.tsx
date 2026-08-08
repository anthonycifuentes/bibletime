import { BentoGrid } from "@/modules/landing/components/bento-grid"
import { LandingFooter } from "@/modules/landing/components/landing-footer"

/**
 * The public page at `/` — the only screen anyone sees before they decide
 * whether to download the app. It shows what BibleTime does and hands over
 * two ways to get it, and it asks for nothing: no account, no email, no
 * price.
 */
export function LandingView() {
  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-3 py-8 sm:p-6 sm:py-12">
        <BentoGrid />
        <LandingFooter />
      </div>
    </main>
  )
}
