import { app, BrowserWindow, dialog, ipcMain, net, protocol, screen, shell } from "electron"
import { execFile } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs/promises"
import { constants as fsConstants } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Where the renderer is served from.
 *
 * In development that's the Vite dev server the `dev` script already waits
 * on. In a packaged app there is no dev server, so the main process boots
 * the app's own Nitro build (`node-server` preset) in-process and points at
 * that instead — see `startBundledServer`. `BIBLETIME_WEB_URL` overrides
 * both, which is how you point a packaged build at a staging server.
 */
const devWebUrl = process.env.BIBLETIME_WEB_URL ?? "http://localhost:3000"

/** Set to the bundled server's address on startup in a packaged app; stays the dev server's otherwise. */
let resolvedWebUrl = devWebUrl

/**
 * The console's own route. The site root serves the public landing page —
 * a page for people deciding whether to download this app, which is not
 * what someone who already opened it should be looking at.
 */
function consoleUrl() {
  return new URL("/library", resolvedWebUrl).toString()
}

/** Asks the OS for a free port by binding one and immediately releasing it. */
async function findFreePort(): Promise<number> {
  const { createServer } = await import("node:net")
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.unref()
    probe.on("error", reject)
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address()
      const port = typeof address === "object" && address ? address.port : 0
      probe.close(() => resolve(port))
    })
  })
}

/** Polls the server until it answers, so the window never loads against a socket that isn't listening yet. */
async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const response = await net.fetch(url, { method: "HEAD" })
      if (response.ok || response.status < 500) return
    } catch {
      // Not listening yet — fall through to the retry delay.
    }
    if (Date.now() > deadline) throw new Error(`Bundled server did not start within ${timeoutMs}ms`)
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
}

/**
 * Starts the bundled Nitro server inside the main process and resolves to
 * its URL.
 *
 * The web app is an SSR build (`.output/server/index.mjs`), not a folder of
 * static files, so it can't be loaded over `file://` — it needs a running
 * Node server, and Electron's main process already is one. The output ships
 * as an unpacked resource (see `extraResources` in this package's build
 * config) because Nitro's entry uses dynamic imports, which don't resolve
 * from inside an asar archive.
 */
async function startBundledServer(): Promise<string> {
  const serverEntry = path.join(process.resourcesPath, "web", "server", "index.mjs")
  const port = await findFreePort()

  process.env.PORT = String(port)
  process.env.HOST = "127.0.0.1"
  // Nitro reads these at import time, so they must be set before the entry
  // module is evaluated — importing it *is* starting the server.
  await import(pathToFileURL(serverEntry).href)

  const url = `http://127.0.0.1:${port}`
  await waitForServer(url)
  return url
}

const TEMPLATE_MEDIA_SCHEME = "bibletime-media"
const MEDIA_FILE_SCHEME = "bibletime-file"

// Must run before `app.whenReady()` — Electron requires privileged custom
// schemes to be registered at module load time.
protocol.registerSchemesAsPrivileged([
  { scheme: TEMPLATE_MEDIA_SCHEME, privileges: { standard: true, stream: true, supportFetchAPI: true } },
  { scheme: MEDIA_FILE_SCHEME, privileges: { standard: true, stream: true, supportFetchAPI: true } },
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

interface Song {
  id: string
}

/**
 * The song repertoire lives under `userData` alongside `templates/` — not
 * under `projectsDataDir` — because songs are reused across every project
 * and service, while a project is a self-contained relocatable unit.
 */
const songsDir = path.join(app.getPath("userData"), "songs")

async function ensureSongsDir() {
  await fs.mkdir(songsDir, { recursive: true })
}

// Song files are named by id so save/remove are simple, idempotent
// single-file operations — no index file to keep in sync (mirrors templates).
function songPath(id: string) {
  return path.join(songsDir, `${id}.json`)
}

function registerSongHandlers() {
  ipcMain.handle("songs:list", async () => {
    await ensureSongsDir()
    const entries = await fs.readdir(songsDir)

    const songs = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
          try {
            const raw = await fs.readFile(path.join(songsDir, entry), "utf8")
            return JSON.parse(raw) as Song
          } catch {
            // Skip files that aren't valid song JSON rather than failing the whole list.
            return null
          }
        })
    )

    return songs.filter(Boolean)
  })

  ipcMain.handle("songs:save", async (_event, song: Song) => {
    await ensureSongsDir()
    await fs.writeFile(songPath(song.id), JSON.stringify(song, null, 2), "utf8")
  })

  ipcMain.handle("songs:remove", async (_event, id: string) => {
    await fs.rm(songPath(id), { force: true })
  })
}

const LRCLIB_SEARCH_URL = "https://lrclib.net/api/search"
const SONG_SEARCH_TIMEOUT_MS = 10_000

/**
 * Queries LRCLIB from the main process rather than the renderer, for two
 * reasons: it sidesteps CORS entirely (a renderer request depends on
 * response headers that aren't ours to guarantee), and LRCLIB asks callers
 * to send a `User-Agent` identifying the application — a header browsers
 * forbid scripts from setting.
 *
 * Returns the provider's raw array; mapping to `SongSearchResult` happens in
 * the renderer, same split as every other IPC read here.
 */
function registerSongSearchHandlers() {
  ipcMain.handle("song-search:query", async (_event, query: string) => {
    const url = `${LRCLIB_SEARCH_URL}?q=${encodeURIComponent(query)}`
    const response = await fetch(url, {
      headers: {
        "User-Agent": `BibleTime v${app.getVersion()} (https://github.com/anthonycifuentes/bibletime)`,
      },
      signal: AbortSignal.timeout(SONG_SEARCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Song search failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
  })
}

/**
 * The reserved reference host for derived artifacts (thumbnails, rendered
 * document pages). Root ids are generated as `root-<base36>` in the
 * renderer, so a real root can never claim it.
 */
const MEDIA_CACHE_HOST = "cache"

interface MediaRoot {
  id: string
  label: string
  path: string
  addedAt: number
}

interface MediaSourcesFile {
  schemaVersion: 1
  roots: MediaRoot[]
  favorites: string[]
}

const mediaSourcesPath = path.join(app.getPath("userData"), "media-sources.json")
const mediaCacheDir = path.join(app.getPath("userData"), "media-cache")

async function ensureMediaCacheDir() {
  await fs.mkdir(mediaCacheDir, { recursive: true })
}

async function readMediaSources(): Promise<MediaSourcesFile> {
  try {
    const raw = await fs.readFile(mediaSourcesPath, "utf8")
    const parsed = JSON.parse(raw) as MediaSourcesFile
    return { schemaVersion: 1, roots: parsed.roots ?? [], favorites: parsed.favorites ?? [] }
  } catch {
    return { schemaVersion: 1, roots: [], favorites: [] }
  }
}

async function writeMediaSources(sources: MediaSourcesFile) {
  await fs.writeFile(mediaSourcesPath, JSON.stringify(sources, null, 2), "utf8")
}

/**
 * Mirrors the renderer's `parseMediaReference` (see
 * `modules/media/services/media-reference.ts`). Duplicated rather than
 * imported because `apps/desktop` compiles against its own tsconfig with no
 * path back into the web app — the same reason `Folder`/`Project`/`Song`
 * are redeclared above.
 */
function parseMediaReference(reference: string): { host: string; path: string } | null {
  const prefix = `${MEDIA_FILE_SCHEME}://`
  if (!reference.startsWith(prefix)) return null

  const remainder = reference.slice(prefix.length)
  const slash = remainder.indexOf("/")
  if (slash <= 0) return null

  const host = remainder.slice(0, slash).toLowerCase()
  const rawPath = remainder.slice(slash + 1)
  if (!rawPath) return null

  try {
    const decoded = rawPath
      .split("/")
      .filter((segment) => segment.length > 0)
      .map(decodeURIComponent)
      .join("/")
    if (!decoded) return null
    return { host, path: decoded }
  } catch {
    return null
  }
}

/** True when `target` is `base` itself or sits somewhere beneath it. */
function isInside(base: string, target: string): boolean {
  const relative = path.relative(base, target)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

/**
 * Resolves a `bibletime-file://` reference to a real path, or throws.
 *
 * Generalizes `templateMediaPath`'s guard from "exactly this one flat
 * directory" to "anywhere beneath this root", which is what a user's media
 * folder needs. Two checks, deliberately: a lexical one that rejects `..`
 * before touching the filesystem, then a `realpath` one that catches a
 * symlink inside the root pointing outside it — the lexical check alone
 * would pass that.
 */
async function resolveMediaFilePath(reference: string): Promise<string> {
  const parsed = parseMediaReference(reference)
  if (!parsed) throw new Error("Invalid media reference")

  let base: string
  if (parsed.host === MEDIA_CACHE_HOST) {
    base = mediaCacheDir
  } else {
    const sources = await readMediaSources()
    const root = sources.roots.find((candidate) => candidate.id === parsed.host)
    if (!root) throw new Error("Unknown media root")
    base = root.path
  }

  const resolved = path.resolve(base, parsed.path)
  if (!isInside(base, resolved)) throw new Error("Media reference escapes its root")

  const realBase = await fs.realpath(base)
  const realResolved = await fs.realpath(resolved)
  if (!isInside(realBase, realResolved)) throw new Error("Media reference escapes its root")

  return realResolved
}

function registerMediaProtocolHandler() {
  protocol.handle(MEDIA_FILE_SCHEME, async (request) => {
    try {
      const resolved = await resolveMediaFilePath(request.url)
      // `pathToFileURL` rather than string concatenation — media paths
      // routinely contain spaces, `#`, and accented characters, all of
      // which would corrupt a hand-built `file://` URL.
      //
      // The incoming headers are forwarded so a `Range` request survives,
      // which is what lets the preview scrub through a long video instead
      // of having to buffer it from the start.
      return await net.fetch(pathToFileURL(resolved).toString(), { headers: request.headers })
    } catch {
      // Any guard failure, unknown root, or missing file is a flat 404 —
      // never an error body, which would leak whether a path exists.
      return new Response(null, { status: 404 })
    }
  })
}

function registerMediaSourceHandlers() {
  ipcMain.handle("media:listRoots", async () => {
    const sources = await readMediaSources()
    // Reports reachability so the explorer can show an unmounted or
    // deleted root in an actionable state rather than as an empty folder.
    return Promise.all(
      sources.roots.map(async (root) => {
        try {
          const stats = await fs.stat(root.path)
          return { ...root, isAvailable: stats.isDirectory() }
        } catch {
          return { ...root, isAvailable: false }
        }
      })
    )
  })

  ipcMain.handle("media:addRoot", async () => {
    const dialogOptions: Electron.OpenDialogOptions = {
      properties: ["openDirectory", "createDirectory"],
    }
    const win = BrowserWindow.getFocusedWindow()
    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || !result.filePaths[0]) return null

    return addMediaRoot(result.filePaths[0])
  })

  // Dropping a folder from the OS file manager registers it too — the
  // renderer can only see the dropped path, not open a dialog for it.
  ipcMain.handle("media:addRootByPath", async (_event, directoryPath: string) => {
    const stats = await fs.stat(directoryPath)
    if (!stats.isDirectory()) throw new Error("Not a directory")
    return addMediaRoot(directoryPath)
  })

  ipcMain.handle("media:removeRoot", async (_event, rootId: string) => {
    const sources = await readMediaSources()
    sources.roots = sources.roots.filter((root) => root.id !== rootId)
    // Favorites pointing into the removed root would never resolve again.
    sources.favorites = sources.favorites.filter(
      (reference) => parseMediaReference(reference)?.host !== rootId
    )
    await writeMediaSources(sources)
  })

  // Repointing a root is what makes references root-relative worth it: the
  // user moved their media folder, and every slide referencing anything
  // inside it works again after this one action.
  ipcMain.handle("media:relocateRoot", async (_event, rootId: string) => {
    const dialogOptions: Electron.OpenDialogOptions = { properties: ["openDirectory"] }
    const win = BrowserWindow.getFocusedWindow()
    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || !result.filePaths[0]) return null

    const nextPath = result.filePaths[0]
    const sources = await readMediaSources()
    const root = sources.roots.find((candidate) => candidate.id === rootId)
    if (!root) throw new Error("Unknown media root")

    root.path = nextPath
    root.label = path.basename(nextPath) || nextPath
    await writeMediaSources(sources)
    return { ...root, isAvailable: true }
  })

  ipcMain.handle("media:listFavorites", async () => (await readMediaSources()).favorites)

  ipcMain.handle("media:setFavorite", async (_event, reference: string, isFavorite: boolean) => {
    const sources = await readMediaSources()
    const without = sources.favorites.filter((candidate) => candidate !== reference)
    sources.favorites = isFavorite ? [...without, reference] : without
    await writeMediaSources(sources)
    return sources.favorites
  })

  ipcMain.handle("media:listDirectory", async (_event, rootId: string, relativePath: string) => {
    const sources = await readMediaSources()
    const root = sources.roots.find((candidate) => candidate.id === rootId)
    if (!root) throw new Error("Unknown media root")

    const target = path.resolve(root.path, relativePath)
    if (!isInside(root.path, target)) throw new Error("Directory escapes its root")

    const entries = await fs.readdir(target, { withFileTypes: true })
    const directories: { name: string; relativePath: string }[] = []
    const files: {
      name: string
      relativePath: string
      size: number
      mtimeMs: number
    }[] = []

    for (const entry of entries) {
      // Dotfiles are noise in a media folder (`.DS_Store`, `.thumbnails`).
      if (entry.name.startsWith(".")) continue

      const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        directories.push({ name: entry.name, relativePath: childRelative })
        continue
      }
      if (!entry.isFile()) continue

      try {
        const stats = await fs.stat(path.join(target, entry.name))
        files.push({
          name: entry.name,
          relativePath: childRelative,
          size: stats.size,
          mtimeMs: stats.mtimeMs,
        })
      } catch {
        // Skip an entry that can't be stat'd (a permissions hole, a broken
        // symlink) rather than failing the whole listing — the pattern
        // `library:list` already uses for unreadable files.
      }
    }

    // Format policy lives in the renderer's `supported-formats`, so this
    // returns every regular file and lets one place decide what is media.
    return { rootId, relativePath, directories, files }
  })

  ipcMain.handle("media:statFile", async (_event, reference: string) => {
    const resolved = await resolveMediaFilePath(reference)
    const stats = await fs.stat(resolved)
    return { size: stats.size, mtimeMs: stats.mtimeMs, exists: true }
  })

  ipcMain.handle("media:revealInFolder", async (_event, reference: string) => {
    const resolved = await resolveMediaFilePath(reference)
    shell.showItemInFolder(resolved)
  })

  // Relinking a moved file: the picked path has to fall inside a registered
  // root, because a reference can only ever address something under one.
  ipcMain.handle("media:relinkFileDialog", async (_event, filters: Electron.FileFilter[]) => {
    const dialogOptions: Electron.OpenDialogOptions = { properties: ["openFile"], filters }
    const win = BrowserWindow.getFocusedWindow()
    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || !result.filePaths[0]) return null

    const picked = await fs.realpath(result.filePaths[0])
    const sources = await readMediaSources()
    for (const root of sources.roots) {
      try {
        const realRoot = await fs.realpath(root.path)
        if (!isInside(realRoot, picked)) continue
        const relative = path.relative(realRoot, picked).split(path.sep).join("/")
        const stats = await fs.stat(picked)
        return { rootId: root.id, relativePath: relative, size: stats.size, mtimeMs: stats.mtimeMs }
      } catch {
        // An unreachable root can't contain the picked file.
      }
    }
    return { outsideRoots: true as const }
  })
}

async function addMediaRoot(directoryPath: string) {
  const resolved = await fs.realpath(directoryPath)
  const sources = await readMediaSources()

  // De-duplicate by resolved path, so picking the same folder twice (or
  // once through a symlink) doesn't produce two roots over one directory.
  const existing = await findRootByPath(sources.roots, resolved)
  if (existing) return { ...existing, isAvailable: true }

  const root: MediaRoot = {
    id: `root-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
    label: path.basename(resolved) || resolved,
    path: resolved,
    addedAt: Date.now(),
  }
  sources.roots = [...sources.roots, root]
  await writeMediaSources(sources)
  return { ...root, isAvailable: true }
}

async function findRootByPath(roots: MediaRoot[], resolvedPath: string): Promise<MediaRoot | undefined> {
  for (const root of roots) {
    try {
      if ((await fs.realpath(root.path)) === resolvedPath) return root
    } catch {
      // Unreachable root can't be the one just picked.
    }
  }
  return undefined
}

/** Guards a cache write target the same way `resolveMediaFilePath` guards a read, minus the must-already-exist part. */
function resolveCacheWritePath(contentKey: string, fileName: string): string {
  const resolved = path.resolve(mediaCacheDir, contentKey, fileName)
  if (!isInside(mediaCacheDir, resolved)) throw new Error("Cache path escapes the cache directory")
  return resolved
}

async function directorySize(directory: string): Promise<number> {
  let total = 0
  let entries: string[]
  try {
    entries = await fs.readdir(directory)
  } catch {
    return 0
  }

  for (const entry of entries) {
    const child = path.join(directory, entry)
    try {
      const stats = await fs.stat(child)
      total += stats.isDirectory() ? await directorySize(child) : stats.size
    } catch {
      // Skip what can't be stat'd rather than failing the total.
    }
  }
  return total
}

function registerMediaCacheHandlers() {
  ipcMain.handle("media-cache:list", async (_event, contentKey: string) => {
    try {
      return await fs.readdir(path.join(mediaCacheDir, contentKey))
    } catch {
      return []
    }
  })

  ipcMain.handle(
    "media-cache:write",
    async (_event, contentKey: string, fileName: string, buffer: ArrayBuffer) => {
      const finalPath = resolveCacheWritePath(contentKey, fileName)
      await fs.mkdir(path.dirname(finalPath), { recursive: true })

      // Temp-then-rename, as `bible-version-downloads:download` does, so a
      // killed render never leaves a half-written page image behind that a
      // later cache check would count as a hit.
      const tempPath = `${finalPath}.tmp`
      await fs.writeFile(tempPath, Buffer.from(buffer))
      await fs.rename(tempPath, finalPath)

      return `${MEDIA_FILE_SCHEME}://${MEDIA_CACHE_HOST}/${encodeURIComponent(contentKey)}/${encodeURIComponent(fileName)}`
    }
  )

  ipcMain.handle("media-cache:size", async () => {
    await ensureMediaCacheDir()
    return directorySize(mediaCacheDir)
  })

  ipcMain.handle("media-cache:clear", async () => {
    await fs.rm(mediaCacheDir, { recursive: true, force: true })
    await ensureMediaCacheDir()
  })
}

const LIBREOFFICE_TIMEOUT_MS = 120_000

/** Standard install locations, checked after PATH. Order is most- to least-likely per platform. */
const LIBREOFFICE_CANDIDATES: Record<string, string[]> = {
  darwin: ["/Applications/LibreOffice.app/Contents/MacOS/soffice"],
  win32: [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ],
  linux: [
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
    "/usr/lib/libreoffice/program/soffice",
    "/snap/bin/libreoffice",
  ],
}

/** Resolved once per process — probing walks PATH and stats several paths, and the answer can't change while the app runs. */
let libreOfficeProbe: Promise<string | null> | undefined

async function isExecutable(candidate: string): Promise<boolean> {
  try {
    await fs.access(candidate, fsConstants.X_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Walks `PATH` and then the platform's standard install locations. Done by
 * statting candidates rather than spawning `which`/`where`, which keeps the
 * probe free of a shell and of a spawn that some environments block.
 */
async function findLibreOffice(): Promise<string | null> {
  const executableNames = process.platform === "win32" ? ["soffice.exe", "soffice.com"] : ["soffice", "libreoffice"]

  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!directory) continue
    for (const name of executableNames) {
      const candidate = path.join(directory, name)
      if (await isExecutable(candidate)) return candidate
    }
  }

  for (const candidate of LIBREOFFICE_CANDIDATES[process.platform] ?? []) {
    if (await isExecutable(candidate)) return candidate
  }

  return null
}

/** Running conversions, keyed by content key, so selecting a different file can abandon the one in flight. */
const runningConversions = new Map<string, ReturnType<typeof execFile>>()

function registerMediaConvertHandlers() {
  ipcMain.handle("media-convert:probeLibreOffice", async () => {
    libreOfficeProbe ??= findLibreOffice()
    const resolved = await libreOfficeProbe
    return { available: resolved !== null, path: resolved }
  })

  ipcMain.handle("media-convert:cancel", (_event, contentKey: string) => {
    runningConversions.get(contentKey)?.kill()
    runningConversions.delete(contentKey)
  })

  ipcMain.handle("media-convert:toPdf", async (_event, contentKey: string, reference: string) => {
    libreOfficeProbe ??= findLibreOffice()
    const soffice = await libreOfficeProbe
    if (!soffice) return { ok: false as const, code: "libreoffice-missing" as const }

    let inputPath: string
    try {
      inputPath = await resolveMediaFilePath(reference)
    } catch (error) {
      return { ok: false as const, code: "conversion-failed" as const, detail: String(error) }
    }

    const outputDir = path.join(mediaCacheDir, contentKey)
    await fs.mkdir(outputDir, { recursive: true })

    // A dedicated user profile is not optional: with the default profile,
    // `--headless` silently refuses to convert whenever the user already
    // has LibreOffice open, which is exactly when they'd be reaching for a
    // deck.
    const profileDir = pathToFileURL(path.join(mediaCacheDir, ".libreoffice-profile")).toString()

    try {
      await new Promise<void>((resolve, reject) => {
        const child = execFile(
          soffice,
          [
            `-env:UserInstallation=${profileDir}`,
            "--headless",
            "--norestore",
            "--convert-to",
            "pdf",
            "--outdir",
            outputDir,
            inputPath,
          ],
          // An argument array, never a shell string — the input path comes
          // from the filesystem and can contain anything.
          { timeout: LIBREOFFICE_TIMEOUT_MS, windowsHide: true },
          (error) => (error ? reject(error) : resolve())
        )
        runningConversions.set(contentKey, child)
      })
    } catch (error) {
      const killed = (error as NodeJS.ErrnoException & { killed?: boolean }).killed
      return {
        ok: false as const,
        code: killed ? ("conversion-timeout" as const) : ("conversion-failed" as const),
        detail: String(error),
      }
    } finally {
      runningConversions.delete(contentKey)
    }

    // LibreOffice names its output after the input's basename, so find the
    // PDF it just wrote rather than assuming the name survived unchanged.
    const produced = (await fs.readdir(outputDir)).find((entry) => entry.toLowerCase().endsWith(".pdf"))
    if (!produced) {
      return { ok: false as const, code: "conversion-failed" as const, detail: "No PDF produced" }
    }

    return {
      ok: true as const,
      reference: `${MEDIA_FILE_SCHEME}://${MEDIA_CACHE_HOST}/${encodeURIComponent(contentKey)}/${encodeURIComponent(produced)}`,
    }
  })
}

const GOOGLE_SLIDES_TIMEOUT_MS = 30_000

/** Matches the deck id in every Google Slides URL shape (`/d/<id>/edit`, `/d/e/<published-id>/pub`, with or without query). */
function extractSlidesDeckId(url: string): string | null {
  const match = /\/presentation\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/.exec(url)
  return match?.[1] ?? null
}

/**
 * Fetches a Google Slides deck as PDF from the main process: the endpoint is
 * unreachable from a renderer under CORS, and the redirect chain needs
 * following without a browser's opaque-response rules.
 */
function registerGoogleSlidesHandlers() {
  ipcMain.handle("google-slides:export", async (_event, url: string, contentKey: string) => {
    const deckId = extractSlidesDeckId(url)
    if (!deckId) return { ok: false as const, code: "not-a-slides-url" as const }

    let response: Response
    try {
      response = await fetch(`https://docs.google.com/presentation/d/${deckId}/export/pdf`, {
        redirect: "follow",
        signal: AbortSignal.timeout(GOOGLE_SLIDES_TIMEOUT_MS),
      })
    } catch (error) {
      return { ok: false as const, code: "network" as const, detail: String(error) }
    }

    if (!response.ok) {
      // 401/403/404 all mean the same thing to the user here: this deck
      // isn't reachable without signing in.
      const code = response.status === 401 || response.status === 403 || response.status === 404
      return code
        ? { ok: false as const, code: "slides-not-shared" as const }
        : { ok: false as const, code: "network" as const, detail: `HTTP ${response.status}` }
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    // A deck without link sharing answers 200 with an HTML sign-in page.
    // Checking the magic bytes as well as the content type is what turns
    // that into "this deck isn't shared" instead of "corrupt file".
    const contentType = response.headers.get("content-type") ?? ""
    const looksLikePdf = buffer.subarray(0, 5).toString("latin1") === "%PDF-"
    if (!contentType.includes("application/pdf") || !looksLikePdf) {
      return { ok: false as const, code: "slides-not-shared" as const }
    }

    const fileName = `${deckId}.pdf`
    const finalPath = resolveCacheWritePath(contentKey, fileName)
    await fs.mkdir(path.dirname(finalPath), { recursive: true })
    const tempPath = `${finalPath}.tmp`
    await fs.writeFile(tempPath, buffer)
    await fs.rename(tempPath, finalPath)

    return {
      ok: true as const,
      deckId,
      importedAt: Date.now(),
      reference: `${MEDIA_FILE_SCHEME}://${MEDIA_CACHE_HOST}/${encodeURIComponent(contentKey)}/${encodeURIComponent(fileName)}`,
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

interface OutputWindowBounds {
  x: number
  y: number
  width: number
  height: number
  isFullScreen: boolean
}

interface AppSettings {
  schemaVersion: 1
  /** Overrides `projectsDataDir`; absent means the default location under `userData`. */
  projectsDataDir?: string
  /** Where the `/present` output window was last placed, so a projector setup survives a restart. */
  outputWindow?: OutputWindowBounds
}

const appSettingsPath = path.join(app.getPath("userData"), "app-settings.json")

/**
 * Reads the whole settings object rather than picking known keys out of it.
 * Picking would silently drop any key this build doesn't recognize — which,
 * combined with the merge in `writeAppSettings`, is what keeps a projects
 * relocation from erasing the saved output-window bounds (and vice versa).
 */
async function readAppSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(appSettingsPath, "utf8")
    const parsed = JSON.parse(raw) as AppSettings
    return { ...parsed, schemaVersion: 1 }
  } catch {
    return { schemaVersion: 1 }
  }
}

/** Merges over what is already on disk — every caller updates its own keys and must leave the rest alone. */
async function writeAppSettings(settings: Partial<AppSettings>) {
  const current = await readAppSettings()
  const next: AppSettings = { ...current, ...settings, schemaVersion: 1 }
  await fs.writeFile(appSettingsPath, JSON.stringify(next, null, 2), "utf8")
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

/**
 * Writes to a temp file in the destination's own directory and renames it
 * into place — the pattern `bible-version-downloads:download` and
 * `media-cache:write` already use, and the reason it matters most here: a
 * save that dies partway must not leave a truncated file where the user's
 * only copy of a service's content used to be.
 *
 * `rename` cannot cross a filesystem boundary, but the temp file is a
 * sibling of the target, so that failure is close to unreachable; the direct
 * write is a last resort rather than the normal path.
 */
async function writeFileAtomic(filePath: string, contents: string) {
  const tempPath = `${filePath}.tmp`
  try {
    await fs.writeFile(tempPath, contents, "utf8")
    await fs.rename(tempPath, filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") {
      await fs.rm(tempPath, { force: true })
      throw error
    }
    await fs.writeFile(filePath, contents, "utf8")
    await fs.rm(tempPath, { force: true })
  }
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
  //
  // Returns the path alongside the contents so the renderer can bind the
  // opened project to the file it came from, and later "Save" it back there
  // without asking again.
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

    const filePath = result.filePaths[0]
    return { path: filePath, contents: await fs.readFile(filePath, "utf8") }
  })

  // Saving is two handlers rather than one with a "show the dialog?" flag,
  // because they are two different user-visible behaviors: "Save as…" must
  // always ask, and "Save" on an already-bound project must never ask.

  ipcMain.handle("project:saveFileDialog", async (_event, defaultPath: string, contents: string) => {
    const dialogOptions: Electron.SaveDialogOptions = {
      defaultPath,
      filters: [{ name: "BibleTime Project", extensions: ["json"] }],
    }
    const win = BrowserWindow.getFocusedWindow()
    const result = win
      ? await dialog.showSaveDialog(win, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions)
    if (result.canceled || !result.filePath) return { canceled: true as const }

    try {
      await writeFileAtomic(result.filePath, contents)
    } catch (error) {
      return { canceled: false as const, ok: false as const, error: String(error) }
    }
    return { canceled: false as const, ok: true as const, path: result.filePath }
  })

  // Never throws across IPC: a bound path that has gone away (folder deleted,
  // volume unmounted, permissions revoked) is an expected outcome the renderer
  // recovers from by offering the save dialog — not an exception to surface as
  // a raw errno.
  ipcMain.handle("project:saveToPath", async (_event, filePath: string, contents: string) => {
    try {
      await writeFileAtomic(filePath, contents)
    } catch (error) {
      return { ok: false as const, error: String(error) }
    }
    return { ok: true as const, path: filePath }
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

/**
 * `/latest` already excludes drafts and prereleases, which is exactly what
 * we want to advertise — so no client-side filtering is needed to get the
 * newest release a user should actually be running.
 *
 * A consequence worth knowing: the release workflow attaches installers to
 * a *draft* release for the maintainer to verify. Update checks stay blind
 * to a release until it is published.
 */
const GITHUB_LATEST_RELEASE_URL =
  "https://api.github.com/repos/anthonycifuentes/bibletime/releases/latest"

/**
 * Asset URLs are remote input. Even though they arrive from the releases
 * API, they are checked against this list before anything is fetched, so a
 * compromised release can never point the downloader at another host.
 */
const ALLOWED_DOWNLOAD_HOSTS = new Set(["api.github.com", "github.com", "objects.githubusercontent.com"])

/** Ceiling on how often progress ticks cross the IPC boundary — a 150 MB installer is thousands of chunks. */
const DOWNLOAD_PROGRESS_INTERVAL_MS = 200

/** Mirrors `UpdateAsset` in the renderer's `modules/updates/interfaces` — see the note on `Song`/`Folder` above for why it's redeclared rather than imported. */
interface UpdateAsset {
  name: string
  url: string
  bytes: number | null
}

type UpdateCheckResult =
  | { status: "up-to-date"; currentVersion: string; checkedAt: number }
  | {
      status: "available"
      currentVersion: string
      availableVersion: string
      releaseUrl: string
      releaseNotes: string
      asset: UpdateAsset | null
      checkedAt: number
    }
  | { status: "failed"; currentVersion: string; reason: "offline" | "rate-limited" | "unexpected" }

type UpdateDownloadOutcome =
  | { status: "completed"; fileName: string; filePath: string }
  | { status: "cancelled" }
  | { status: "failed"; detail: string }

interface UpdatesFile {
  lastCheckedAt: number | null
  lastSeenVersion: string | null
  dismissedVersion: string | null
}

/** The subset of GitHub's release payload this app reads. */
interface GithubRelease {
  tag_name?: string
  html_url?: string
  body?: string
  draft?: boolean
  prerelease?: boolean
  assets?: { name?: string; browser_download_url?: string; size?: number }[]
}

const updatesStatePath = path.join(app.getPath("userData"), "updates.json")

async function readUpdatesState(): Promise<UpdatesFile> {
  try {
    const raw = await fs.readFile(updatesStatePath, "utf8")
    const parsed = JSON.parse(raw) as Partial<UpdatesFile>
    return {
      lastCheckedAt: parsed.lastCheckedAt ?? null,
      lastSeenVersion: parsed.lastSeenVersion ?? null,
      dismissedVersion: parsed.dismissedVersion ?? null,
    }
  } catch {
    return { lastCheckedAt: null, lastSeenVersion: null, dismissedVersion: null }
  }
}

async function writeUpdatesState(state: UpdatesFile) {
  await fs.writeFile(updatesStatePath, JSON.stringify(state, null, 2), "utf8")
}

/**
 * Orders two `MAJOR.MINOR.PATCH` versions, returning <0, 0, or >0.
 *
 * Numeric segments compare as numbers (so 0.10.0 beats 0.9.0, which a
 * string compare gets backwards), a leading `v` is ignored so release tags
 * compare directly against `app.getVersion()`, and any `-suffix` build
 * sorts below the plain release of the same number.
 *
 * Hand-rolled rather than pulling in `semver`: these are the only tags this
 * project produces, and the main process has no other use for the package.
 */
function compareVersions(a: string, b: string): number {
  const parse = (value: string) => {
    const [core = "", ...rest] = value.trim().replace(/^v/i, "").split("-")
    return {
      segments: core.split(".").map((segment) => Number.parseInt(segment, 10) || 0),
      prerelease: rest.join("-"),
    }
  }

  const left = parse(a)
  const right = parse(b)

  for (let index = 0; index < Math.max(left.segments.length, right.segments.length); index += 1) {
    const difference = (left.segments[index] ?? 0) - (right.segments[index] ?? 0)
    if (difference !== 0) return difference < 0 ? -1 : 1
  }

  if (left.prerelease === right.prerelease) return 0
  // A prerelease is always below the plain release it leads up to.
  if (!left.prerelease) return 1
  if (!right.prerelease) return -1
  return left.prerelease < right.prerelease ? -1 : 1
}

/**
 * Picks the release asset that will actually run here.
 *
 * Matched on the *shape* of the name — extension plus, on macOS, the arch
 * token — rather than the full `artifactName` template from
 * electron-builder.yml, so renaming the product or the template doesn't
 * silently stop every installed copy from finding its update.
 *
 * `.dmg` over `.zip` on macOS: the dmg is what the install guide tells
 * people to double-click. The zip exists for electron-updater, which this
 * app can't use while it ships unsigned.
 */
function selectUpdateAsset(assets: GithubRelease["assets"]): UpdateAsset | null {
  const candidates = (assets ?? []).filter(
    (asset): asset is { name: string; browser_download_url: string; size?: number } =>
      typeof asset.name === "string" && typeof asset.browser_download_url === "string"
  )

  const endsWith = (extension: string, arch?: string) =>
    candidates.find((asset) => {
      const name = asset.name.toLowerCase()
      return name.endsWith(extension) && (arch === undefined || name.includes(arch))
    })

  const match =
    process.platform === "darwin"
      ? endsWith(".dmg", process.arch === "arm64" ? "arm64" : "x64")
      : process.platform === "win32"
        ? endsWith(".exe")
        : process.platform === "linux"
          ? endsWith(".appimage")
          : undefined

  // A release with nothing for this platform is a real state (a build that
  // failed on one runner), and the UI falls back to the release page.
  if (!match) return null
  if (!isSafeAssetName(match.name) || !isAllowedDownloadUrl(match.browser_download_url)) return null

  return {
    name: match.name,
    url: match.browser_download_url,
    bytes: typeof match.size === "number" ? match.size : null,
  }
}

/** The asset name becomes a filename, so it must be a bare basename and nothing else. */
function isSafeAssetName(name: string): boolean {
  return (
    name.length > 0 &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !name.includes("..") &&
    path.basename(name) === name
  )
}

function isAllowedDownloadUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    return url.protocol === "https:" && ALLOWED_DOWNLOAD_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

/** The one in-flight installer download, if any. Only one runs at a time. */
let activeUpdateDownload: { controller: AbortController; partPath: string } | null = null

/** Where the last completed download landed, so "reveal" works after the panel is reopened. */
let completedUpdateDownloadPath: string | null = null

function registerUpdateHandlers() {
  ipcMain.handle("updates:get-state", async () => ({
    ...(await readUpdatesState()),
    currentVersion: app.getVersion(),
  }))

  ipcMain.handle("updates:check", async (): Promise<UpdateCheckResult> => {
    const currentVersion = app.getVersion()

    let release: GithubRelease
    try {
      const response = await net.fetch(GITHUB_LATEST_RELEASE_URL, {
        headers: {
          Accept: "application/vnd.github+json",
          // Same convention as the LRCLIB song search — an unattributed
          // request to a public API is a request waiting to be blocked.
          "User-Agent": `BibleTime v${currentVersion} (https://github.com/anthonycifuentes/bibletime)`,
        },
      })

      if (!response.ok) {
        console.warn(`Update check failed: ${response.status} ${response.statusText}`)
        return {
          status: "failed",
          currentVersion,
          // GitHub answers an exhausted unauthenticated quota with 403.
          reason: response.status === 403 || response.status === 429 ? "rate-limited" : "unexpected",
        }
      }

      release = (await response.json()) as GithubRelease
    } catch (error) {
      // Nothing reached the network, or the body wasn't JSON. Either way the
      // user didn't ask for this check, so it stays quiet.
      console.warn("Update check failed:", error)
      return { status: "failed", currentVersion, reason: "offline" }
    }

    const tag = release.tag_name
    if (typeof tag !== "string" || tag.trim().length === 0) {
      console.warn("Update check failed: release payload has no usable tag_name")
      return { status: "failed", currentVersion, reason: "unexpected" }
    }

    const checkedAt = Date.now()
    const availableVersion = tag.trim().replace(/^v/i, "")
    const persisted = await readUpdatesState()

    // `/latest` already excludes these; this only fires if that ever changes.
    if (release.draft || release.prerelease) {
      await writeUpdatesState({ ...persisted, lastCheckedAt: checkedAt })
      return { status: "up-to-date", currentVersion, checkedAt }
    }

    await writeUpdatesState({ ...persisted, lastCheckedAt: checkedAt, lastSeenVersion: availableVersion })

    // Strictly greater only: a locally built 0.3.0-dev must never be told to
    // "update" down to the published 0.2.0.
    if (compareVersions(availableVersion, currentVersion) <= 0) {
      return { status: "up-to-date", currentVersion, checkedAt }
    }

    return {
      status: "available",
      currentVersion,
      availableVersion,
      releaseUrl: release.html_url ?? "https://github.com/anthonycifuentes/bibletime/releases/latest",
      releaseNotes: release.body ?? "",
      asset: selectUpdateAsset(release.assets),
      checkedAt,
    }
  })

  ipcMain.handle("updates:dismiss", async (_event, version: string) => {
    const state = await readUpdatesState()
    await writeUpdatesState({ ...state, dismissedVersion: version })
  })

  ipcMain.handle("updates:download", async (event, asset: UpdateAsset): Promise<UpdateDownloadOutcome> => {
    if (activeUpdateDownload) return { status: "failed", detail: "A download is already in progress" }
    if (!isSafeAssetName(asset.name)) return { status: "failed", detail: `Refused asset name: ${asset.name}` }
    if (!isAllowedDownloadUrl(asset.url)) return { status: "failed", detail: "Refused download URL" }

    const downloadsDir = app.getPath("downloads")
    await fs.mkdir(downloadsDir, { recursive: true })

    const finalPath = path.join(downloadsDir, asset.name)
    // Downloaded under a temp name and renamed on success, so a killed app
    // or a dropped connection never leaves something that looks like a
    // complete installer — same reasoning as the Bible version downloads.
    const partPath = `${finalPath}.part`
    const controller = new AbortController()
    activeUpdateDownload = { controller, partPath }

    try {
      const response = await net.fetch(asset.url, {
        headers: {
          "User-Agent": `BibleTime v${app.getVersion()} (https://github.com/anthonycifuentes/bibletime)`,
        },
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`${response.status} ${response.statusText}`)
      }

      const declaredLength = Number.parseInt(response.headers.get("content-length") ?? "", 10)
      const totalBytes = Number.isFinite(declaredLength) && declaredLength > 0 ? declaredLength : null

      const handle = await fs.open(partPath, "w")
      let receivedBytes = 0
      let lastTickAt = 0

      try {
        const reader = response.body.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break

          await handle.write(value)
          receivedBytes += value.byteLength

          const now = Date.now()
          if (now - lastTickAt >= DOWNLOAD_PROGRESS_INTERVAL_MS && !event.sender.isDestroyed()) {
            lastTickAt = now
            event.sender.send("updates:download-progress", { receivedBytes, totalBytes })
          }
        }
      } finally {
        await handle.close()
      }

      await fs.rename(partPath, finalPath)
      completedUpdateDownloadPath = finalPath

      if (!event.sender.isDestroyed()) {
        event.sender.send("updates:download-progress", { receivedBytes, totalBytes })
      }

      // Revealed, never executed. Running an installer the app just fetched
      // would be executing remote content on the user's behalf, and it isn't
      // needed to make this flow work.
      shell.showItemInFolder(finalPath)

      return { status: "completed", fileName: asset.name, filePath: finalPath }
    } catch (error) {
      await fs.rm(partPath, { force: true })
      if (controller.signal.aborted) return { status: "cancelled" }
      console.warn("Update download failed:", error)
      return { status: "failed", detail: String(error) }
    } finally {
      activeUpdateDownload = null
    }
  })

  ipcMain.handle("updates:cancel-download", () => {
    // The download handler's catch is what deletes the partial file.
    activeUpdateDownload?.controller.abort()
  })

  ipcMain.handle("updates:reveal-download", () => {
    if (completedUpdateDownloadPath) shell.showItemInFolder(completedUpdateDownloadPath)
  })
}

/**
 * The `/present` output window, tracked so a second "send to output" reuses
 * it instead of stacking another one on top — see `setWindowOpenHandler`.
 */
let outputWindow: BrowserWindow | null = null

/**
 * Last known output-window placement, held in memory because
 * `overrideBrowserWindowOptions` is computed synchronously inside
 * `setWindowOpenHandler` and cannot await a settings read.
 */
let outputWindowBounds: OutputWindowBounds | null = null

async function loadOutputWindowBounds() {
  outputWindowBounds = (await readAppSettings()).outputWindow ?? null
}

/** Coalesces the burst of `moved`/`resized` events a single drag produces into one write. */
let boundsWriteTimer: NodeJS.Timeout | undefined

function persistOutputWindowBounds(win: BrowserWindow) {
  if (win.isDestroyed()) return

  // `getNormalBounds`, not `getBounds`: a maximized or fullscreen window
  // would otherwise overwrite the restore size with the screen's, and the
  // window could never come back to the size the user actually chose.
  const { x, y, width, height } = win.getNormalBounds()
  outputWindowBounds = { x, y, width, height, isFullScreen: win.isFullScreen() }

  clearTimeout(boundsWriteTimer)
  boundsWriteTimer = setTimeout(() => {
    void writeAppSettings({ outputWindow: outputWindowBounds ?? undefined })
  }, 400)
}

/**
 * Where to open the output window. Saved bounds are used only when they
 * still land on a connected display — otherwise unplugging the projector
 * they were saved on would reopen the window at coordinates that no longer
 * exist, i.e. invisibly off-screen.
 */
function resolveOutputWindowBounds(): { x?: number; y?: number; width: number; height: number } {
  if (outputWindowBounds) {
    const saved = outputWindowBounds
    const onADisplay = screen.getAllDisplays().some((display) => {
      const area = display.workArea
      return (
        saved.x < area.x + area.width &&
        saved.x + saved.width > area.x &&
        saved.y < area.y + area.height &&
        saved.y + saved.height > area.y
      )
    })
    if (onADisplay) {
      return { x: saved.x, y: saved.y, width: saved.width, height: saved.height }
    }
  }

  // No usable memory: size to the display rather than to a fixed 1280×720
  // that a smaller screen can't fit and a larger one wastes.
  const { workArea } = screen.getPrimaryDisplay()
  const width = Math.round(Math.min(workArea.width * 0.7, (workArea.height * 0.7 * 16) / 9))
  const height = Math.round((width * 9) / 16)
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height,
  }
}

/** Wires up an output window once Electron has created it: remembers where it goes, and forgets it when it closes. */
function trackOutputWindow(win: BrowserWindow) {
  outputWindow = win

  if (outputWindowBounds?.isFullScreen) win.setFullScreen(true)

  // Listed one by one rather than looped: `BrowserWindow.on` is typed with a
  // separate overload per event name, so a loop over an array of names has
  // no overload to match.
  const remember = () => persistOutputWindowBounds(win)
  win.on("moved", remember)
  win.on("resized", remember)
  win.on("enter-full-screen", remember)
  win.on("leave-full-screen", remember)
  win.on("close", remember)
  win.on("closed", () => {
    if (outputWindow === win) outputWindow = null
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadURL(consoleUrl())

  // The "Proyectar" button opens `/present` via `window.open` — give it a
  // window the user can actually place on a second display: movable,
  // resizable, and fullscreen-capable, rather than the main window's menu
  // bar/devtools setup.
  win.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url)

    // Anything off our own origin — most concretely a "Watch on YouTube"
    // click inside an embedded player — goes to the user's real browser.
    // Allowing it would hand a chrome-less Electron window over to a remote
    // page, which is both a security problem and a terrible thing to
    // discover mid-service.
    if (target.origin !== new URL(consoleUrl()).origin) {
      if (target.protocol === "https:" || target.protocol === "http:") void shell.openExternal(url)
      return { action: "deny" }
    }

    if (!target.pathname.startsWith("/present")) return { action: "allow" }

    // Already open: focus it and refuse to make a second one. Content
    // reaches `/present` through `localStorage` + `storage` events (the
    // console writes the live slide on every send, independently of this
    // call), so denying costs nothing — while allowing would spawn a window
    // at the *default* bounds and throw away the position and fullscreen
    // state the user just set up on the projector.
    if (outputWindow && !outputWindow.isDestroyed()) {
      if (outputWindow.isMinimized()) outputWindow.restore()
      outputWindow.focus()
      return { action: "deny" }
    }

    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        ...resolveOutputWindowBounds(),
        // `frame: false` left nothing to grab: no title bar and no drag
        // region means a window that cannot be moved at all. macOS keeps
        // the chrome-less look via `hiddenInset` (traffic lights and a
        // drag region, no title bar); elsewhere a normal frame is the only
        // thing that provides both. Fullscreen — the state that actually
        // gets projected — hides all of it either way.
        ...(process.platform === "darwin"
          ? { titleBarStyle: "hiddenInset" as const }
          : { frame: true, autoHideMenuBar: true }),
        resizable: true,
        movable: true,
        maximizable: true,
        fullscreenable: true,
        backgroundColor: "#000000",
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
        },
      },
    }
  })

  win.webContents.on("did-create-window", (childWindow, details) => {
    if (new URL(details.url).pathname.startsWith("/present")) trackOutputWindow(childWindow)
  })

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: "detach" })
  }
}

app.whenReady().then(async () => {
  // Packaged builds have no dev server to talk to, so the bundled SSR
  // output is started first and every window loads from it. Resolved once
  // here rather than per-window, so `activate` reuses the running server.
  if (app.isPackaged && process.env.BIBLETIME_WEB_URL === undefined) {
    try {
      resolvedWebUrl = await startBundledServer()
    } catch (error) {
      dialog.showErrorBox(
        "BibleTime couldn't start",
        `The bundled app server failed to start.\n\n${String(error)}`
      )
      app.quit()
      return
    }
  }

  await applyStoredProjectsDataDir()
  await loadOutputWindowBounds()

  registerAppInfoHandlers()
  registerUpdateHandlers()
  registerTemplateHandlers()
  registerTemplateMediaHandlers()
  registerBibleVersionDownloadHandlers()
  registerLibraryHandlers()
  registerProjectHandlers()
  registerSongHandlers()
  registerSongSearchHandlers()
  await ensureMediaCacheDir()
  registerMediaProtocolHandler()
  registerMediaSourceHandlers()
  registerMediaCacheHandlers()
  registerMediaConvertHandlers()
  registerGoogleSlidesHandlers()
  createWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
