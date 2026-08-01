import type { BibleVersionDownloadDriver } from "@/modules/bible/interfaces"

/** Web build: no persistent local storage — every translation is streamed, never downloaded. */
export const webBibleVersionDownloads: BibleVersionDownloadDriver = {
  canDownload: false,
  list: async () => [],
  download: async () => {
    throw new Error("Descargar versiones para uso sin conexión no está disponible en la versión web.")
  },
  read: async () => {
    throw new Error("Esta versión no está descargada localmente.")
  },
  remove: async () => {
    throw new Error("Eliminar versiones descargadas no está disponible en la versión web.")
  },
}
