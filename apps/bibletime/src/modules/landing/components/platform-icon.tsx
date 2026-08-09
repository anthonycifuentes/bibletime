import { HugeiconsIcon } from "@hugeicons/react"
import { AppleIcon, WindowsNewIcon } from "@hugeicons/core-free-icons"

import type { PlatformFamily } from "@/modules/landing/interfaces"

/**
 * Tux, hand-rolled: the icon set ships Apple and Windows marks but nothing
 * for Linux, and a generic monitor glyph next to two real logos reads as a
 * mistake. Drawn on the same 24-unit grid as the Hugeicons so the three sit
 * at one optical weight in a row.
 */
function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12 2c-2.2 0-3.6 1.7-3.6 4.1 0 1 .1 1.9.1 2.6 0 .8-.5 1.5-1.1 2.5-.8 1.2-1.7 2.6-2.2 4.2-.3.9-.4 1.7-.1 2.3.2.4.5.7.9.9-.1.4 0 .8.2 1.1.4.6 1.2.9 2.2.9.6 0 1.2-.1 1.7-.3.5-.2.9-.4 1.3-.4h1.2c.4 0 .8.2 1.3.4.5.2 1.1.3 1.7.3 1 0 1.8-.3 2.2-.9.2-.3.3-.7.2-1.1.4-.2.7-.5.9-.9.3-.6.2-1.4-.1-2.3-.5-1.6-1.4-3-2.2-4.2-.6-1-1.1-1.7-1.1-2.5 0-.7.1-1.6.1-2.6C15.6 3.7 14.2 2 12 2Zm-1.4 3.1c.4 0 .8.5.8 1.1s-.4 1.1-.8 1.1-.8-.5-.8-1.1.4-1.1.8-1.1Zm2.8 0c.4 0 .8.5.8 1.1s-.4 1.1-.8 1.1-.8-.5-.8-1.1.4-1.1.8-1.1ZM12 8.2c.9 0 1.8.4 2.4.9.2.2.2.4-.1.6l-1.9 1.1c-.3.2-.5.2-.8 0L9.7 9.7c-.3-.2-.3-.4-.1-.6.6-.5 1.5-.9 2.4-.9Z" />
    </svg>
  )
}

const ICON_CLASS = "size-5"

export function PlatformIcon({ family }: { family: PlatformFamily }) {
  if (family === "linux") return <LinuxIcon className={ICON_CLASS} />

  return (
    <HugeiconsIcon
      icon={family === "macos" ? AppleIcon : WindowsNewIcon}
      strokeWidth={2}
      className={ICON_CLASS}
    />
  )
}
