import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalyticsApi } from '@/lib/analytics';
import { DEFAULT_TENANT } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/ProductCard';
// Charts neutralisés pour l'instant (en attente d'APIs n8n)
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Hero from '@/components/Hero';

export default function Performance() {
  const [tenant, setTenant] = useState<string>(() => localStorage.getItem('perf:tenant') || DEFAULT_TENANT || 'la_redoute');
  const [dateFrom, setDateFrom] = useState<string>(() => localStorage.getItem('perf:from') || '');
  const [dateTo, setDateTo] = useState<string>(() => localStorage.getItem('perf:to') || '');

  useEffect(() => {
    localStorage.setItem('perf:tenant', tenant);
    localStorage.setItem('perf:from', dateFrom);
    localStorage.setItem('perf:to', dateTo);
  }, [tenant, dateFrom, dateTo]);

  const params = { tenant, date_from: dateFrom || undefined, date_to: dateTo || undefined, limit: 10 };

  // Webhooks n8n pour Top Seen et Top Sales
  const leaderboardQ = useQuery({
    queryKey: ['perf','leaderboard', params],
    queryFn: async () => {
      const limit = String(params.limit || 10);
      const q = new URLSearchParams({
        tenant: tenant,
        limit,
      });
      if (dateFrom) q.set('date_from', `${dateFrom}T00:00:00Z`);
      if (dateTo) q.set('date_to', `${dateTo}T00:00:00Z`);

      try {
        const qs = q.toString();
        const init: RequestInit = { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } };
        const seenUrl = `https://n8n.srv799877.hstgr.cloud/webhook/api/analytics/top-seen?${qs}&ts=${Date.now()}`;
        const salesUrl = `https://n8n.srv799877.hstgr.cloud/webhook/api/analytics/top-sales?${qs}&ts=${Date.now()}`;
        const [seenRes, salesRes] = await Promise.all([
          fetch(seenUrl, init),
          fetch(salesUrl, init),
        ]);
        const parseSafe = async (res: Response, url: string) => {
          if (res.status === 304 || res.status === 204) {
            const ref = await fetch(url + `&bust=${Date.now()}`, init);
            return ref.json();
          }
          if (!res.ok) {
            const t = await res.text().catch(()=>'');
            throw new Error(`${url} -> ${res.status} ${t}`);
          }
          return res.json();
        };
        const [topSeenRaw, topSalesRaw] = await Promise.all([
          parseSafe(seenRes, seenUrl),
          parseSafe(salesRes, salesUrl),
        ]);
        const extract = (raw:any): any[] => {
          if (!raw) return [];
          // formats possibles: {items: [...]}, {data: [...]}, [ {...} ], { "object Object": [ { data: [...] } ] }
          if (Array.isArray(raw?.items)) return raw.items;
          if (Array.isArray(raw?.data)) return raw.data;
          if (Array.isArray(raw)) {
            // si c'est un tableau de un élément qui contient data/items
            const first = raw[0];
            if (first?.data && Array.isArray(first.data)) return first.data;
            if (first?.items && Array.isArray(first.items)) return first.items;
            return raw;
          }
          if (raw?.["object Object"] && Array.isArray(raw["object Object"])) {
            const first = raw["object Object"][0];
            if (first?.data && Array.isArray(first.data)) return first.data;
            if (first?.items && Array.isArray(first.items)) return first.items;
          }
          // Certains webhooks renvoient un JSON stringifié "lisible" (texte) avec data:[...]
          if (typeof raw === 'string') {
            // Essaye d'extraire le segment data:[...]
            const mData = raw.match(/"data"\s*:\s*(\[[\s\S]*\])/);
            if (mData && mData[1]) {
              try {
                const arr = JSON.parse(mData[1]);
                if (Array.isArray(arr)) return arr;
              } catch {}
            }
            const mItems = raw.match(/"items"\s*:\s*(\[[\s\S]*\])/);
            if (mItems && mItems[1]) {
              try {
                const arr = JSON.parse(mItems[1]);
                if (Array.isArray(arr)) return arr;
              } catch {}
            }
            // Fallback: extraire le premier tableau JSON du texte complet
            const first = raw.indexOf('[');
            const last = raw.lastIndexOf(']');
            if (first !== -1 && last !== -1 && last > first) {
              const slice = raw.slice(first, last + 1);
              try {
                const arr = JSON.parse(slice);
                if (Array.isArray(arr)) return arr;
              } catch {}
            }
          }
          return [];
        };
        const topSeen = extract(topSeenRaw);
        const topSales = extract(topSalesRaw);
        return { topSeen, topSales } as { topSeen: any[]; topSales: any[] };
      } catch (e) {
        console.error('leaderboard fetch failed', e);
        throw e;
      }
    },
  });
  // Les autres blocs Analytics sont temporairement neutralisés (pas d'appels FastAPI)

  const kpis = useMemo(() => {
    const totalViews = 0;
    const estSales = (leaderboardQ.data?.topSales || []).reduce((sum, p: any) => sum + (Number(p.revenue) || 0), 0);
    const trend = 0;
    const p95 = 0;
    return { totalViews, estSales, trend, p95 };
  }, [leaderboardQ.data]);

  return (
    <div className="space-y-6">
      <Hero
        variant="performance"
        title="Performance & analyses"
        subtitle="Suivez vos KPIs clés et découvrez les produits qui performent."
      />

      {/* Filtres */}
      <Card className="sticky top-16 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-sm text-foreground">Tenant</label>
            <Input value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="la_redoute" />
          </div>
          <div>
            <label className="text-sm text-foreground">Du</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-foreground">Au</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <Button className="w-full" onClick={() => { leaderboardQ.refetch(); }}>Appliquer</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard label="Vues totales" value={kpis.totalViews.toLocaleString('fr-FR')} />
        <KpiCard label="Ventes estimées" value={kpis.estSales.toLocaleString('fr-FR')} />
        <KpiCard label="Tendance" value={kpis.trend.toLocaleString('fr-FR')} />
        <KpiCard label="Latence p95" value={`${kpis.p95} ms`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche */}
        <div className="space-y-6">
          <ExpandableListBlock 
            title="Top vus"
            loading={leaderboardQ.isLoading}
            items={(leaderboardQ.data?.topSeen || []).map((it:any,index:number)=>({
              product_id: it.product_id || it.id || it.sku,
              name: it.name,
              image_url: it.image_url || it.image,
              valueLabel: `${it.views ?? it.count ?? 0} vues`,
              score: typeof it.score === 'number' ? it.score : undefined,
              rank: it.rank ?? index + 1,
              brand: it.brand,
            }))}
          />
          <ExpandableListBlock 
            title="Top ventes"
            loading={leaderboardQ.isLoading}
            items={(leaderboardQ.data?.topSales || []).map((it:any,index:number)=>({
              product_id: it.product_id || it.id || it.sku,
              name: it.name,
              image_url: it.image_url || it.image,
              valueLabel: `${it.revenue ?? it.sales ?? 0} EUR`,
              score: typeof it.score === 'number' ? it.score : undefined,
              rank: it.rank ?? index + 1,
              brand: it.brand,
            }))}
          />
          <ExpandableListBlock title="Tendance" loading={false} items={[]} />
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vues par jour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Aucune donnée (en attente d'API)</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Part de marques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Aucune donnée (en attente d'API)</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Part de catégories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Aucune donnée (en attente d'API)</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold text-foreground mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function ListBlock({ title, loading, items }: { title: string; loading: boolean; items: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucune donnée</div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <ProductCard
                key={it.product_id}
                id={it.product_id}
                name={it.name}
                imageUrl={it.image_url}
                brand={it.brand}
                price={undefined}
                currency={''}
                score={typeof it.score === 'number' ? it.score : undefined}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExpandableListBlock({ title, loading, items }: { title: string; loading: boolean; items: any[] }) {
  const first = items[0];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucune donnée</div>
        ) : (
          <div className="space-y-3">
            {/* Aperçu du premier produit */}
            <ProductCard
              id={first.product_id}
              name={first.name}
              imageUrl={first.image_url}
              brand={first.brand}
              price={undefined}
              currency={''}
              score={typeof first.score === 'number' ? first.score : undefined}
            />
            {/* Dépliable pour voir la liste complète */}
            <Collapsible>
              <div className="flex justify-end">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">Voir plus</Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {items.slice(1).map((it:any) => (
                    <ProductCard
                      key={it.product_id}
                      id={it.product_id}
                      name={it.name}
                      imageUrl={it.image_url}
                      brand={it.brand}
                      price={undefined}
                      currency={''}
                      score={typeof it.score === 'number' ? it.score : undefined}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


