const N8N_BASE = (import.meta.env.VITE_N8N_BASE as string) || (import.meta.env.VITE_API_BASE as string);
const API_KEY = import.meta.env.VITE_API_KEY as string;
const PRODUCTS_URL = (import.meta.env.VITE_PRODUCTS_URL as string | undefined) || undefined;
const MAPPINGS_SAVE_URL = (import.meta.env.VITE_MAPPINGS_SAVE_URL as string | undefined) || undefined;
const MAPPING_SUGGEST_URL = (import.meta.env.VITE_MAPPING_SUGGEST_URL as string | undefined) || undefined;
const PRODUCTS_LOOKUP_URL = (import.meta.env.VITE_PRODUCTS_LOOKUP_URL as string | undefined) || undefined;

type HttpMethod = 'GET' | 'POST';

export class HttpError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: { method?: HttpMethod; query?: Record<string, string | number | boolean | undefined>; body?: unknown; signal?: AbortSignal }
): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${N8N_BASE}${path}`);
  const { method = 'GET', query, body, signal } = options || {};
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    signal,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  let data: unknown;
  if (isJson) {
    data = await res.json().catch(() => ({}));
  } else {
    const text = await res.text();
    try {
      // Support APIs returning JSON with content-type text/plain
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new HttpError(`HTTP ${res.status}`, res.status, data);
  }

  return data as T;
}

export const Api = {
  health: async () => {
    const res: any = await apiFetch<any>(`/health`);
    // Normalise différentes formes n8n
    if (res?.status) {
      return { status: res.status, db: res.db || res.mongo, last_run: res.last_run } as { status: string; db?: string; last_run?: unknown };
    }
    if (Array.isArray(res) && res[0]) {
      const f = res[0];
      return { status: f.status, db: f.db || f.mongo, last_run: f.last_run } as { status: string; db?: string; last_run?: unknown };
    }
    if (res?.["object Object"] && Array.isArray(res["object Object"])) {
      const f = res["object Object"][0] || {};
      return { status: f.status, db: f.db || f.mongo, last_run: f.last_run } as { status: string; db?: string; last_run?: unknown };
    }
    if (res?.["="]?.["object Object"] && Array.isArray(res["="]["object Object"])) {
      const f = res["="]["object Object"][0] || {};
      return { status: f.status, db: f.db || f.mongo, last_run: f.last_run } as { status: string; db?: string; last_run?: unknown };
    }
    return { status: 'unknown' } as { status: string };
  },
  runs: async (params: { tenant: string; type?: string; limit?: number }) => {
    const res: any = await apiFetch<any>(`/runs`, { query: params });
    // Normalize various shapes coming from n8n
    if (Array.isArray(res)) return res;
    if (res?.items && Array.isArray(res.items)) return res.items;
    if (res?.["="]?.["object Object"] && Array.isArray(res["="]["object Object"])) {
      const first = res["="]["object Object"][0];
      if (first?.items && Array.isArray(first.items)) return first.items;
    }
    return [] as any[];
  },
  mappingsSave: (payload: { tenant: string; status?: 'draft' | 'active'; version?: string; schema?: string; mappings: Record<string, string>; transforms?: Record<string, unknown> }) =>
    apiFetch<{ ok: boolean; id?: string }>(MAPPINGS_SAVE_URL || `/mappings/save`, { method: 'POST', body: payload }),
  mappingSuggest: (payload: { tenant: string; source_fields: Array<{ name: string; type: string; sample_values?: unknown[] }>; unified_schema: Array<{ id: string; label: string; type: string; required?: boolean; description?: string }>; locale?: string }) =>
    apiFetch<{ suggestions: Array<{ source: string; target: string; confidence: number; reasons?: string[] }>; transforms?: Record<string, unknown> }>(MAPPING_SUGGEST_URL || `/mapping/suggest`, { method: 'POST', body: payload }),
  products: async (params: { tenant: string; q?: string; page?: number; limit?: number; in_stock?: boolean; category?: string }) => {
    const target = PRODUCTS_URL || `/products`;
    const res: any = await apiFetch<any>(target, { query: params });
    if (Array.isArray(res)) return { items: res };
    if (res?.items && Array.isArray(res.items)) return { items: res.items, total: res.total };
    if (res?.["object Object"] && Array.isArray(res["object Object"])) {
      const first = res["object Object"][0];
      if (first?.items && Array.isArray(first.items)) return { items: first.items, total: first.total };
    }
    if (res?.["="]?.["object Object"] && Array.isArray(res["="]["object Object"])) {
      const first = res["="]["object Object"][0];
      if (first?.items && Array.isArray(first.items)) return { items: first.items, total: first.total };
    }
    return { items: [] };
  },
  productsLookup: async (payload: { tenant: string; ids: string[] }) => {
    const target = PRODUCTS_LOOKUP_URL || `/products/lookup`;
    const res: any = await apiFetch<any>(target, { method: 'POST', body: payload });
    // formats possibles: { items: [{ product_id, name, image_url, ... }] } OU tableau direct
    if (Array.isArray(res)) return res;
    if (res?.items && Array.isArray(res.items)) return res.items;
    if (res?.["object Object"] && Array.isArray(res["object Object"])) {
      const first = res["object Object"][0];
      if (first?.items && Array.isArray(first.items)) return first.items;
    }
    if (res?.["="]?.["object Object"] && Array.isArray(res["="]["object Object"])) {
      const first = res["="]["object Object"][0];
      if (first?.items && Array.isArray(first.items)) return first.items;
    }
    return [] as any[];
  },
  ingestStart: (payload: { tenant: string; feed_url?: string; feed_inline?: unknown; feed_type: string; batch_size?: number; dry_run?: boolean }) =>
    apiFetch<{ ok: boolean; run: { id: string; status: string; counts?: unknown } }>(`/ingest/start`, { method: 'POST', body: payload }),
  recommendations: (params: { tenant: string; product_id: string; kind?: string; limit?: number }) =>
    apiFetch<{ items: Array<{ product_id: string; score: number; meta?: unknown }> }>(`/recommendations`, { query: params }),
  recommendationsRefresh: (payload: { tenant: string; product_id: string; kind?: string; limit?: number }) =>
    apiFetch<{ items: unknown[]; cached_at?: string; rules?: unknown }>(`/recommendations/refresh`, { method: 'POST', body: payload }),
  recommendationsPreview: (params: { tenant: string; product_id: string; kind?: string; limit?: number }) =>
    apiFetch<{ product_id: string; kind: string; rules?: unknown; items: Array<{ product_id: string; score: number }> }>(`/recommendations/preview`, { query: params }),
};

export const DEFAULT_TENANT = (import.meta.env.VITE_DEFAULT_TENANT as string) || 'la_redoute';

