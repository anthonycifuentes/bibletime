import { useEffect, useState } from "react"

import type { DownloadTargetId, PlatformFamily } from "@/modules/landing/interfaces"

interface UserAgentDataLike {
  platform?: string
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }>
}

/**
 * Reads the platform family from whatever the browser will tell us.
 *
 * Exported so it can be exercised against real user-agent strings without a
 * browser — the branches here are all about devices this machine isn't.
 */
export const detectFamily = (): PlatformFamily | null => {
  const uaData = (navigator as Navigator & { userAgentData?: UserAgentDataLike }).userAgentData
  const platform = uaData?.platform ?? navigator.platform
  const ua = navigator.userAgent

  // iPadOS reports a Macintosh user agent, so touch points are what separate
  // a real Mac from a tablet. A tablet gets no primary download.
  if (/Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(ua)) {
    return navigator.maxTouchPoints > 1 ? null : "macos"
  }
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return "windows"
  // Android is Linux-flavoured but cannot run an AppImage.
  if (/Android/i.test(ua)) return null
  if (/Linux|X11|CrOS/i.test(platform) || /Linux|X11/i.test(ua)) return "linux"
  return null
}

/**
 * Apple Silicon or Intel. The user agent never says, so:
 *
 * 1. Chromium exposes it through `getHighEntropyValues` — authoritative.
 * 2. Otherwise the WebGL renderer string reports "Apple GPU" on Apple
 *    Silicon and an Intel/AMD/Radeon part on the Intel Macs.
 * 3. Failing both, assume Apple Silicon — every Mac sold since 2020.
 *
 * Guessing wrong is not cosmetic: an Intel Mac handed the arm64 DMG gets an
 * app that refuses to open, which reads as a broken download. Hence the
 * effort, and hence the Intel build staying one click away regardless.
 */
const detectMacArch = async (): Promise<DownloadTargetId> => {
  const uaData = (navigator as Navigator & { userAgentData?: UserAgentDataLike }).userAgentData
  try {
    const values = await uaData?.getHighEntropyValues?.(["architecture"])
    if (values?.architecture) {
      return values.architecture === "arm" ? "macos-arm64" : "macos-x64"
    }
  } catch {
    // Permission or unsupported — fall through to the WebGL probe.
  }

  try {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl")
    if (gl && "getExtension" in gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info")
      const renderer = debugInfo
        ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
        : ""
      if (/Intel|AMD|Radeon|NVIDIA|GeForce/i.test(renderer)) return "macos-x64"
    }
  } catch {
    // Blocked WebGL, privacy extension, headless — assume the common case.
  }

  return "macos-arm64"
}

const FAMILY_DEFAULT: Record<PlatformFamily, DownloadTargetId> = {
  windows: "windows",
  macos: "macos-arm64",
  linux: "linux",
}

export interface DetectedDownload {
  /** `null` until detection has run, and on unrecognised platforms. */
  family: PlatformFamily | null
  /** The asset the primary button should hand over. */
  targetId: DownloadTargetId | null
}

/**
 * What to offer this visitor first.
 *
 * Runs in an effect rather than during render because the server has no
 * `navigator`: the markup that hydrates is the neutral "no platform yet"
 * state, identical on both sides, and the specific button appears on the
 * first client pass. Anyone without JavaScript keeps the Releases link,
 * which is why that stays in the markup instead of being swapped out.
 */
export function useDetectedDownload(): DetectedDownload {
  const [detected, setDetected] = useState<DetectedDownload>({ family: null, targetId: null })

  useEffect(() => {
    const family = detectFamily()
    if (!family) return

    setDetected({ family, targetId: FAMILY_DEFAULT[family] })
    if (family !== "macos") return

    let cancelled = false
    void detectMacArch().then((targetId) => {
      if (!cancelled) setDetected({ family, targetId })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return detected
}
