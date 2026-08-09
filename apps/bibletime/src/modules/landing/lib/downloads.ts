import type { DownloadTarget, DownloadTargetId } from "@/modules/landing/interfaces"
import { RELEASES_URL, REPOSITORY_URL } from "@/modules/landing/lib/landing-content"

/**
 * The release the direct download buttons point at.
 *
 * Asset filenames carry the version (`BibleTime-0.1.0-arm64.dmg`), so a
 * direct link cannot be version-agnostic — this constant is the one place
 * that has to move on a release, and `docs/release.md` lists it in the
 * bump checklist beside the three `package.json` files.
 *
 * If it ever goes stale the links 404 rather than silently serving an old
 * build, and every surface here also offers the always-current Releases
 * index as a way out.
 */
export const LATEST_VERSION = "0.1.1"

/** `/releases/download/<tag>/<asset>` — the stable public URL for one asset. */
const assetUrl = (asset: string): string =>
  `${REPOSITORY_URL}/releases/download/v${LATEST_VERSION}/${asset}`

/**
 * Every installer a visitor can pick, in the order the secondary row shows
 * them. `arch` is only set where one platform ships more than one build and
 * the distinction is the user's to make.
 */
export const DOWNLOAD_TARGETS: DownloadTarget[] = [
  {
    id: "windows",
    labelKey: "landing.platform.windows",
    hintKey: "landing.platform.windows.hint",
    url: assetUrl(`BibleTime-${LATEST_VERSION}-x64.exe`),
  },
  {
    id: "macos-arm64",
    labelKey: "landing.platform.macos",
    hintKey: "landing.platform.macosArm.hint",
    url: assetUrl(`BibleTime-${LATEST_VERSION}-arm64.dmg`),
  },
  {
    id: "macos-x64",
    labelKey: "landing.platform.macos",
    hintKey: "landing.platform.macosIntel.hint",
    url: assetUrl(`BibleTime-${LATEST_VERSION}-x64.dmg`),
  },
  {
    id: "linux",
    labelKey: "landing.platform.linux",
    hintKey: "landing.platform.linux.hint",
    url: assetUrl(`BibleTime-${LATEST_VERSION}-x86_64.AppImage`),
  },
]

export const getDownloadTarget = (id: DownloadTargetId): DownloadTarget => {
  const target = DOWNLOAD_TARGETS.find((candidate) => candidate.id === id)
  // Unreachable while `DownloadTargetId` and this array agree; the throw is
  // what makes that a compile-time-ish guarantee rather than an undefined.
  if (!target) throw new Error(`Unknown download target: ${id}`)
  return target
}

/**
 * The icon row deliberately shows one button per *platform*, not one per
 * asset — a visitor picks "Mac", not "Mac arm64". The Mac entry resolves to
 * whichever architecture detection settled on.
 */
export const SECONDARY_TARGET_IDS = ["windows", "macos-arm64", "linux"] as const

export { RELEASES_URL }
