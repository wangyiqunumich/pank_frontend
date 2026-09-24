// Browser persistence is optional. Keep same-page state when storage is denied or full.
export function createSafeStorage(names) {
  const memory = new Map();
  const overrides = new Map();
  const stores = () => names.map(name => { try { return typeof window === 'undefined' ? null : window[name]; } catch (_) { return null; } });
  const keys = () => {
    const found = new Set(overrides.keys());
    let readable = false;
    for (const store of stores()) {
      try { if (!store) continue; for (let i = 0; i < store.length; i += 1) found.add(store.key(i)); readable = true; break; } catch (_) { /* Try the next optional store. */ }
    }
    if (!readable) memory.forEach((_, key) => found.add(key));
    return [...found].filter(key => key !== null && adapter.getItem(key) !== null);
  };
  const adapter = {
    getItem(key) {
      if (overrides.has(key)) return overrides.get(key);
      for (const store of stores()) {
        try { if (!store) continue; const value = store.getItem(key); if (value === null) memory.delete(key); else memory.set(key, value); return value; } catch (_) { /* Try the next optional store. */ }
      }
      return memory.get(key) ?? null;
    },
    setItem(key, value) {
      const string = String(value); memory.set(key, string);
      const candidates = stores();
      for (let i = 0; i < candidates.length; i += 1) {
        try { if (!candidates[i]) continue; candidates[i].setItem(key, string); if (i === 0) overrides.delete(key); else overrides.set(key, string); return; } catch (_) { /* Preserve writes in memory if persistence fails. */ }
      }
      overrides.set(key, string);
    },
    removeItem(key) {
      memory.delete(key); overrides.set(key, null);
      let primaryRemoved = false;
      stores().forEach((store, i) => { try { if (store) { store.removeItem(key); if (i === 0) primaryRemoved = true; } } catch (_) { /* Optional. */ } });
      if (primaryRemoved) overrides.delete(key);
    },
    key(index) { return keys()[index] ?? null; },
    get length() { return keys().length; },
  };
  return adapter;
}

export const safeLocalStorage = createSafeStorage(['localStorage', 'sessionStorage']);
export const safeSessionStorage = createSafeStorage(['sessionStorage']);
