import { useCallback, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"

import { useConsoleStore } from "@/modules/library/actions/use-console-store"
import { useLibrary } from "@/modules/library/actions/use-library"
import { useProjects } from "@/modules/library/actions/use-projects"
import { useSlideshow } from "@/modules/library/actions/use-slideshow"
import { ControlBar } from "@/modules/library/components/slideshow/control-bar"
import { CurrentSlidePane } from "@/modules/library/components/slideshow/current-slide-pane"
import { Filmstrip } from "@/modules/library/components/slideshow/filmstrip"
import { NextSlidePane } from "@/modules/library/components/slideshow/next-slide-pane"
import { NotesPane } from "@/modules/library/components/slideshow/notes-pane"
import { useTemplates } from "@/modules/templates"
import { useTranslation } from "@/modules/core/i18n"
import { Button } from "@workspace/ui/components/button"

/**
 * Toggles the slideshow's own fullscreen.
 *
 * Deliberately fullscreens *this* window, not the output: there is no way
 * for one window to fullscreen another, and the output window has its own
 * `F`/double-click binding for that. Guarded and catch-on-reject exactly as
 * `/present` does — a presentation must not fall over an unhandled rejection
 * from a keystroke.
 */
const toggleFullscreen = () => {
  if (typeof document === "undefined") return

  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined)
    return
  }
  void document.documentElement.requestFullscreen().catch(() => undefined)
}

/** Keystrokes typed into a field belong to that field, never to the deck. */
const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}

/**
 * The presenter view: what the room sees now, what it sees next, the notes
 * for this moment, and a single key that moves the service forward.
 *
 * A *controller*, not a second output — it drives the `/present` window
 * through the same live-slide channel "Send to output" uses, so that route
 * needs no knowledge that a slideshow exists.
 *
 * Lives in `library` alongside `console-view` because it is a second view
 * over the same folders and items: the deck is the open folder's `items`,
 * every slide resolves through `resolveFolderItemContent`, and entering and
 * leaving read and write the console store.
 */
export function SlideshowView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const projects = useProjects()
  const library = useLibrary(projects.activeId ?? null)
  const templatesState = useTemplates()

  const openFolderId = useConsoleStore((state) => state.openFolderId)
  const lastSelectedItemId = useConsoleStore((state) => state.lastSelectedItemId)
  const selectItem = useConsoleStore((state) => state.selectItem)

  const folder = library.folders.find((candidate) => candidate.id === openFolderId)
  const items = folder?.items ?? []

  const slideshow = useSlideshow({
    items,
    templates: templatesState.templates,
    seedItemId: lastSelectedItemId,
  })

  const { currentItem, move, commitJump, appendJumpDigit, toggleBlank } = slideshow

  /**
   * Leaves the slideshow, writing the slide it ended on back to the console
   * so the two views agree — and so starting another slideshow resumes here.
   * The output window and any blank it is holding are deliberately left
   * alone: exiting the controller is not a reason to change the projector.
   */
  const exit = useCallback(() => {
    if (currentItem) selectItem(currentItem.id, { additive: false })
    void navigate({ to: "/library" })
  }, [currentItem, selectItem, navigate])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      // A modified keystroke belongs to the browser (⌘R, ⌘W, ⌥→).
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault()
        appendJumpDigit(event.key)
        return
      }

      switch (event.key) {
        case "Enter":
          event.preventDefault()
          // Unambiguous despite the double duty: with a pending number
          // Enter commits it, and only otherwise does it advance.
          if (!commitJump()) move("next")
          return
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "PageDown":
          event.preventDefault()
          move("next")
          return
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
        case "Backspace":
          event.preventDefault()
          move("previous")
          return
        case "Home":
          event.preventDefault()
          move("first")
          return
        case "End":
          event.preventDefault()
          move("last")
          return
        case "b":
        case "B":
        case ".":
          event.preventDefault()
          toggleBlank("black")
          return
        case "w":
        case "W":
        case ",":
          event.preventDefault()
          toggleBlank("white")
          return
        case "f":
        case "F":
          event.preventDefault()
          toggleFullscreen()
          return
        case "Escape":
          // In fullscreen the browser consumes the first Esc to exit it and
          // this never runs, so a fullscreen operator presses Esc twice.
          // Standard browser behavior, and why Exit is always on screen.
          event.preventDefault()
          exit()
          return
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [appendJumpDigit, commitJump, move, toggleBlank, exit])

  // Nothing to present — deep-linked, or the deck emptied mid-run. The route
  // redirects the first case; this covers the second, where the output keeps
  // showing the last slide sent and the operator needs a way out.
  if (items.length === 0) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-4 bg-neutral-950 p-6 text-center">
        <p className="text-sm text-white/60">
          {library.isLoading ? t("slideshow.loading") : t("slideshow.deckEmpty")}
        </p>
        {!library.isLoading ? (
          <Button type="button" variant="outline" onClick={exit}>
            {t("slideshow.exit")}
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex h-svh flex-col gap-4 bg-neutral-950 p-4 text-white">
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <CurrentSlidePane
            item={currentItem}
            templates={templatesState.templates}
            blank={slideshow.blank}
            onAdvance={() => move("next")}
          />

          <ControlBar
            currentPosition={slideshow.currentIndex + 1}
            total={slideshow.total}
            isFirst={slideshow.isFirst}
            isLast={slideshow.isLast}
            jumpBuffer={slideshow.jumpBuffer}
            elapsed={slideshow.elapsed}
            isTimerRunning={slideshow.isTimerRunning}
            now={slideshow.now}
            blank={slideshow.blank}
            onPrevious={() => move("previous")}
            onNext={() => move("next")}
            onToggleTimer={slideshow.toggleTimer}
            onResetTimer={slideshow.restartTimer}
            onToggleBlank={toggleBlank}
            onReopenOutput={slideshow.reopenOutput}
            onToggleFullscreen={toggleFullscreen}
            onExit={exit}
          />
        </div>

        <aside className="flex w-80 shrink-0 flex-col gap-4 xl:w-96">
          <NextSlidePane item={slideshow.nextItem} templates={templatesState.templates} />
          <NotesPane notes={currentItem?.speakerNotes} />
        </aside>
      </div>

      {/* Says the running order moved under the operator — shown only when
          the slide they were on actually went away, and cleared by their
          next move. The output is untouched until then. */}
      {slideshow.deckChanged ? (
        <p className="shrink-0 text-xs text-amber-300/80">{t("slideshow.deckChanged")}</p>
      ) : null}

      <Filmstrip
        items={items}
        currentItemId={currentItem?.id}
        templates={templatesState.templates}
        onSelect={slideshow.goToItem}
      />
    </div>
  )
}
