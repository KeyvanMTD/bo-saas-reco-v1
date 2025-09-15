import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search } from 'lucide-react';
import { Api, DEFAULT_TENANT } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRecommendations, type RecoResponse } from '@/lib/recoClient';
import Hero from '@/components/Hero';

type Product = {
  tenant?: string;
  product_id: string;
  title?: string;
  brand?: string;
  price?: number;
  currency?: string;
  in_stock?: boolean;
  category_path?: string[];
  image?: string | null;
  updated_at?: string;
  attributes?: Record<string, unknown>;
};

export default function Catalog() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeRecoTab, setActiveRecoTab] = useState<'similar' | 'complementary' | 'x-sell'>('similar');
  const [searchTerm, setSearchTerm] = useState('');
  const [limit] = useState(20);

  const tenant = DEFAULT_TENANT || 'la_redoute';
  const { data, isLoading } = useQuery({
    queryKey: ['products', tenant, searchTerm, limit],
    queryFn: async () => {
      const base = await Api.products({ tenant, q: searchTerm, limit });
      const rawItems: any[] = base?.items ?? [];
      // Si rien, retourne tôt
      if (!rawItems.length) return { items: [] } as any;
      // Lookup par lots de 50 pour éviter un body trop gros
      const ids = rawItems.map((p: any) => p.product_id).filter(Boolean);
      const chunkSize = 50;
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));
      const enrichedAll: any[] = [];
      for (const c of chunks) {
        try {
          const part = await Api.productsLookup({ tenant, ids: c });
          enrichedAll.push(...(Array.isArray(part) ? part : []));
        } catch {
          // si le webhook n'est pas dispo, on continue sans enrichissement
        }
      }
      const byId = new Map<string, any>();
      enrichedAll.forEach((p) => {
        const pid = p?.product_id || p?.id || p?._id;
        if (pid) byId.set(String(pid), p);
      });
      const merged = rawItems.map((p) => ({ ...p, ...(byId.get(p.product_id) || {}) }));
      return { items: merged } as any;
    },
  });
  const items: Product[] = (data as any)?.items ?? [];

  return (
    <div className="space-y-6">
      <Hero
        variant="catalog"
        title="Votre catalogue unifié"
        subtitle="Recherchez, filtrez et inspectez vos produits. Connecté à vos données en temps réel."
        actions={[{ label: 'Importer des produits', variant: 'default' }, { label: 'Voir les mappings', variant: 'outline', href: '/mappings' }]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher par nom ou marque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2" />
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Produits {isLoading ? '(...)' : `(${items.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Chargement…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Aucun produit à afficher
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((product) => {
                const imageUrl = product.image || (product as any).image_url || undefined;
                const displayName = product.title || (product as any).name || product.product_id;
                const price = product.price ?? (product as any).current_price;
                const currency = product.currency ?? (product as any).currency ?? '';
                const categoriesRaw = (product as any).category_path ?? [];
                const categories = Array.isArray(categoriesRaw)
                  ? categoriesRaw
                  : typeof categoriesRaw === 'string'
                    ? categoriesRaw.split('/').filter(Boolean)
                    : [];
                return (
                  <div
                    key={product.product_id}
                    className="flex items-center justify-between p-4 bg-card-hover rounded-lg border border-border hover:shadow-sm transition-all duration-200 cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="flex items-center space-x-4">
                      {imageUrl ? (
                        <img src={imageUrl} alt={displayName} className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted" />
                      )}
                      <div>
                        <div className="font-medium text-foreground">{displayName}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.brand ?? (product as any).brand ?? '—'} • {product.product_id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="font-medium text-foreground">{price ?? '—'} {currency}</div>
                        <div className="text-sm text-muted-foreground">Stock: {product.in_stock ? 'Oui' : 'Non'}</div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {categories.slice(0, 2).map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Detail Sheet */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl font-semibold text-foreground">
                  Détails du produit
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {(() => {
                  const img = (selectedProduct as any).image || (selectedProduct as any).image_url;
                  const name = (selectedProduct as any).title || (selectedProduct as any).name || selectedProduct.product_id;
                  return img ? (
                    <img src={img} alt={name} className="w-full h-64 rounded-lg object-cover" />
                  ) : null;
                })()}
                
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {(selectedProduct as any).title || (selectedProduct as any).name || selectedProduct.product_id}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Marque:</span>
                      <span className="ml-2 font-medium text-foreground">{selectedProduct.brand ?? '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Prix:</span>
                      <span className="ml-2 font-medium text-foreground">{(selectedProduct as any).price ?? (selectedProduct as any).current_price ?? '—'} {(selectedProduct as any).currency ?? ''}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stock:</span>
                      <span className="ml-2 font-medium text-foreground">{selectedProduct.in_stock ? 'Oui' : 'Non'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ID produit:</span>
                      <span className="ml-2 font-medium text-foreground">{selectedProduct.product_id}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedProduct.category_path ?? []).map((cat) => (
                      <Badge key={cat} variant="secondary">{cat}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-3">Métadonnées</h4>
                  <div className="space-y-2 text-sm">
                    {(() => {
                      const meta = (selectedProduct as any).attributes ?? (selectedProduct as any).metadata ?? {};
                      const has = meta && typeof meta === 'object' && Object.keys(meta).length > 0;
                      return has ? (
                        <pre className="bg-muted rounded p-3 font-mono overflow-x-auto text-foreground">{JSON.stringify(meta, null, 2)}</pre>
                      ) : (
                        <div className="text-muted-foreground">Aucune métadonnée</div>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-3">Recommandations</h4>
                  <Tabs value={activeRecoTab} onValueChange={(v) => setActiveRecoTab(v as any)} className="w-full">
                    <TabsList>
                      <TabsTrigger value="similar">Similaires</TabsTrigger>
                      <TabsTrigger value="complementary">Complémentaires</TabsTrigger>
                      <TabsTrigger value="x-sell">Cross-sell</TabsTrigger>
                    </TabsList>
                    <TabsContent value="similar">
                      <RecoBlock tenant={tenant} productId={selectedProduct.product_id} kind="similar" />
                    </TabsContent>
                    <TabsContent value="complementary">
                      <RecoBlock tenant={tenant} productId={selectedProduct.product_id} kind="complementary" />
                    </TabsContent>
                    <TabsContent value="x-sell">
                      <RecoBlock tenant={tenant} productId={selectedProduct.product_id} kind="x-sell" />
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="pt-2">
                  <Link
                    to={`/preview?product_id=${encodeURIComponent(selectedProduct.product_id)}&kind=similar&limit=6&auto=1`}
                    className="inline-flex items-center px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary-hover"
                  >
                    Tester les recommandations
                  </Link>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

type RecoKind = 'similar' | 'complementary' | 'x-sell';

function RecoBlock({ tenant, productId, kind }: { tenant: string; productId: string; kind: RecoKind }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reco', tenant, productId, kind, 6],
    queryFn: async () => {
      const base: RecoResponse = await getRecommendations({ productId, kind, limit: 6, tenant });
      const items = Array.isArray(base.items) ? base.items : [];
      const ids = items.map((i) => i.product_id);
      let enriched: any[] = [];
      try {
        if (ids.length) enriched = await Api.productsLookup({ tenant, ids });
      } catch {}
      const byId = new Map<string, any>();
      enriched.forEach((p) => {
        const pid = p?.product_id || p?.id || p?._id;
        if (pid) byId.set(String(pid), p);
      });
      return items.map((i) => ({
        id: i.product_id,
        score: i.score,
        name: byId.get(i.product_id)?.name,
        image_url: byId.get(i.product_id)?.image_url || byId.get(i.product_id)?.image,
        price: byId.get(i.product_id)?.current_price ?? byId.get(i.product_id)?.price,
        currency: byId.get(i.product_id)?.currency,
        brand: byId.get(i.product_id)?.brand,
      }));
    },
    staleTime: 120000,
  });
  const items: Array<{ id: string; score?: number; name?: string; image_url?: string; price?: number; currency?: string; brand?: string }> = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2 mt-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-3 rounded border border-border bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!items.length) {
    return <div className="text-sm text-muted-foreground mt-2">Aucune recommandation</div>;
  }
  return (
    <div className="mt-3 space-y-2">
      {items.map((it) => (
        <div key={it.id} className="flex items-center justify-between p-3 rounded border border-border">
          <div className="flex items-center gap-3">
            {it.image_url ? (
              <img src={it.image_url} alt={it.name || it.id} className="w-10 h-10 rounded object-cover" />
            ) : (
              <div className="w-10 h-10 rounded bg-muted" />
            )}
            <div>
              <div className="text-sm font-medium text-foreground">{it.name || it.id}</div>
              <div className="text-xs text-muted-foreground">{it.brand || '—'}</div>
            </div>
          </div>
          <div className="text-sm text-foreground">
            {it.price !== undefined ? `${it.price} ${it.currency || ''}` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}