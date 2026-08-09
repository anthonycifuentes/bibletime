import { useEffect } from "react"
import { create } from "zustand"

import type {
  UpdateCheckResult,
  UpdateInitialState,
} from "@/modules/updates/interfaces"
import { getUpdates } from "@/modules/updates/services"

// A stable singleton per platform (see `getUpdates`), same as the Bible
// download driver — safe to resolve once at module scope.
const updates = getUpdates()

interface UpdateCheckStore {
  /** Persisted state plus the running version, available before any check settles. */
  initial: UpdateInitialState | null
  result: UpdateCheckResult | null
  isChecking: boolean
  /** Held separately from `initial` so a dismissal takes effect without a re-read. */
  dismissedVersion: string | null
  loadInitialState: () => Promise<void>
  check: () => Promise<void>
  dismiss: (version: string) => Promise<void>
}

/**
 * Module-level rather than per-component: the launch banner and the Settings
 * panel both read this, and they must agree on one result, one in-flight
 * flag, and one dismissal — not run their own checks.
 */
const useUpdateCheckStore = create<UpdateCheckStore>((set, get) => ({
  initial: null,
  result: null,
  isChecking: false,
  dismissedVersion: null,

  loadInitialState: async () => {
    const initial = await updates.getState()
    set({ initial, dismissedVersion: initial.dismissedVersion })
  },

  check: async () => {
    if (get().isChecking) return
    set({ isChecking: true })
    try {
      set({ result: await updates.check() })
    } finally {
      set({ isChecking: false })
    }
  },

  dismiss: async (version: string) => {
    set({ dismissedVersion: version })
    await updates.dismiss(version)
  },
}))

/** Guards "one automatic check per launch" across every component that mounts the hook. */
let launchSequenceStarted = false

async function runLaunchSequence() {
  if (launchSequenceStarted) return
  launchSequenceStarted = true

  const store = useUpdateCheckStore.getState()
  await store.loadInitialState()
  // The web build has nothing to check for — the browser always has the
  // latest deploy — so it stops at the version it loaded above.
  if (!updates.canCheck) return
  await store.check()
}

/**
 * The current update situation: what's running, whether something newer
 * exists, and whether the user has already waved this version away.
 *
 * The launch check starts on first mount and never blocks anything — a
 * failure leaves `result.status === "failed"` for the panel to report and
 * is invisible everywhere else.
 */
export const useUpdateCheck = () => {
  const initial = useUpdateCheckStore((state) => state.initial)
  const result = useUpdateCheckStore((state) => state.result)
  const isChecking = useUpdateCheckStore((state) => state.isChecking)
  const dismissedVersion = useUpdateCheckStore(
    (state) => state.dismissedVersion
  )
  const check = useUpdateCheckStore((state) => state.check)
  const dismissVersion = useUpdateCheckStore((state) => state.dismiss)

  useEffect(() => {
    void runLaunchSequence()
  }, [])

  const availableUpdate = result?.status === "available" ? result : null

  return {
    canCheck: updates.canCheck,
    /** Falls back to the persisted read so the panel never renders an empty version. */
    currentVersion: result?.currentVersion ?? initial?.currentVersion ?? "—",
    /** This session's check if one has landed, else the last one persisted from a previous launch. */
    lastCheckedAt:
      result && result.status !== "failed"
        ? result.checkedAt
        : (initial?.lastCheckedAt ?? null),
    result,
    isChecking,
    availableUpdate,
    /** What the banner keys off: an update exists and the user hasn't dismissed *this* version. */
    shouldShowBanner:
      availableUpdate !== null &&
      dismissedVersion !== availableUpdate.availableVersion,
    checkNow: check,
    dismiss: () =>
      availableUpdate
        ? dismissVersion(availableUpdate.availableVersion)
        : Promise.resolve(),
  }
}
