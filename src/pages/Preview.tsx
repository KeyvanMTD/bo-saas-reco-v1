import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'react-router-dom';
import { getRecommendations, type RecoResponse } from '@/lib/recoClient';
import { Api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { Progress } from '@/components/ui/progress';
import Hero from '@/components/Hero';

type Recommendation = { product_id: string; score: number; why?: string[]; meta?: Record<string, unknown> };

export default function Preview() {
  const [searchParams] = useSearchParams();
  const [productId, setProductId] = useState('');
  const [kind, setKind] = useState<'similar' | 'complementary' | 'x-sell'>('similar');
  const [limit, setLimit] = useState('3');
  const tenantDefault = (import.meta.env.VITE_DEFAULT_TENANT as string) || 'la_redoute';
  const [tenant] = useState<string>(tenantDefault);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const autoLoadedRef = useRef(false);

  const pickString = (obj: Record<string, unknown> | undefined, keys: string[]): string | undefined => {
    if (!obj) return undefined;
    for (const key of keys) {
      const value = (obj as any)[key];
      if (typeof value === 'string' && value.trim().length > 0) return value;
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') return value[0];
    }
    return undefined;
  };
  const pickNumber = (obj: Record<string, unknown> | undefined, keys: string[]): number | undefined => {
    if (!obj) return undefined;
    for (const key of keys) {
      const value = (obj as any)[key];
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
    }
    return undefined;
  };

  const handlePreview = async (overrides?: { product_id?: string; kind?: 'similar' | 'complementary' | 'x-sell'; limit?: number }) => {
    setIsLoading(true);
    try {
      const chosenKind = overrides?.kind ?? kind;
      const pid = overrides?.product_id ?? productId;
      const lim = overrides?.limit ?? parseInt(limit);
      if (!pid) {
        toast({ variant: 'destructive', title: 'Product ID manquant' });
        return;
      }
      const data: RecoResponse = await getRecommendations({ productId: pid, kind: chosenKind, limit: lim, tenant });
      const items = Array.isArray(data.items) ? data.items : [];
      // tri desc par score
      const sorted = items.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
      let mapped = sorted.map(i => ({ product_id: i.product_id, score: i.score || 0, why: i.why as string[] | undefined, meta: i.meta as Record<string, unknown> | undefined }));
      // Hydratation (optionnelle) via n8n lookup si l'URL est configurée
      try {
        const ids = mapped.map(m => m.product_id);
        if (ids.length > 0) {
          const enriched = await Api.productsLookup({ tenant, ids });
          const byId = new Map<string, any>();
          (enriched || []).forEach((p: any) => {
            // normalise la clé id
            const pid = p.product_id || p.id || p._id;
            if (pid) byId.set(String(pid), p);
          });
          mapped = mapped.map(m => ({
            ...m,
            meta: {
              ...(m.meta || {}),
              ...(byId.get(m.product_id) || {}),
            },
          }));
        }
      } catch (e) {
        // silencieux si le webhook n'est pas dispo
        console.debug('Lookup produits non disponible / ignoré');
      }
      setRecommendations(mapped);
      // mémorise paramètres
      try { localStorage.setItem('preview:last', JSON.stringify({ productId: pid, kind: chosenKind, limit: String(lim) })); } catch {}
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erreur de prévisualisation',
        description: "Impossible de récupérer les recommandations",
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const pid = searchParams.get('product_id') || '';
    const k = (searchParams.get('kind') as 'similar' | 'complementary' | 'x-sell') || 'similar';
    const l = searchParams.get('limit') || '3';
    const auto = searchParams.get('auto') === '1';
    if (pid) setProductId(pid);
    if (k) setKind(k);
    if (l) setLimit(l);
    if (auto && pid && !autoLoadedRef.current) {
      autoLoadedRef.current = true;
      void handlePreview({ product_id: pid, kind: k, limit: parseInt(l) });
    }
  }, [searchParams]);

  useEffect(() => {
    // charge derniers paramètres si présents
    try {
      const raw = localStorage.getItem('preview:last');
      if (raw) {
        const last = JSON.parse(raw);
        if (last.productId) setProductId(last.productId);
        if (last.kind) setKind(last.kind);
        if (last.limit) setLimit(String(last.limit));
      }
    } catch {}
    // enter pour lancer
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.tagName === 'INPUT' || el.getAttribute('role') === 'combobox')) {
          e.preventDefault();
          void handlePreview();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'similar':
        return 'Produits similaires';
      case 'x-sell':
        return 'Cross-sell';
      case 'complementary':
        return 'Produits complémentaires';
      default:
        return kind;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-success';
    if (score >= 0.7) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="space-y-6">
      <Hero
        variant="preview"
        title="Prévisualisez vos recommandations"
        subtitle="Optimisez vos règles et comparez les scénarios en temps réel."
        actions={[{ label: 'Guide de prise en main', variant: 'outline', href: '#' }, { label: 'Lancer un test', variant: 'default', onClick: () => { const el = document.getElementById('productId'); el?.focus(); } }]}
      />

      {/* Preview Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Paramètres de recommandation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productId" className="text-sm font-medium text-foreground">
                Product ID
              </Label>
              <Input
                id="productId"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="PRD_001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kind" className="text-sm font-medium text-foreground">
                Type de recommandation
              </Label>
              <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="similar">Produits similaires</SelectItem>
                  <SelectItem value="complementary">Produits complémentaires</SelectItem>
                  <SelectItem value="x-sell">Cross-sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit" className="text-sm font-medium text-foreground">
                Nombre de résultats
              </Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 résultats</SelectItem>
                  <SelectItem value="5">5 résultats</SelectItem>
                  <SelectItem value="10">10 résultats</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => { void handlePreview(); }} 
                disabled={isLoading || !productId}
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {isLoading ? (
                  'Chargement...'
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Prévisualiser
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Résultats - {getKindLabel(kind)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 bg-muted/50 rounded-lg border border-border animate-pulse">
                  <div className="h-4 w-1/3 bg-muted rounded" />
                  <div className="mt-3 h-4 w-full bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-2">
              {recommendations.map((item, index) => {
                const meta = (item.meta || {}) as Record<string, unknown>;
                const name = pickString(meta, ['name', 'title', 'label']);
                const imageUrl = pickString(meta, ['image_url', 'image', 'imageUrl', 'thumbnail', 'images']);
                const brand = pickString(meta, ['brand', 'vendor', 'manufacturer']);
                const price = pickNumber(meta, ['current_price', 'price']);
                const currency = pickString(meta, ['currency']);
                return (
                  <ProductCard
                    key={`${item.product_id}-${index}`}
                    id={item.product_id}
                    name={name}
                    imageUrl={imageUrl}
                    brand={brand}
                    price={price}
                    currency={currency}
                    score={item.score}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucune recommandation
              </h3>
              <p className="text-muted-foreground">
                Lancez une prévisualisation pour voir les résultats
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Preview */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Aperçu API Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm">
              <pre className="text-foreground overflow-x-auto">
{JSON.stringify({ productId, kind, limit: parseInt(limit), tenant, items: recommendations }, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}