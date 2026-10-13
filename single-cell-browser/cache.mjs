// Only the public, projected embedding is persisted. No donor metadata or cell IDs.
const DB = 'pankgraph-public-atlas-v2';
const TTL = 24 * 60 * 60 * 1000;
async function access(mode, action) {
  if (!globalThis.indexedDB) return undefined;
  return new Promise(resolve => {
    let db; let finished = false;
    const finish = value => { if (finished) return; finished = true; clearTimeout(timer); db?.close(); resolve(value); };
    const timer = setTimeout(() => finish(undefined), 2500);
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('atlas');
    request.onerror = () => finish(undefined);
    request.onblocked = () => finish(undefined);
    request.onsuccess = () => {
      db = request.result;
      if (finished) { db.close(); return; }
      try {
        const tx = db.transaction('atlas', mode); const operation = action(tx.objectStore('atlas'));
        tx.oncomplete = () => finish(operation.result);
        tx.onerror = tx.onabort = () => finish(undefined);
      } catch { finish(undefined); }
    };
  });
}
export const atlasCache = {
  async get(key) { const entry = await access('readonly', store => store.get(key)); return entry && Date.now() - entry.savedAt < TTL ? entry.value : undefined; },
  set(key, value) { return access('readwrite', store => store.put({ savedAt: Date.now(), value }, key)); },
  clear(key) { return access('readwrite', store => store.delete(key)); },
};
