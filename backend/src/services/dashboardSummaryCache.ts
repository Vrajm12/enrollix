type CachedSummary = {
  expiresAt: number;
  value: unknown;
};

const CACHE_TTL_MS = 30_000;
const summaryCache = new Map<string, CachedSummary>();

export const getDashboardSummaryCache = <T>(cacheKey: string): T | null => {
  const cached = summaryCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    summaryCache.delete(cacheKey);
    return null;
  }
  return cached.value as T;
};

export const setDashboardSummaryCache = <T>(cacheKey: string, value: T) => {
  summaryCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
};

export const invalidateDashboardSummaryCache = (tenantId: number) => {
  const prefix = `${tenantId}:`;
  Array.from(summaryCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) {
      summaryCache.delete(key);
    }
  });
};
