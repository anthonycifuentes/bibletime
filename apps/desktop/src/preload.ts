import { contextBridge } from "electron"

contextBridge.exposeInMainWorld("bibletime", {
  versions: process.versions,
})
