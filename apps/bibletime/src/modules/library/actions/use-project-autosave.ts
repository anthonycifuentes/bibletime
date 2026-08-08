import { useCallback, useEffect, useRef, useState } from "react"

import type { Folder, Project, ProjectSaveResult, ProjectSaveState } from "@/modules/library/interfaces"
import { projectContentSignature } from "@/modules/library/lib/project-signature"

/** How long editing has to stop before the bound file is rewritten. */
const AUTOSAVE_DEBOUNCE_MS = 2000

interface UseProjectAutosaveOptions {
  /** The project being watched, or `undefined` while none is active. */
  project: Project | undefined
  /** That project's folders — the rest of what gets written. */
  folders: Folder[]
  /** Writes the project to its bound file. `useProjects`' `saveProject`. */
  saveProject: (id: string) => Promise<ProjectSaveResult>
}

/**
 * Keeps a file-bound project's file current without the user saving.
 *
 * Managed storage is already written on every mutation; this only mirrors
 * that onto the bound file. It never reads the file back and never reconciles
 * it — see the change's `design.md`, Decision 1.
 *
 * Lives outside `useProjects` because it has to *watch* folders continuously,
 * and `useProjects` deliberately doesn't depend on folder data (it reads
 * folders once, at save time).
 */
export const useProjectAutosave = ({ project, folders, saveProject }: UseProjectAutosaveOptions) => {
  const [state, setState] = useState<ProjectSaveState>({ status: "unbound" })

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  /** Signature last written (or accepted as the baseline) per project id. */
  const savedSignatureRef = useRef(new Map<string, string>())
  /** Guards against a second concurrent write to the same file. */
  const inFlightRef = useRef(false)
  /** Set when a change lands mid-write, so the write that's finishing is followed by one that includes it. */
  const rerunRef = useRef(false)
  /** Latest values, so the debounce callback and the unload handler never fire against a stale closure. */
  const latestRef = useRef({ project, folders, saveProject })
  latestRef.current = { project, folders, saveProject }

  const runSave = useCallback(async () => {
    const { project: current, saveProject: save } = latestRef.current
    if (!current?.filePath) return

    // A write is already going. Don't start a second one — record that
    // another is owed and let the in-flight write's `finally` run it, so a
    // write slower than the debounce can't strand the newest change.
    if (inFlightRef.current) {
      rerunRef.current = true
      return
    }
    inFlightRef.current = true

    const signature = projectContentSignature(current, latestRef.current.folders)
    setState({ status: "saving", path: current.filePath })

    try {
      const result = await save(current.id)
      if (result.status === "saved") {
        savedSignatureRef.current.set(current.id, signature)
        setState({ status: "saved", path: result.path ?? current.filePath })
      } else if (result.status === "failed") {
        // Surfaced and left alone — no timed retry. The next content change
        // or an explicit save is what tries again.
        setState({ status: "failed", path: current.filePath, error: result.error })
      } else {
        // `canceled` can't normally reach here (autosave only runs on a bound
        // project, which never opens a dialog), but leaving the state on
        // "saving" forever would be a lie if it ever did.
        setState({ status: "unsaved", path: current.filePath })
      }
    } catch (error) {
      setState({ status: "failed", path: current.filePath, error: String(error) })
    } finally {
      inFlightRef.current = false
      if (rerunRef.current) {
        rerunRef.current = false
        void runSaveRef.current()
      }
    }
  }, [])

  /** Lets `runSave`'s `finally` re-enter itself without making it its own dependency. */
  const runSaveRef = useRef(runSave)
  runSaveRef.current = runSave

  /** Writes any pending change now instead of waiting out the debounce — used by an explicit Save so the two never race. */
  const flush = useCallback(async () => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
    await runSave()
  }, [runSave])

  useEffect(() => {
    if (!project) {
      setState({ status: "unbound" })
      return
    }

    // No binding, or no way to write one (the web build): nothing to mirror.
    if (!project.filePath || !window.bibletime?.project.saveToPath) {
      setState({ status: "unbound" })
      return
    }

    const signature = projectContentSignature(project, folders)
    const lastSaved = savedSignatureRef.current.get(project.id)

    // First sighting of this project is the baseline, not a change — without
    // this, opening the app or switching projects would rewrite every file.
    if (lastSaved === undefined) {
      savedSignatureRef.current.set(project.id, signature)
      setState({ status: "saved", path: project.filePath })
      return
    }

    if (signature === lastSaved) return

    setState({ status: "unsaved", path: project.filePath })
    if (timerRef.current !== undefined) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined
      void runSave()
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current)
    }
  }, [folders, project, runSave])

  // Best-effort final write on the way out. `pagehide` can't await an async
  // IPC round-trip, so this narrows the last gap rather than closing it —
  // the debounce is what actually keeps the file current.
  useEffect(() => {
    const onPageHide = () => {
      const { project: current } = latestRef.current
      if (!current?.filePath) return
      if (savedSignatureRef.current.get(current.id) === projectContentSignature(current, latestRef.current.folders)) return
      void runSave()
    }

    window.addEventListener("pagehide", onPageHide)
    window.addEventListener("beforeunload", onPageHide)
    return () => {
      window.removeEventListener("pagehide", onPageHide)
      window.removeEventListener("beforeunload", onPageHide)
    }
  }, [runSave])

  return { saveState: state, flushPendingSave: flush }
}
