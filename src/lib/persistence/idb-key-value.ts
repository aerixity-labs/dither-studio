/**
 * The smallest IndexedDB key-value wrapper this app needs, so persistence costs
 * no dependency.
 *
 * Every method resolves rather than rejects. Persistence here is a convenience:
 * a browser that refuses to store anything – private-window Safari, Firefox with
 * cookies blocked, a full disk – must degrade to the pre-persistence behaviour
 * silently, never surface an error the user did not ask for.
 */

type KeyValueStore = {
  /** `false` when the write did not land. */
  set: (key: string, value: unknown) => Promise<boolean>
  remove: (key: string) => Promise<void>
  /** Every stored value; `[]` on any failure. Used for housekeeping sweeps. */
  values: <T>() => Promise<T[]>
}

export function createIdbStore(databaseName: string, storeName: string): KeyValueStore {
  /**
   * Cached so a browser that cannot open IndexedDB at all pays the failure once
   * instead of on every call. Reset when the connection dies so a later call can
   * reopen rather than throwing `InvalidStateError` forever.
   */
  let connection: Promise<IDBDatabase | null> | null = null

  function open(): Promise<IDBDatabase | null> {
    return new Promise(function attempt(resolve) {
      if (typeof indexedDB === 'undefined') {
        resolve(null)
        return
      }

      let request: IDBOpenDBRequest

      try {
        request = indexedDB.open(databaseName, 1)
      } catch {
        /** Firefox throws outright rather than erroring when storage is denied. */
        resolve(null)
        return
      }

      request.addEventListener('upgradeneeded', function createStore() {
        const database = request.result
        if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName)
      })

      request.addEventListener('success', function adopt() {
        const database = request.result

        function forget() {
          connection = null
        }

        database.addEventListener('close', forget)
        database.addEventListener('versionchange', function closeForUpgrade() {
          database.close()
          forget()
        })

        resolve(database)
      })

      request.addEventListener('error', function giveUp() {
        resolve(null)
      })

      /** Another tab holds an older version open; do not hang waiting on it. */
      request.addEventListener('blocked', function giveUp() {
        resolve(null)
      })
    })
  }

  function connect() {
    connection ??= open()
    return connection
  }

  async function withStore<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T | null> {
    const database = await connect()
    if (!database) return null

    return new Promise(function settle(resolve) {
      let request: IDBRequest

      try {
        const transaction = database.transaction(storeName, mode)
        transaction.addEventListener('abort', function giveUp() {
          resolve(null)
        })
        request = run(transaction.objectStore(storeName))
      } catch {
        connection = null
        resolve(null)
        return
      }

      request.addEventListener('success', function adopt() {
        resolve(request.result as T)
      })
      request.addEventListener('error', function giveUp() {
        resolve(null)
      })
    })
  }

  return {
    async set(key: string, value: unknown) {
      const result = await withStore<IDBValidKey>('readwrite', function write(store) {
        return store.put(value, key)
      })
      return result !== null
    },

    async remove(key: string) {
      await withStore('readwrite', function drop(store) {
        return store.delete(key)
      })
    },

    async values<T>() {
      /** Blobs come back as disk-backed references, so a full read stays cheap. */
      const result = await withStore<T[]>('readonly', function readAll(store) {
        return store.getAll()
      })
      return result ?? []
    },
  }
}
