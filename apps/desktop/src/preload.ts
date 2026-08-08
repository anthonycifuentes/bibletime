import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("bibletime", {
  versions: process.versions,
  appVersion: ipcRenderer.sendSync("app:get-version") as string,
  templates: {
    list: () => ipcRenderer.invoke("templates:list"),
    save: (template: unknown) => ipcRenderer.invoke("templates:save", template),
    remove: (id: string) => ipcRenderer.invoke("templates:remove", id),
  },
  templateMedia: {
    save: (buffer: ArrayBuffer, extension: string) => ipcRenderer.invoke("template-media:save", buffer, extension),
    remove: (reference: string) => ipcRenderer.invoke("template-media:remove", reference),
  },
  bibleVersionDownloads: {
    list: () => ipcRenderer.invoke("bible-version-downloads:list"),
    download: (entry: unknown) => ipcRenderer.invoke("bible-version-downloads:download", entry),
    read: (versionId: number) => ipcRenderer.invoke("bible-version-downloads:read", versionId),
    remove: (versionId: number) => ipcRenderer.invoke("bible-version-downloads:remove", versionId),
  },
  library: {
    list: () => ipcRenderer.invoke("library:list"),
    save: (folder: unknown) => ipcRenderer.invoke("library:save", folder),
    remove: (id: string) => ipcRenderer.invoke("library:remove", id),
  },
  songs: {
    list: () => ipcRenderer.invoke("songs:list"),
    save: (song: unknown) => ipcRenderer.invoke("songs:save", song),
    remove: (id: string) => ipcRenderer.invoke("songs:remove", id),
  },
  songSearch: {
    query: (query: string) => ipcRenderer.invoke("song-search:query", query),
  },
  project: {
    list: () => ipcRenderer.invoke("project:list"),
    save: (project: unknown) => ipcRenderer.invoke("project:save", project),
    remove: (id: string) => ipcRenderer.invoke("project:remove", id),
    openFileDialog: () =>
      ipcRenderer.invoke("project:openFileDialog") as Promise<{ path: string; contents: string } | null>,
    saveFileDialog: (defaultPath: string, contents: string) =>
      ipcRenderer.invoke("project:saveFileDialog", defaultPath, contents) as Promise<
        { canceled: true } | { canceled: false; ok: true; path: string } | { canceled: false; ok: false; error: string }
      >,
    saveToPath: (filePath: string, contents: string) =>
      ipcRenderer.invoke("project:saveToPath", filePath, contents) as Promise<
        { ok: true; path: string } | { ok: false; error: string }
      >,
  },
  media: {
    listRoots: () => ipcRenderer.invoke("media:listRoots"),
    addRoot: () => ipcRenderer.invoke("media:addRoot"),
    addRootByPath: (directoryPath: string) => ipcRenderer.invoke("media:addRootByPath", directoryPath),
    removeRoot: (rootId: string) => ipcRenderer.invoke("media:removeRoot", rootId),
    relocateRoot: (rootId: string) => ipcRenderer.invoke("media:relocateRoot", rootId),
    listFavorites: () => ipcRenderer.invoke("media:listFavorites"),
    setFavorite: (reference: string, isFavorite: boolean) =>
      ipcRenderer.invoke("media:setFavorite", reference, isFavorite),
    listDirectory: (rootId: string, relativePath: string) =>
      ipcRenderer.invoke("media:listDirectory", rootId, relativePath),
    statFile: (reference: string) => ipcRenderer.invoke("media:statFile", reference),
    revealInFolder: (reference: string) => ipcRenderer.invoke("media:revealInFolder", reference),
    relinkFileDialog: (filters: unknown) => ipcRenderer.invoke("media:relinkFileDialog", filters),
  },
  mediaCache: {
    list: (contentKey: string) => ipcRenderer.invoke("media-cache:list", contentKey),
    write: (contentKey: string, fileName: string, buffer: ArrayBuffer) =>
      ipcRenderer.invoke("media-cache:write", contentKey, fileName, buffer),
    size: () => ipcRenderer.invoke("media-cache:size"),
    clear: () => ipcRenderer.invoke("media-cache:clear"),
  },
  mediaConvert: {
    probeLibreOffice: () => ipcRenderer.invoke("media-convert:probeLibreOffice"),
    toPdf: (contentKey: string, reference: string) =>
      ipcRenderer.invoke("media-convert:toPdf", contentKey, reference),
    cancel: (contentKey: string) => ipcRenderer.invoke("media-convert:cancel", contentKey),
  },
  googleSlides: {
    export: (url: string, contentKey: string) => ipcRenderer.invoke("google-slides:export", url, contentKey),
  },
  projectSettings: {
    get: () => ipcRenderer.invoke("project-settings:get") as Promise<{ path: string; isDefault: boolean }>,
    choose: () =>
      ipcRenderer.invoke("project-settings:choose") as Promise<{ path: string; isDefault: boolean } | null>,
    resetToDefault: () =>
      ipcRenderer.invoke("project-settings:resetToDefault") as Promise<{ path: string; isDefault: boolean }>,
  },
})
