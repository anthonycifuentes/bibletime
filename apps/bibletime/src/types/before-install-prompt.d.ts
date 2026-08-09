export {}

declare global {
  /**
   * The event Chromium fires when a page meets the install criteria. Not a
   * standard — Safari and Firefox never fire it — so it isn't in `lib.dom`
   * and has to be described here.
   *
   * Calling `preventDefault()` on it suppresses whatever install affordance
   * the browser would have shown on its own and hands us the timing instead:
   * the event stays usable until `prompt()` is called, exactly once.
   */
  interface BeforeInstallPromptEvent extends Event {
    /** Install targets offered, e.g. `["web"]`. Rarely more than one on desktop. */
    readonly platforms: readonly string[]
    /** Settles once the user has answered the prompt raised by `prompt()`. */
    readonly userChoice: Promise<{
      outcome: "accepted" | "dismissed"
      platform: string
    }>
    /** Raises the browser's install dialog. Single-use. */
    prompt: () => Promise<void>
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }

  interface Window {
    /**
     * The most recent `beforeinstallprompt`, stashed by the inline script in
     * `__root.tsx` — the event usually fires before React has hydrated, and
     * an event nobody caught is an install button that never appears.
     */
    __bibletimeInstallPrompt?: BeforeInstallPromptEvent | null
  }
}
