import { RuleSchema, RuleCreateInputSchema, PreviewResponseSchema } from '@/schemas/rules';

const N8N = (import.meta.env.NEXT_PUBLIC_N8N_BASE_URL as string) || (import.meta.env.VITE_N8N_BASE as string) || '';
const USE_MOCKS = ((import.meta.env.NEXT_PUBLIC_USE_MOCKS as string) === 'true') || !N8N;
const TENANT = 'la_redoute';

async function json<T>(res: Response): Promise<T> {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { throw new Error(`Invalid JSON: ${txt}`); }
}

export async function listRules(params: { mode?: string; kind?: string; q?: string; page?: number; page_size?: number }) {
  const mock = () => {
    const now = new Date().toISOString();
    const mocks = [
      // 1) No OOS — contrainte dure globale
      RuleSchema.parse({
        _id: 'rl_no_oos_global', tenant: 'la_redoute', name: 'Ne pas recommander hors stock',
        description: 'Filtrer tout produit out_of_stock', mode: 'active', priority: 100,
        kind_scope: ['similar','complementary','x-sell'],
        constraints: { include_only: { in_stock: true } }, overrides: { pins: [], blocklist: [] },
        created_at: now, updated_at: now, created_by: 'keyvan', labels: ['merch','quality'],
      }),
      // 2) Pin top seller en complementary Running Homme
      RuleSchema.parse({
        _id: 'rl_pin_running_top', tenant: 'la_redoute', name: 'PIN - Top seller Running Homme',
        description: 'Toujours en tête sur complementary Running', mode: 'active', priority: 90,
        kind_scope: ['complementary'], target: { category_path: ['Homme/Chaussures/Running'] },
        overrides: { pins: ['prod_abc123','prod_def456'], blocklist: [] },
        created_at: now, updated_at: now, created_by: 'keyvan', labels: ['merch','pin'],
      }),
      // 3) Boost Nike en complementary
      RuleSchema.parse({
        _id: 'rl_boost_nike_comp', tenant: 'la_redoute', name: 'Boost Nike (complementary)',
        description: '+15 de score si brand=Nike et +5 si stock>=10', mode: 'active', priority: 80,
        kind_scope: ['complementary'],
        ranking: { boosts: [ { field:'brand', op:'eq', value:'Nike', weight:15 }, { field:'stock', op:'gte', value:10, weight:5 } ], penalties: [] },
        overrides: { pins: [], blocklist: [] }, created_at: now, updated_at: now, created_by: 'keyvan', labels: ['boost','nike'],
      }),
      // 4) Blocklist vendor (market_bad)
      RuleSchema.parse({
        _id: 'rl_block_vendor_market_bad', tenant: 'la_redoute', name: 'Blocklist vendor market_bad',
        description: 'Exclure un vendeur problématique', mode: 'active', priority: 85,
        constraints: { exclude: { vendors: ['market_bad'], brands: [], categories: [], product_ids: [] } },
        overrides: { pins: [], blocklist: [] }, created_at: now, updated_at: now, created_by: 'keyvan', labels: ['quality','compliance'],
      }),
      // 5) Diversité par brand (cap à 2 par marque)
      RuleSchema.parse({
        _id: 'rl_diversity_brand_cap2', tenant: 'la_redoute', name: 'Diversité par marque (max 2)',
        description: 'Limiter à 2 produits par marque', mode: 'active', priority: 70,
        diversity: { by: 'brand', max_per_group: 2 }, overrides: { pins: [], blocklist: [] },
        created_at: now, updated_at: now, created_by: 'keyvan', labels: ['diversity'],
      }),
    ];

    // minimal filtering in mocks
    const filtered = mocks.filter(r => (params.mode && params.mode !== 'all' ? r.mode === params.mode : true))
      .filter(r => (params.kind && params.kind !== 'all' ? (r.kind_scope || ['similar','complementary','x-sell']).includes(params.kind as any) : true))
      .filter(r => (params.q ? (r.name.toLowerCase().includes(String(params.q).toLowerCase()) || (r.labels||[]).join(',').includes(String(params.q))) : true));
    const page = params.page || 1; const page_size = params.page_size || 20;
    const start = (page - 1) * page_size; const end = start + page_size;
    return { items: filtered.slice(start, end), total: filtered.length, page, page_size };
  };
  if (USE_MOCKS) return mock();
  const u = new URL(`${N8N}/webhook/api/rules/list`);
  u.searchParams.set('tenant', TENANT);
  Object.entries({ mode: 'all', kind: 'all', q: '', page: 1, page_size: 20, ...params }).forEach(([k,v])=>u.searchParams.set(k, String(v)));
  try {
    const res = await fetch(u.toString(), { method: 'GET' });
    if (!res.ok) throw new Error(`rules/list ${res.status}`);
    const data = await json<any>(res);
    if (data?.items) data.items = data.items.map((r: any)=>RuleSchema.parse(r));
    return data as { items: any[]; total: number; page: number; page_size: number };
  } catch {
    return mock();
  }
}

export async function createRule(input: any) {
  const body = RuleCreateInputSchema.parse({ ...input, tenant: TENANT });
  if (USE_MOCKS) return { _id: crypto.randomUUID(), ...body, mode: 'draft' };
  const res = await fetch(`${N8N}/webhook/api/rules/create`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`rules/create ${res.status}`);
  return RuleSchema.parse(await json<any>(res));
}

export async function updateRule(id: string, patch: any) {
  if (USE_MOCKS) return { _id: id, ...patch };
  const res = await fetch(`${N8N}/webhook/api/rules/${id}`, { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(`rules/update ${res.status}`);
  return RuleSchema.parse(await json<any>(res));
}

export async function deleteRule(id: string) {
  if (USE_MOCKS) return { ok: true };
  const res = await fetch(`${N8N}/webhook/api/rules/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`rules/delete ${res.status}`);
  return { ok: true };
}

export async function previewRule(body: { product_id: string; kind: 'similar'|'complementary'|'x-sell'; rule_id?: string }) {
  const payload = { tenant: TENANT, ...body };
  if (USE_MOCKS) return PreviewResponseSchema.parse({ before: [], after: [], diffs: [] });
  const res = await fetch(`${N8N}/webhook/api/rules/preview`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`rules/preview ${res.status}`);
  return PreviewResponseSchema.parse(await json<any>(res));
}


