const cacheStore = new Map();

function getNow() {
  return Date.now();
}

function getEntry(key) {
  const safeKey = String(key || "").trim();
  if (!safeKey) {
    throw new Error("cache key is required.");
  }

  if (!cacheStore.has(safeKey)) {
    cacheStore.set(safeKey, {
      data: undefined,
      error: null,
      expiresAt: 0,
      inflight: null,
      listeners: new Set(),
      updatedAt: 0,
    });
  }

  return cacheStore.get(safeKey);
}

function notify(entry) {
  entry.listeners.forEach((listener) => {
    try {
      listener(entry.data, entry.error);
    } catch {
      // Listener errors must not break cache updates.
    }
  });
}

async function runFetch(entry, fetcher, ttlMs) {
  const requestPromise = Promise.resolve()
    .then(() => fetcher())
    .then((result) => {
      entry.data = result;
      entry.error = null;
      entry.expiresAt = getNow() + Math.max(0, Number(ttlMs) || 0);
      entry.updatedAt = getNow();
      notify(entry);
      return result;
    })
    .catch((error) => {
      entry.error = error;
      notify(entry);
      throw error;
    })
    .finally(() => {
      entry.inflight = null;
    });

  entry.inflight = requestPromise;
  return requestPromise;
}

export function readCachedData(key) {
  const entry = getEntry(key);
  return entry.data;
}

export function subscribeCache(key, listener) {
  const entry = getEntry(key);
  entry.listeners.add(listener);

  return () => {
    entry.listeners.delete(listener);
  };
}

export function invalidateCache(keyPrefix = "") {
  const safePrefix = String(keyPrefix || "");

  if (!safePrefix) {
    cacheStore.clear();
    return;
  }

  Array.from(cacheStore.keys())
    .filter((key) => key.startsWith(safePrefix))
    .forEach((key) => {
      cacheStore.delete(key);
    });
}

export async function cachedResource(key, fetcher, options = {}) {
  const {
    ttlMs = 300000,
    force = false,
    swr = false,
  } = options;
  const entry = getEntry(key);
  const now = getNow();
  const hasData = typeof entry.data !== "undefined";
  const isFresh = hasData && entry.expiresAt > now;

  if (!force && isFresh) {
    return entry.data;
  }

  if (entry.inflight) {
    if (hasData && swr) {
      return entry.data;
    }

    return entry.inflight;
  }

  if (!force && hasData && swr) {
    void runFetch(entry, fetcher, ttlMs);
    return entry.data;
  }

  return runFetch(entry, fetcher, ttlMs);
}

export async function prefetchResource(key, fetcher, options = {}) {
  await cachedResource(key, fetcher, {
    ...options,
    swr: false,
  });
}
