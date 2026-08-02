import { app, BrowserWindow, dialog, ipcMain, net, protocol } from "electron"
import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webUrl = process.env.BIBLETIME_WEB_URL ?? "http://localhost:3000"

const TEMPLATE_MEDIA_SCHEME = "bibletime-media"

// Must run before `app.whenReady()` — Electron requires privileged custom
// schemes to be registered at module load time.
protocol.registerSchemesAsPrivileged([
  { scheme: TEMPLATE_MEDIA_SCHEME, privileges: { standard: true, stream: true, supportFetchAPI: true } },
])

const templatesDir = path.join(app.getPath("userData"), "templates")

async function ensureTemplatesDir() {
  await fs.mkdir(templatesDir, { recursive: true })
}

// Template files are named by id so save/remove are simple, idempotent
// single-file operations — no index file to keep in sync.
function templatePath(id: string) {
  return path.join(templatesDir, `${id}.json`)
}

interface DownloadedBibleVersionMeta {
  version_id: number
  local_abbreviation: string
  local_title: string
  json_url: string
  downloaded_at: number
  bytes: number
}

interface BibleVersionCatalogEntry {
  version_id: number
  local_abbreviation: string
  local_title: string
  json_url: string
  lang_name: string
  lang_key: string
}

interface BibleVersionsManifest {
  manifestVersion: 1
  downloads: DownloadedBibleVersionMeta[]
}

const bibleVersionsDir = path.join(app.getPath("userData"), "bible-versions")
const manifestPath = path.join(bibleVersionsDir, "manifest.json")

async function ensureBibleVersionsDir() {
  await fs.mkdir(bibleVersionsDir, { recursive: true })
}

function versionFilePath(versionId: number) {
  return path.join(bibleVersionsDir, `${versionId}.json`)
}

async function readBibleVersionsManifest(): Promise<BibleVersionsManifest> {
  try {
    const raw = await fs.readFile(manifestPath, "utf8")
    const parsed = JSON.parse(raw) as BibleVersionsManifest
    return { manifestVersion: 1, downloads: parsed.downloads ?? [] }
  } catch {
    return { manifestVersion: 1, downloads: [] }
  }
}

async function writeBibleVersionsManifest(manifest: BibleVersionsManifest) {
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8")
}

function registerBibleVersionDownloadHandlers() {
  ipcMain.handle("bible-version-downloads:list", async () => {
    await ensureBibleVersionsDir()
    const manifest = await readBibleVersionsManifest()
    return manifest.downloads
  })

  ipcMain.handle(
    "bible-version-downloads:download",
    async (_event, entry: BibleVersionCatalogEntry): Promise<DownloadedBibleVersionMeta> => {
      await ensureBibleVersionsDir()

      const response = await fetch(entry.json_url)
      if (!response.ok) {
        throw new Error(
          `Failed to download Bible version ${entry.version_id}: ${response.status} ${response.statusText}`
        )
      }
      const text = await response.text()

      // Write to a temp file and rename into place so a killed/failed
      // download never leaves a partial file at the real path.
      const finalPath = versionFilePath(entry.version_id)
      const tempPath = `${finalPath}.tmp`
      await fs.writeFile(tempPath, text, "utf8")
      await fs.rename(tempPath, finalPath)

      const meta: DownloadedBibleVersionMeta = {
        version_id: entry.version_id,
        local_abbreviation: entry.local_abbreviation,
        local_title: entry.local_title,
        json_url: entry.json_url,
        downloaded_at: Date.now(),
        bytes: Buffer.byteLength(text, "utf8"),
      }

      // The manifest entry is only added after the rename above succeeds,
      // so a failed download never gets reported as downloaded.
      const manifest = await readBibleVersionsManifest()
      manifest.downloads = [
        ...manifest.downloads.filter((download) => download.version_id !== entry.version_id),
        meta,
      ]
      await writeBibleVersionsManifest(manifest)

      return meta
    }
  )

  ipcMain.handle("bible-version-downloads:read", async (_event, versionId: number) => {
    const manifest = await readBibleVersionsManifest()
    const meta = manifest.downloads.find((download) => download.version_id === versionId)
    if (!meta) {
      throw new Error(`Bible version ${versionId} is not downloaded`)
    }

    const raw = await fs.readFile(versionFilePath(versionId), "utf8")
    return JSON.parse(raw)
  })

  ipcMain.handle("bible-version-downloads:remove", async (_event, versionId: number) => {
    await fs.rm(versionFilePath(versionId), { force: true })

    const manifest = await readBibleVersionsManifest()
    manifest.downloads = manifest.downloads.filter((download) => download.version_id !== versionId)
    await writeBibleVersionsManifest(manifest)
  })
}

function registerTemplateHandlers() {
  ipcMain.handle("templates:list", async () => {
    await ensureTemplatesDir()
    const entries = await fs.readdir(templatesDir)

    const templates = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
          try {
            const raw = await fs.readFile(path.join(templatesDir, entry), "utf8")
            return JSON.parse(raw)
          } catch {
            // Skip files that aren't valid template JSON rather than failing the whole list.
            return null
          }
        })
    )

    return templates.filter(Boolean)
  })

  ipcMain.handle("templates:save", async (_event, template: { id: string }) => {
    await ensureTemplatesDir()
    await fs.writeFile(templatePath(template.id), JSON.stringify(template, null, 2), "utf8")
  })

  ipcMain.handle("templates:remove", async (_event, id: string) => {
    // Best-effort: clean up the template's video media (if any) before
    // removing the template record itself. A missing/unreadable/malformed
    // template file just means there's nothing to clean up.
    try {
      const raw = await fs.readFile(templatePath(id), "utf8")
      const saved = JSON.parse(raw) as { template?: { background?: { type: string; value: string } } }
      if (saved.template?.background?.type === "video") {
        await fs.rm(templateMediaPath(saved.template.background.value), { force: true })
      }
    } catch {
      // Nothing to clean up.
    }

    await fs.rm(templatePath(id), { force: true })
  })
}

const templateMediaDir = path.join(app.getPath("userData"), "template-media")

async function ensureTemplateMediaDir() {
  await fs.mkdir(templateMediaDir, { recursive: true })
}

const templateMediaReference = (fileName: string): string => `${TEMPLATE_MEDIA_SCHEME}:///${fileName}`

/** Resolves a `bibletime-media:///<file>` reference to a path guaranteed to sit inside `templateMediaDir`. */
function templateMediaPath(reference: string): string {
  const fileName = decodeURIComponent(new URL(reference).pathname.replace(/^\/+/, ""))
  const resolved = path.resolve(templateMediaDir, fileName)
  if (path.dirname(resolved) !== templateMediaDir) {
    throw new Error("Invalid template media reference")
  }
  return resolved
}

function registerTemplateMediaHandlers() {
  ipcMain.handle("template-media:save", async (_event, buffer: ArrayBuffer, extension: string) => {
    await ensureTemplateMediaDir()
    const safeExtension = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "mp4"
    const fileName = `${crypto.randomUUID()}.${safeExtension}`
    await fs.writeFile(path.join(templateMediaDir, fileName), Buffer.from(buffer))
    return templateMediaReference(fileName)
  })

  ipcMain.handle("template-media:remove", async (_event, reference: string) => {
    await fs.rm(templateMediaPath(reference), { force: true })
  })

  protocol.handle(TEMPLATE_MEDIA_SCHEME, async (request) => {
    try {
      return await net.fetch(`file://${templateMediaPath(request.url)}`)
    } catch {
      return new Response(null, { status: 404 })
    }
  })
}

interface FolderItem {
  id: string
  type: "bible-passage" | "song" | "media"
  templateId?: string
  data: unknown
}

interface Folder {
  id: string
  name: string
  items: FolderItem[]
  createdAt: number
  updatedAt: number
}

/**
 * Where project metadata and their folders/slides live — defaults to inside
 * `userData`, but can be relocated by the user (see `AppSettings` /
 * `registerProjectHandlers`'s `project-settings:*` handlers below). Both
 * `projectsDir` and `libraryDir` are recomputed from this whenever it
 * changes, so a project (its metadata file) and its content (folder files)
 * always move together as one self-contained unit.
 */
const defaultProjectsDataDir = app.getPath("userData")
let projectsDataDir = defaultProjectsDataDir

let libraryDir = path.join(projectsDataDir, "library-folders")

async function ensureLibraryDir() {
  await fs.mkdir(libraryDir, { recursive: true })
}

// Folder files are named by id so save/remove are simple, idempotent
// single-file operations — no index file to keep in sync (mirrors templates).
function libraryFolderPath(id: string) {
  return path.join(libraryDir, `${id}.json`)
}

function registerLibraryHandlers() {
  ipcMain.handle("library:list", async () => {
    await ensureLibraryDir()
    const entries = await fs.readdir(libraryDir)

    const folders = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
          try {
            const raw = await fs.readFile(path.join(libraryDir, entry), "utf8")
            return JSON.parse(raw) as Folder
          } catch {
            // Skip files that aren't valid folder JSON rather than failing the whole list.
            return null
          }
        })
    )

    return folders.filter(Boolean)
  })

  ipcMain.handle("library:save", async (_event, folder: Folder) => {
    await ensureLibraryDir()
    await fs.writeFile(libraryFolderPath(folder.id), JSON.stringify(folder, null, 2), "utf8")
  })

  ipcMain.handle("library:remove", async (_event, id: string) => {
    await fs.rm(libraryFolderPath(id), { force: true })
  })
}

interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

let projectsDir = path.join(projectsDataDir, "projects")

async function ensureProjectsDir() {
  await fs.mkdir(projectsDir, { recursive: true })
}

// Project files are named by id so save/remove are simple, idempotent
// single-file operations — no index file to keep in sync (mirrors library folders).
function projectPath(id: string) {
  return path.join(projectsDir, `${id}.json`)
}

interface AppSettings {
  schemaVersion: 1
  /** Overrides `projectsDataDir`; absent means the default location under `userData`. */
  projectsDataDir?: string
}

const appSettingsPath = path.join(app.getPath("userData"), "app-settings.json")

async function readAppSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(appSettingsPath, "utf8")
    const parsed = JSON.parse(raw) as AppSettings
    return { schemaVersion: 1, projectsDataDir: parsed.projectsDataDir }
  } catch {
    return { schemaVersion: 1 }
  }
}

async function writeAppSettings(settings: AppSettings) {
  await fs.writeFile(appSettingsPath, JSON.stringify(settings, null, 2), "utf8")
}

/** Loads a persisted custom `projectsDataDir` (if any) and recomputes `projectsDir`/`libraryDir` from it — called once at startup, before any project/library IPC handler can run. */
async function applyStoredProjectsDataDir() {
  const settings = await readAppSettings()
  if (!settings.projectsDataDir) return
  projectsDataDir = settings.projectsDataDir
  projectsDir = path.join(projectsDataDir, "projects")
  libraryDir = path.join(projectsDataDir, "library-folders")
}

/** Moves every `.json` file from `fromDir` into `toDir` (creating `toDir` first); a no-op if they're already the same directory. Falls back to copy+delete when `fs.rename` can't cross a filesystem/volume boundary. */
async function moveDirContents(fromDir: string, toDir: string) {
  await fs.mkdir(toDir, { recursive: true })
  if (path.resolve(fromDir) === path.resolve(toDir)) return

  let entries: string[]
  try {
    entries = await fs.readdir(fromDir)
  } catch {
    return // `fromDir` never existed (e.g. nothing saved yet) — nothing to migrate.
  }

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue
    const from = path.join(fromDir, entry)
    const to = path.join(toDir, entry)
    try {
      await fs.rename(from, to)
    } catch {
      await fs.copyFile(from, to)
      await fs.rm(from)
    }
  }
}

/**
 * Relocates where projects (and their folders/slides) are stored: moves the
 * existing content from the current `projectsDir`/`libraryDir` into the new
 * location, updates the in-memory paths, and persists the choice (or clears
 * it, when moving back to the default) so it survives a restart.
 */
async function changeProjectsDataDir(nextDataDir: string) {
  const nextProjectsDir = path.join(nextDataDir, "projects")
  const nextLibraryDir = path.join(nextDataDir, "library-folders")

  await moveDirContents(projectsDir, nextProjectsDir)
  await moveDirContents(libraryDir, nextLibraryDir)

  projectsDataDir = nextDataDir
  projectsDir = nextProjectsDir
  libraryDir = nextLibraryDir

  await writeAppSettings({
    schemaVersion: 1,
    projectsDataDir: nextDataDir === defaultProjectsDataDir ? undefined : nextDataDir,
  })
}

function registerProjectHandlers() {
  ipcMain.handle("project:list", async () => {
    await ensureProjectsDir()
    const entries = await fs.readdir(projectsDir)

    const projects = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
          try {
            const raw = await fs.readFile(path.join(projectsDir, entry), "utf8")
            return JSON.parse(raw) as Project
          } catch {
            // Skip files that aren't valid project JSON rather than failing the whole list.
            return null
          }
        })
    )

    return projects.filter(Boolean)
  })

  ipcMain.handle("project:save", async (_event, project: Project) => {
    await ensureProjectsDir()
    await fs.writeFile(projectPath(project.id), JSON.stringify(project, null, 2), "utf8")
  })

  ipcMain.handle("project:remove", async (_event, id: string) => {
    await fs.rm(projectPath(id), { force: true })
  })

  // Lets a project file be opened from anywhere on disk, not just this
  // app's own managed `projectsDir` — the dialog does the browsing, this
  // just reads whatever the user picked. Parsing/validation happens in the
  // renderer (see `parseProjectFile`), same split as every other IPC read here.
  ipcMain.handle("project:openFileDialog", async () => {
    const dialogOptions: Electron.OpenDialogOptions = {
      properties: ["openFile"],
      filters: [{ name: "BibleTime Project", extensions: ["json"] }],
    }
    const win = BrowserWindow.getFocusedWindow()
    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || !result.filePaths[0]) return null
    return fs.readFile(result.filePaths[0], "utf8")
  })

  ipcMain.handle("project-settings:get", () => ({
    path: projectsDataDir,
    isDefault: projectsDataDir === defaultProjectsDataDir,
  }))

  // Lets the user relocate where projects (and their folders/slides) are
  // stored to anywhere on disk, e.g. a synced or backed-up folder — a
  // dedicated subfolder is created there (rather than scattering files
  // directly into whatever folder they picked), and everything already
  // saved is moved into it (see `changeProjectsDataDir`).
  ipcMain.handle("project-settings:choose", async () => {
    const dialogOptions: Electron.OpenDialogOptions = {
      properties: ["openDirectory", "createDirectory"],
    }
    const win = BrowserWindow.getFocusedWindow()
    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || !result.filePaths[0]) return null

    const nextDataDir = path.join(result.filePaths[0], "BibleTime Projects")
    await changeProjectsDataDir(nextDataDir)
    return { path: projectsDataDir, isDefault: false }
  })

  ipcMain.handle("project-settings:resetToDefault", async () => {
    await changeProjectsDataDir(defaultProjectsDataDir)
    return { path: projectsDataDir, isDefault: true }
  })
}

function registerAppInfoHandlers() {
  ipcMain.on("app:get-version", (event) => {
    event.returnValue = app.getVersion()
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadURL(webUrl)

  // The "Proyectar" button opens `/present` via `window.open` — give it a
  // clean, chrome-less window sized for a second display instead of
  // inheriting the main window's menu bar/devtools setup.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (new URL(url).pathname.startsWith("/present")) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 1280,
          height: 720,
          frame: false,
          autoHideMenuBar: true,
          backgroundColor: "#000000",
          webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
          },
        },
      }
    }
    return { action: "allow" }
  })

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: "detach" })
  }
}

app.whenReady().then(async () => {
  await applyStoredProjectsDataDir()

  registerAppInfoHandlers()
  registerTemplateHandlers()
  registerTemplateMediaHandlers()
  registerBibleVersionDownloadHandlers()
  registerLibraryHandlers()
  registerProjectHandlers()
  createWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
