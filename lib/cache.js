/**
 * Very small in-memory cache with TTL support.
 */
const store = new Map();

/**
 * Set a value with TTL.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs
 */
export function set(key, value, ttlMs) {
  const expiresAt = Date.now() + ttlMs;
  store.set(key, { value, expiresAt });
}

/**
 * Get a value if not expired.
 * @param {string} key
 * @returns {any|null}
 */
export function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

// Periodic cleanup to avoid memory leaks.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) {
      store.delete(key);
    }
  }
}, 60_000).unref();
