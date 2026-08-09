/**
 * Ad-hoc signs the packaged macOS app.
 *
 * Without this the app is not merely unsigned — it is *broken*. electron-builder
 * with `identity: null` skips signing altogether, which leaves the Electron
 * binary carrying the ad-hoc signature its linker applied (`Identifier=Electron`,
 * `flags=adhoc,linker-signed`) while `Contents/_CodeSignature/CodeResources`
 * is never written. The signature therefore promises sealed resources that the
 * bundle does not have, and `codesign --verify` says:
 *
 *     code has no resources but signature indicates they must be present
 *
 * macOS reports that as **"BibleTime is damaged and can't be opened"** — a dead
 * end with no "Open Anyway", which reads to a user as a corrupt download rather
 * than an unsigned one. It is not a warning they can click through.
 *
 * Re-signing ad-hoc seals the bundle properly. The app is still unsigned in the
 * sense that matters commercially — no Developer ID, not notarized, so Gatekeeper
 * still refuses it on first launch — but it now fails the *ordinary* way, with
 * "unidentified developer" and a working Open Anyway path.
 *
 * Delete this hook the moment real signing is configured; a Developer ID run
 * seals the bundle itself. See docs/release.md.
 */
const { execFileSync } = require("node:child_process")
const path = require("node:path")

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== "darwin") return

  // Signing with a real identity already seals the bundle — don't undo it.
  if (process.env.CSC_LINK || process.env.CSC_NAME) {
    console.log("  • adhoc-sign  skipped=real signing identity present")
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)

  console.log(`  • adhoc-sign  app=${appPath}`)
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], {
    stdio: "inherit",
  })

  // Fail the build rather than ship another "damaged" bundle.
  execFileSync("codesign", ["--verify", "--deep", "--strict", appPath], {
    stdio: "inherit",
  })
}
