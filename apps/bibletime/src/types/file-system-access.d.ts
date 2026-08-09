/**
 * The parts of the File System Access API the media library uses.
 *
 * TypeScript's bundled DOM library does not yet declare these, and they are
 * genuinely absent in Safari and Firefox — which is the whole reason the
 * media driver feature-detects `showDirectoryPicker` and falls back to a
 * flat file stash (see `enable-media-tab-on-web` design decision 3).
 *
 * Declared narrowly rather than pulling in a `@types` package: this is the
 * exact surface used, and a wider declaration would let code compile
 * against methods the fallback path cannot provide.
 */

type FileSystemPermissionMode = "read" | "readwrite"

interface FileSystemHandlePermissionDescriptor {
  mode?: FileSystemPermissionMode
}

interface FileSystemHandle {
  /** Whether two handles point at the same directory — how a duplicate root is detected. */
  isSameEntry: (other: FileSystemHandle) => Promise<boolean>
  queryPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<"granted" | "denied" | "prompt">
  /** Must be called from a user gesture; the browser rejects it otherwise. */
  requestPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<"granted" | "denied" | "prompt">
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  entries: () => AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
}

interface DirectoryPickerOptions {
  mode?: FileSystemPermissionMode
  /** Lets the browser reopen at the last folder chosen for this same id. */
  id?: string
}

interface Window {
  showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>
}
