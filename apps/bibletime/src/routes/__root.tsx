import { HeadContent, ScriptOnce, Scripts, createRootRoute } from "@tanstack/react-router"

import { AppQueryProvider } from "@/modules/core/providers"
import { LocaleProvider, useTranslation } from "@/modules/core/i18n"
import { ThemeProvider } from "@/modules/core/theme"
import { AspectRatioProvider } from "@/modules/core/aspect-ratio"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

import appCss from "@workspace/ui/globals.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "BibleTime",
      },
      {
        name: "description",
        content: "BibleTime is an offline-first Bible presentation console for churches.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "icon",
        href: "/favicon.ico",
        sizes: "any",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function NotFound() {
  const { t } = useTranslation()

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{t("notFound.title")}</h1>
      <p>{t("notFound.description")}</p>
    </main>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning below: the `dark` class is set by the blocking
  // script in <head> (and later by ThemeProvider) outside React's render —
  // React would otherwise flag that as a hydration mismatch.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Catches `beforeinstallprompt` before React has hydrated. Chromium
            fires it as soon as the page qualifies, which on a landing page is
            routinely earlier than the bundle finishes evaluating — an event
            nobody was listening for is an install button that never appears.
            `preventDefault` suppresses the browser's own affordance so the
            offer is made where the visitor is already looking, and the event
            is parked on `window` for `useInstallApp` to pick up whenever it
            mounts. See `types/before-install-prompt.d.ts`. */}
        <ScriptOnce>
          {`(function(){window.__bibletimeInstallPrompt=null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__bibletimeInstallPrompt=e;window.dispatchEvent(new Event("bibletime:installprompt"))})})()`}
        </ScriptOnce>
        {/* Sets the `dark` class before first paint (from the stored theme
            preference) so there's no flash of the wrong theme on load. */}
        <ScriptOnce>
          {`(function(){try{var t=localStorage.getItem("bibletime:theme");var d=t==="dark"||((t==="system"||!t)&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`}
        </ScriptOnce>
      </head>
      <body>
        <AppQueryProvider>
          <LocaleProvider>
            <ThemeProvider>
              <AspectRatioProvider>
                <TooltipProvider>{children}</TooltipProvider>
              </AspectRatioProvider>
            </ThemeProvider>
          </LocaleProvider>
        </AppQueryProvider>
        <Scripts />
      </body>
    </html>
  )
}
