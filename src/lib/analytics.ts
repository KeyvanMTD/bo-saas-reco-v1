const API_BASE = import.meta.env.VITE_API_BASE as string;

async function fetchAnalytics<T>(path: string, query?: Record<string, any>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export type RangeParams = {
  tenant: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  window_days?: number;
};

export const AnalyticsApi = {
  topViewed: (p: RangeParams) => fetchAnalytics<{ items: any[]; meta: any }>(`/analytics/top-viewed`, p),
  topSales: (p: RangeParams) => fetchAnalytics<{ items: any[]; meta: any }>(`/analytics/top-sales`, p),
  trending: (p: RangeParams) => fetchAnalytics<{ items: any[]; meta: any }>(`/analytics/trending`, p),
  viewsDaily: (p: RangeParams) => fetchAnalytics<{ items: Array<{ date: string; views: number }>; meta: any }>(`/analytics/views-daily`, p),
  brandShare: (p: RangeParams) => fetchAnalytics<{ items: Array<{ key: string; count: number; share: number }>; meta: any }>(`/analytics/brand-share`, p),
  categoryShare: (p: RangeParams) => fetchAnalytics<{ items: Array<{ key: string; count: number; share: number }>; meta: any }>(`/analytics/category-share`, p),
  runsStats: (p: RangeParams) => fetchAnalytics<{ items: Array<{ date: string; total: number; ok: number; failed: number }>; meta: any }>(`/analytics/runs-stats`, p),
};


