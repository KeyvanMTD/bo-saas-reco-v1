export const API_BASE = import.meta.env.VITE_API_BASE as string;
export const API_VERSION = (import.meta.env.VITE_API_VERSION as string) || "v1";
export const DEFAULT_TENANT = (import.meta.env.VITE_DEFAULT_TENANT as string) || "la_redoute";

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`${name} manquant (check .env.local)`);
  return v;
}
must(API_BASE, "VITE_API_BASE");

async function apiGet<T>(path: string, opts?: { headers?: Record<string, string> }): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Version": API_VERSION,
      "Content-Type": "application/json",
      ...(opts?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path} -> ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export type RecoItem = {
  product_id: string;
  score?: number; // 0..1
  why?: string[];
  meta?: {
    name?: string;
    image_url?: string;
    brand?: string;
    current_price?: number;
    currency?: string;
    [key: string]: unknown;
  };
};
export type RecoResponse = {
  source_product_id: string;
  items: RecoItem[];
  count: number;
  rationale?: string | null;
  [key: string]: unknown;
};

export function fetchSimilar(productId: string, limit: number) {
  return apiGet<RecoResponse>(`/products/${encodeURIComponent(productId)}/similar?limit=${limit}`);
}
export function fetchComplementary(productId: string, limit: number) {
  return apiGet<RecoResponse>(`/products/${encodeURIComponent(productId)}/complementary?limit=${limit}`);
}
export function fetchXSell(productId: string, limit: number) {
  return apiGet<RecoResponse>(`/products/${encodeURIComponent(productId)}/x-sell?limit=${limit}`);
}

export async function getRecommendations(args: {
  baseUrl?: string;
  tenant?: string;
  productId: string;
  kind: "similar" | "complementary" | "x-sell";
  limit: number;
}): Promise<RecoResponse> {
  const base = args.baseUrl || API_BASE;
  const tenant = args.tenant || DEFAULT_TENANT;
  const path = `/products/${encodeURIComponent(args.productId)}/${args.kind}?limit=${args.limit}&tenant=${encodeURIComponent(tenant)}`;
  // Utilise l'entête X-Tenant en plus de la query pour compatibilité serveur
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: {
      "X-API-Version": API_VERSION,
      "Content-Type": "application/json",
      "X-Tenant": tenant,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path} -> ${res.status} ${text}`);
  }
  return (await res.json()) as RecoResponse;
}


