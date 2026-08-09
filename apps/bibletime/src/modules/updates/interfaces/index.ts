/** A release asset that matches the running platform and architecture. */
export interface UpdateAsset {
  /** File name as published, e.g. `BibleTime-0.2.0-arm64.dmg`. */
  name: string
  /** HTTPS download URL, always on a GitHub-owned host. */
  url: string
  /** Size in bytes as reported by the releases API, or `null` when absent. */
  bytes: number | null
}

/** Why a check couldn't complete. Never surfaced as an exception — see `UpdateCheckResult`. */
export type UpdateCheckFailureReason = "offline" | "rate-limited" | "unexpected"

/**
 * The outcome of an update check.
 *
 * A discriminated union rather than a throwing call: a check runs on launch
 * without the user asking for it, so a failure is a state the UI renders,
 * not an exception a caller might forget to catch.
 */
export type UpdateCheckResult =
  | {
      status: "up-to-date"
      currentVersion: string
      checkedAt: number
    }
  | {
      status: "available"
      currentVersion: string
      availableVersion: string
      releaseUrl: string
      releaseNotes: string
      /** `null` when the release publishes nothing runnable on this platform. */
      asset: UpdateAsset | null
      checkedAt: number
    }
  | {
      status: "failed"
      currentVersion: string
      reason: UpdateCheckFailureReason
    }

/** Progress tick pushed from the main process while an installer downloads. */
export interface UpdateDownloadProgress {
  receivedBytes: number
  /** `null` when the response carried no content length — the UI shows an indeterminate state. */
  totalBytes: number | null
}

/** How a finished download settled. */
export type UpdateDownloadOutcome =
  | { status: "completed"; fileName: string; filePath: string }
  | { status: "cancelled" }
  | { status: "failed"; detail: string }

/** The renderer-side view of the download lifecycle. */
export type UpdateDownloadState =
  | { status: "idle" }
  | { status: "downloading"; receivedBytes: number; totalBytes: number | null }
  | { status: "completed"; fileName: string }
  | { status: "cancelled" }
  | { status: "failed" }

/** What the main process persists between launches, in `updates.json`. */
export interface UpdatePersistedState {
  /** Epoch ms of the last check that completed successfully, or `null` if none ever has. */
  lastCheckedAt: number | null
  /** Newest version the last successful check discovered. */
  lastSeenVersion: string | null
  /** Version whose banner the user dismissed; the banner returns when a higher version appears. */
  dismissedVersion: string | null
}

/** `UpdatePersistedState` plus the running version, for first paint before any check settles. */
export interface UpdateInitialState extends UpdatePersistedState {
  currentVersion: string
}

/**
 * The seam between the update UI and how updates actually arrive.
 *
 * Today the desktop driver downloads an installer the user runs themselves,
 * because BibleTime ships unsigned and Squirrel.Mac refuses ad-hoc-signed
 * bundles. A future signed build can implement this same interface with a
 * real install-on-quit, and no component above changes.
 */
export interface UpdateDriver {
  /** False in the web build — the browser always serves the latest deploy. */
  canCheck: boolean
  getState: () => Promise<UpdateInitialState>
  check: () => Promise<UpdateCheckResult>
  download: (asset: UpdateAsset) => Promise<UpdateDownloadOutcome>
  cancelDownload: () => Promise<void>
  revealDownload: () => Promise<void>
  dismiss: (version: string) => Promise<void>
  /** Subscribes to progress ticks; returns the unsubscribe. */
  onDownloadProgress: (
    callback: (progress: UpdateDownloadProgress) => void
  ) => () => void
}
