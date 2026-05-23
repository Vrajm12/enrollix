type CachedSummary = {
  expiresAt: number;
  value: unknown;
};

const CACHE_TTL_MS = 30_000;
const summaryCache = new Map<number, CachedSummary>();

export const getDashboardSummaryCache = <T>(tenantId: number): T | null => {
  const cached = summaryCache.get(tenantId);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    summaryCache.delete(tenantId);
    return null;
  }
  return cached.value as T;
};

export const setDashboardSummaryCache = <T>(tenantId: number, value: T) => {
  summaryCache.set(tenantId, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
};

export const invalidateDashboardSummaryCache = (tenantId: number) => {
  summaryCache.delete(tenantId);
};

