import type { MediaRoot, MediaRootKind } from "@/modules/media/interfaces"

/**
 * One database for everything the browser build needs to remember about
 * media. `localStorage` — which every other web driver in this app uses —
 * is string-only and capped around 5 MB, so it can hold neither a directory
 * handle nor a stashed file (see `enable-media-tab-on-web` design
 * decision 4).
 */
const DATABASE_NAME = "bibletime-media"
const DATABASE_VERSION = 1

/** Roots and, for a directory root, the handle that is the only way back to the folder after a reload. */
const SOURCES_STORE = "sources"
/** Stashed `File` objects, for browsers with no directory picker. The bytes live here because nothing else holds them. */
const FILES_STORE = "files"
/** Starred references — global, not per-project, matching the desktop favorites list. */
const FAVORITES_STORE = "favorites"
/** Thumbnails and rendered document pages. The only store with a budget. */
const CACHE_STORE = "cache"

/**
 * How much derived data to keep. Unlike the desktop cache, which is bounded
 * only by the user's disk, this shares a finite origin quota with the rest
 * of the app — so it evicts rather than growing until the browser starts
 * refusing writes.
 */
export const CACHE_BUDGET_BYTES = 256 * 1024 * 1024

export interface StoredSource {
  root: MediaRoot
  kind: MediaRootKind
  /** Present for a `directory` root. Structured-cloneable, which is what makes persistence possible at all. */
  handle?: FileSystemDirectoryHandle
}

export interface StoredCacheEntry {
  /** `${contentKey}/${fileName}` — the key, denormalized so an eviction pass can read it without parsing. */
  key: string
  contentKey: string
  fileName: string
  blob: Blob
  bytes: number
  lastUsedAt: number
}

let database: Promise<IDBDatabase> | undefined

/** Whether this context can store anything at all. False during server rendering and in a hostile privacy mode. */
export const isMediaDbAvailable = (): boolean =>
  typeof indexedDB !== "undefined" && typeof window !== "undefined"

const openDatabase = (): Promise<IDBDatabase> => {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(SOURCES_STORE)) db.createObjectStore(SOURCES_STORE)
      if (!db.objectStoreNames.contains(FILES_STORE)) db.createObjectStore(FILES_STORE)
      if (!db.objectStoreNames.contains(FAVORITES_STORE)) db.createObjectStore(FAVORITES_STORE)
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const cache = db.createObjectStore(CACHE_STORE, { keyPath: "key" })
        // Listing a document's pages is a prefix query in every other
        // implementation; here it is an index lookup on the content key.
        cache.createIndex("contentKey", "contentKey", { unique: false })
        // The eviction pass walks this in ascending order, which is exactly
        // least-recently-used order.
        cache.createIndex("lastUsedAt", "lastUsedAt", { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Could not open the media database"))
  })

  return database
}

/** Promisifies one request. Every store helper below is built from this. */
const promisify = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Media database request failed"))
  })

const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> => {
  const db = await openDatabase()
  const transaction = db.transaction(storeName, mode)
  const result = await run(transaction.objectStore(storeName))

  // Resolving on the transaction rather than the request matters for
  // writes: a request can succeed and the transaction still abort (quota),
  // and the caller needs to hear about that.
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error("Media database transaction aborted"))
    transaction.onerror = () => reject(transaction.error ?? new Error("Media database transaction failed"))
  })

  return result
}

// ---------------------------------------------------------------- sources

export const readStoredSources = async (): Promise<StoredSource[]> =>
  withStore(SOURCES_STORE, "readonly", (store) => promisify(store.getAll() as IDBRequest<StoredSource[]>))

export const readStoredSource = async (rootId: string): Promise<StoredSource | undefined> =>
  withStore(SOURCES_STORE, "readonly", (store) =>
    promisify(store.get(rootId) as IDBRequest<StoredSource | undefined>)
  )

export const writeStoredSource = async (source: StoredSource): Promise<void> => {
  await withStore(SOURCES_STORE, "readwrite", (store) => promisify(store.put(source, source.root.id)))
}

export const deleteStoredSource = async (rootId: string): Promise<void> => {
  await withStore(SOURCES_STORE, "readwrite", (store) => promisify(store.delete(rootId)))
}

// ------------------------------------------------------------------ files

const fileKey = (rootId: string, relativePath: string): string => `${rootId}/${relativePath}`

export const readStashedFile = async (rootId: string, relativePath: string): Promise<File | undefined> =>
  withStore(FILES_STORE, "readonly", (store) =>
    promisify(store.get(fileKey(rootId, relativePath)) as IDBRequest<File | undefined>)
  )

export const writeStashedFile = async (rootId: string, relativePath: string, file: File): Promise<void> => {
  await withStore(FILES_STORE, "readwrite", (store) => promisify(store.put(file, fileKey(rootId, relativePath))))
}

/** Every stashed file for one root, as `[relativePath, file]`. Used to list a stash and to size it. */
export const readStashedFiles = async (rootId: string): Promise<[string, File][]> => {
  const prefix = `${rootId}/`
  return withStore(FILES_STORE, "readonly", async (store) => {
    const [keys, values] = await Promise.all([
      promisify(store.getAllKeys()),
      promisify(store.getAll() as IDBRequest<File[]>),
    ])

    // `getAllKeys` and `getAll` return the same store order, so index `i`
    // in one names the value at index `i` in the other.
    const entries: [string, File][] = []
    keys.forEach((key, index) => {
      const name = String(key)
      if (name.startsWith(prefix)) entries.push([name.slice(prefix.length), values[index]])
    })
    return entries
  })
}

export const deleteStashedFiles = async (rootId: string): Promise<void> => {
  const prefix = `${rootId}/`
  await withStore(FILES_STORE, "readwrite", async (store) => {
    const keys = await promisify(store.getAllKeys())
    await Promise.all(keys.filter((key) => String(key).startsWith(prefix)).map((key) => promisify(store.delete(key))))
  })
}

// -------------------------------------------------------------- favorites

export const readStoredFavorites = async (): Promise<string[]> =>
  withStore(FAVORITES_STORE, "readonly", (store) =>
    promisify(store.getAllKeys()).then((keys) => keys.map(String))
  )

export const writeStoredFavorite = async (reference: string, isFavorite: boolean): Promise<void> => {
  await withStore(FAVORITES_STORE, "readwrite", async (store) => {
    if (isFavorite) await promisify(store.put({ addedAt: Date.now() }, reference))
    else await promisify(store.delete(reference))
  })
}

/** Drops every favorite pointing into a root that is going away. */
export const deleteFavoritesForRoot = async (rootId: string): Promise<void> => {
  const prefix = `bibletime-file://${rootId}/`
  await withStore(FAVORITES_STORE, "readwrite", async (store) => {
    const keys = await promisify(store.getAllKeys())
    await Promise.all(keys.filter((key) => String(key).startsWith(prefix)).map((key) => promisify(store.delete(key))))
  })
}

// ------------------------------------------------------------------ cache

const cacheKey = (contentKey: string, fileName: string): string => `${contentKey}/${fileName}`

export const listCachedFiles = async (contentKey: string): Promise<string[]> =>
  withStore(CACHE_STORE, "readonly", (store) =>
    promisify(store.index("contentKey").getAll(contentKey) as IDBRequest<StoredCacheEntry[]>).then((entries) =>
      entries.map((entry) => entry.fileName)
    )
  )

/**
 * Reads one artifact and stamps it as used, so the eviction pass sees an
 * accurate ordering. The touch is fire-and-forget: a failed stamp costs a
 * slightly stale ordering, never the read.
 */
export const readCachedBlob = async (contentKey: string, fileName: string): Promise<Blob | undefined> => {
  const key = cacheKey(contentKey, fileName)
  const entry = await withStore(CACHE_STORE, "readonly", (store) =>
    promisify(store.get(key) as IDBRequest<StoredCacheEntry | undefined>)
  )
  if (!entry) return undefined

  void touchCacheEntry(key).catch(() => {})
  return entry.blob
}

const touchCacheEntry = async (key: string): Promise<void> => {
  await withStore(CACHE_STORE, "readwrite", async (store) => {
    const entry = await promisify(store.get(key) as IDBRequest<StoredCacheEntry | undefined>)
    if (entry) await promisify(store.put({ ...entry, lastUsedAt: Date.now() }))
  })
}

export const totalCachedBytes = async (): Promise<number> =>
  withStore(CACHE_STORE, "readonly", (store) =>
    promisify(store.getAll() as IDBRequest<StoredCacheEntry[]>).then((entries) =>
      entries.reduce((total, entry) => total + entry.bytes, 0)
    )
  )

export const clearCache = async (): Promise<void> => {
  await withStore(CACHE_STORE, "readwrite", (store) => promisify(store.clear()))
}

export const deleteCacheForContentKeys = async (contentKeys: Set<string>): Promise<void> => {
  if (contentKeys.size === 0) return
  await withStore(CACHE_STORE, "readwrite", async (store) => {
    const entries = await promisify(store.getAll() as IDBRequest<StoredCacheEntry[]>)
    await Promise.all(
      entries.filter((entry) => contentKeys.has(entry.contentKey)).map((entry) => promisify(store.delete(entry.key)))
    )
  })
}

/**
 * Picks what to drop to bring the cache back under budget.
 *
 * Split out as a pure function so the ordering can be tested without a
 * database: least-recently-used first, stopping as soon as enough has been
 * freed. Exported for that reason.
 */
export const selectEvictions = (
  entries: { key: string; bytes: number; lastUsedAt: number }[],
  bytesToFree: number
): string[] => {
  if (bytesToFree <= 0) return []

  const byAge = [...entries].sort((left, right) => left.lastUsedAt - right.lastUsedAt)
  const evicted: string[] = []
  let freed = 0

  for (const entry of byAge) {
    if (freed >= bytesToFree) break
    evicted.push(entry.key)
    freed += entry.bytes
  }

  return evicted
}

/** Evicts least-recently-used entries until the cache fits within `budget`. */
const evictToBudget = async (incomingBytes: number, budget: number): Promise<void> => {
  await withStore(CACHE_STORE, "readwrite", async (store) => {
    const entries = await promisify(store.getAll() as IDBRequest<StoredCacheEntry[]>)
    const used = entries.reduce((total, entry) => total + entry.bytes, 0)

    const keys = selectEvictions(entries, used + incomingBytes - budget)
    await Promise.all(keys.map((key) => promisify(store.delete(key))))
  })
}

/**
 * Writes one artifact, making room first and surviving a quota failure.
 *
 * Returns whether the write landed. A `false` is not an error the caller
 * should surface: the artifact was already rendered, and rendering it again
 * next time is a slower cache miss, not a broken preview (see design
 * decision 8).
 */
export const writeCachedBlob = async (contentKey: string, fileName: string, blob: Blob): Promise<boolean> => {
  const entry: StoredCacheEntry = {
    key: cacheKey(contentKey, fileName),
    contentKey,
    fileName,
    blob,
    bytes: blob.size,
    lastUsedAt: Date.now(),
  }

  const put = () => withStore(CACHE_STORE, "readwrite", (store) => promisify(store.put(entry)))

  try {
    await evictToBudget(entry.bytes, CACHE_BUDGET_BYTES)
    await put()
    return true
  } catch {
    // The browser refused the write despite the budget — its own quota is
    // exhausted, which the budget cannot predict. Free aggressively and try
    // once more before giving up on caching this artifact.
    try {
      await evictToBudget(entry.bytes, CACHE_BUDGET_BYTES / 2)
      await put()
      return true
    } catch {
      return false
    }
  }
}

/**
 * Asks the browser not to evict this origin's storage under pressure.
 *
 * Called once, when the first root is registered, rather than on load: a
 * user who never opens the Media tab has nothing worth persisting, and on
 * some browsers the request surfaces a prompt.
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
  // `navigator.storage` is typed as always present but is genuinely absent
  // in older Safari, so the missing-API case arrives here as a TypeError and
  // is caught alongside an outright refusal. Either way the answer is "not
  // persisted", and the caller treats that as informational.
  try {
    return (await navigator.storage.persisted()) || (await navigator.storage.persist())
  } catch {
    return false
  }
}

/** What the browser says this origin is using and may use. Both are `undefined` where unreported. */
export const readStorageEstimate = async (): Promise<{ usage?: number; quota?: number }> => {
  try {
    const { usage, quota } = await navigator.storage.estimate()
    return { usage, quota }
  } catch {
    return {}
  }
}
