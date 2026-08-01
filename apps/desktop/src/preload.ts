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
  project: {
    list: () => ipcRenderer.invoke("project:list"),
    save: (project: unknown) => ipcRenderer.invoke("project:save", project),
    remove: (id: string) => ipcRenderer.invoke("project:remove", id),
  },
})
