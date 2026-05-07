/**
 * In-memory TTL cache for read-heavy API responses. Each warm serverless
 * instance keeps its own copy; that's fine — the goal is to absorb the
 * client's polling cadence (every few seconds) without re-querying Firestore.
 */
interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  const value = await fetcher();
  store.set(key, { value, expiresAt: now + ttlMs });
  // Cap size to avoid leaks across many cache keys.
  if (store.size > 200) {
    const first = store.keys().next().value;
    if (first !== undefined) store.delete(first);
  }
  return value;
}

export function invalidate(key: string): void {
  store.delete(key);
}
