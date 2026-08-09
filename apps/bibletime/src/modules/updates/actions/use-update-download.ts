import { useEffect } from "react"
import { create } from "zustand"

import type {
  UpdateAsset,
  UpdateDownloadState,
} from "@/modules/updates/interfaces"
import { getUpdates } from "@/modules/updates/services"

const updates = getUpdates()

interface UpdateDownloadStore {
  state: UpdateDownloadState
  setProgress: (receivedBytes: number, totalBytes: number | null) => void
  start: (asset: UpdateAsset) => Promise<void>
  cancel: () => Promise<void>
  reveal: () => Promise<void>
}

const useUpdateDownloadStore = create<UpdateDownloadStore>((set, get) => ({
  state: { status: "idle" },

  setProgress: (receivedBytes, totalBytes) => {
    // Late ticks can arrive after the outcome resolves; they must not drag
    // a finished download back into a progress bar.
    if (get().state.status !== "downloading") return
    set({ state: { status: "downloading", receivedBytes, totalBytes } })
  },

  start: async (asset: UpdateAsset) => {
    if (get().state.status === "downloading") return
    set({
      state: {
        status: "downloading",
        receivedBytes: 0,
        totalBytes: asset.bytes,
      },
    })

    const outcome = await updates.download(asset)
    if (outcome.status === "completed") {
      set({ state: { status: "completed", fileName: outcome.fileName } })
    } else if (outcome.status === "cancelled") {
      set({ state: { status: "cancelled" } })
    } else {
      set({ state: { status: "failed" } })
    }
  },

  cancel: async () => {
    await updates.cancelDownload()
  },

  reveal: async () => {
    await updates.revealDownload()
  },
}))

/**
 * The installer download: start it, watch it, cancel it, and find the file
 * afterwards.
 *
 * Progress arrives as a push from the main process — the only one in the
 * app — so the subscription is set up on mount and torn down on unmount.
 */
export const useUpdateDownload = () => {
  const state = useUpdateDownloadStore((store) => store.state)
  const setProgress = useUpdateDownloadStore((store) => store.setProgress)
  const start = useUpdateDownloadStore((store) => store.start)
  const cancel = useUpdateDownloadStore((store) => store.cancel)
  const reveal = useUpdateDownloadStore((store) => store.reveal)

  useEffect(() => {
    return updates.onDownloadProgress(({ receivedBytes, totalBytes }) => {
      setProgress(receivedBytes, totalBytes)
    })
  }, [setProgress])

  return { state, start, cancel, reveal }
}
