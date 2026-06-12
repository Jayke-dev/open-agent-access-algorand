export interface ReplayStore {
  has(key: string): Promise<boolean> | boolean;
  set(key: string, ttlMs: number): Promise<void> | void;
}

export function createMemoryReplayStore(options: { maxEntries?: number } = {}): ReplayStore {
  const entries = new Map<string, number>();

  function evict() {
    const now = Date.now();
    for (const [key, expiresAt] of entries) {
      if (expiresAt <= now) {
        entries.delete(key);
      }
    }
    const maxEntries = options.maxEntries ?? 10_000;
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value as string | undefined;
      if (!oldest) break;
      entries.delete(oldest);
    }
  }

  return {
    has(key: string) {
      evict();
      return entries.has(key);
    },
    set(key: string, ttlMs: number) {
      evict();
      entries.set(key, Date.now() + ttlMs);
    }
  };
}
