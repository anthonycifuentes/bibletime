import type { DetailedHTMLProps, HTMLAttributes } from "react"

export {}

/**
 * Why the browser is refusing to render the install button. `null` means the
 * button is valid and shown. The list is open-ended — the element is still an
 * origin trial and Chromium may add reasons — so unknown strings stay
 * assignable rather than failing to compile against a stale union.
 */
type InstallInvalidReason = "install_data_invalid" | (string & {})

declare global {
  /**
   * The DOM interface behind `<install>`: a browser-rendered, browser-worded
   * install button, in the same family as the permission elements. The label
   * and appearance are not ours to set, which is the point — the browser can
   * treat the click as real intent, so no `beforeinstallprompt` dance is
   * needed.
   *
   * Only defined in browsers that ship the element. Feature-detect with
   * `"HTMLInstallElement" in window` before rendering the tag — see
   * `useWebInstall`.
   */
  interface HTMLInstallElement extends HTMLElement {
    /** The app to install. Absent means "the app this page's manifest declares". */
    installurl: string
    /** An explicit manifest id, for manifests that don't declare one themselves. */
    manifestid: string
    /** Non-`null` when the browser has declined to render the button. */
    readonly invalidReason: InstallInvalidReason | null
  }

  interface Window {
    /** Present only where the `<install>` element is implemented and enabled. */
    HTMLInstallElement?: {
      prototype: HTMLInstallElement
      new (): HTMLInstallElement
    }
  }

  interface HTMLElementTagNameMap {
    install: HTMLInstallElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /**
       * Attributes are lowercase and unhyphenated because they're plain HTML
       * content attributes, not React props — React forwards them verbatim.
       */
      install: DetailedHTMLProps<HTMLAttributes<HTMLInstallElement>, HTMLInstallElement> & {
        installurl?: string
        manifestid?: string
      }
    }
  }
}
