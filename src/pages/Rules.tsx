import { useEffect, useState } from 'react';
import Hero from '@/components/Hero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listRules, createRule, updateRule, deleteRule, previewRule } from '@/lib/api-rules';
import { Rule } from '@/schemas/rules';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function RulesPage() {
  const [mode, setMode] = useState('all');
  const [kind, setKind] = useState('all');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'manage'|'insights'|'ai'>('manage');

  // Create/Edit dialog state
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  type BoostRow = { field: string; op: 'eq'|'neq'|'gte'|'lte'|'gt'|'lt'|string; value: string; weight: number };
  type FormState = {
    name: string; description?: string; mode: string; priority: number;
    kind_similar: boolean; kind_complementary: boolean; kind_xsell: boolean;
    include_in_stock: boolean; min_price?: string; max_price?: string;
    target_category_path?: string; target_product_ids?: string;
    exclude_vendors?: string; exclude_brands?: string; exclude_categories?: string; exclude_product_ids?: string;
    pins?: string; blocklist?: string;
    boosts: BoostRow[]; penalties: BoostRow[];
    diversity_by?: 'brand'|'category'|''; diversity_max?: number;
  };
  const [form, setForm] = useState<FormState | null>(null);

  const defaultForm = (prev?: FormState | null): FormState => prev ?? ({
    name: '', description: '', mode: 'draft', priority: 50,
    kind_similar: true, kind_complementary: true, kind_xsell: true,
    include_in_stock: false, min_price: '', max_price: '',
    target_category_path: '', target_product_ids: '',
    exclude_vendors: '', exclude_brands: '', exclude_categories: '', exclude_product_ids: '',
    pins: '', blocklist: '', boosts: [], penalties: [],
    diversity_by: '', diversity_max: 2,
  });
  const upd = (patch: Partial<FormState>) => setForm(prev => ({ ...defaultForm(prev), ...patch }));

  // Preview dialog state
  const [openPreview, setOpenPreview] = useState(false);
  const [previewParams, setPreviewParams] = useState<{ product_id: string; kind: 'similar'|'complementary'|'x-sell' }>({ product_id: '', kind: 'similar' });
  const [previewData, setPreviewData] = useState<{ before: any[]; after: any[] } | null>(null);

  // Insights state (placeholder v1)
  const [insightsRuleId, setInsightsRuleId] = useState<string>('');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<{ kpis?: any; topProducts?: any[]; logs?: any[] } | null>(null);

  const loadInsights = async (ruleId: string) => {
    setInsightsLoading(true);
    try {
      // TODO: brancher sur un endpoint n8n analytics (rule insights)
      // Placeholder statique pour v1
      const demo = {
        kpis: {
          hits: 1240,
          ctr: 0.084,
          revenue: 5230.75,
          uplift7: +0.12,
          uplift30: +0.08,
        },
        topProducts: [
          { product_id: 'prod_abc123', name: 'Nike Pegasus 40', before_rank: 8, after_rank: 2, delta: -6, hits: 129 },
          { product_id: 'prod_def456', name: 'Adidas Ultraboost', before_rank: 15, after_rank: 6, delta: -9, hits: 92 },
        ],
        logs: [
          { at: new Date().toISOString(), product_id: 'prod_abc123', action: 'boosted', delta: +5 },
          { at: new Date().toISOString(), product_id: 'prod_xyz777', action: 'blocked', delta: 0 },
        ],
      };
      setInsights(demo);
    } finally {
      setInsightsLoading(false);
    }
  };

  // Auto-chargement mock quand on ouvre l'onglet Insights
  useEffect(() => {
    if (activeTab !== 'insights') return;
    if (insightsLoading) return;
    if (insights) return; // déjà chargé
    if (insightsRuleId) { void loadInsights(insightsRuleId); return; }
    if (items.length > 0) {
      setInsightsRuleId(items[0]._id);
      void loadInsights(items[0]._id);
      return;
    }
    // aucun item -> charger un demo par défaut
    void loadInsights('demo');
  }, [activeTab, items, insightsRuleId, insightsLoading, insights]);

  // AI Suggestions (v2) — préremplissage du formulaire
  const [aiSimProductId, setAiSimProductId] = useState('');
  const [aiSimKind, setAiSimKind] = useState<'similar'|'complementary'|'x-sell'>('complementary');
  const prefillBoostStockSuggestion = () => {
    setEditing(null);
    setForm(defaultForm({
      name: 'Boost stock>=20 (+5) — Running/Homme',
      description: '+5 si stock >= 20 sur Running/Homme',
      mode: 'draft',
      priority: 80,
      kind_complementary: true,
      kind_similar: false,
      kind_xsell: false,
      target_category_path: 'Homme/Chaussures/Running',
      boosts: [{ field: 'stock', op: 'gte', value: '20', weight: 5 }],
    } as any));
    setOpenForm(true);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await listRules({ mode, kind, q, page: 1, page_size: 20 });
      setItems(res.items as Rule[]);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les règles' });
    } finally { setLoading(false); }
  };
  useEffect(()=>{ void refresh(); }, [mode, kind]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setOpenForm(true);
  };
  const openEdit = (r: Rule) => {
    setEditing(r);
    setForm({
      name: r.name, description: r.description, mode: r.mode, priority: r.priority,
      kind_similar: !!(r.kind_scope||['similar','complementary','x-sell']).includes('similar'),
      kind_complementary: !!(r.kind_scope||['similar','complementary','x-sell']).includes('complementary'),
      kind_xsell: !!(r.kind_scope||['similar','complementary','x-sell']).includes('x-sell'),
      include_in_stock: !!r.constraints?.include_only?.in_stock,
      min_price: r.constraints?.include_only?.min_price !== undefined && r.constraints?.include_only?.min_price !== null ? String(r.constraints?.include_only?.min_price) : '',
      max_price: r.constraints?.include_only?.max_price !== undefined && r.constraints?.include_only?.max_price !== null ? String(r.constraints?.include_only?.max_price) : '',
      target_category_path: (r.target?.category_path||[]).join(', '),
      target_product_ids: (r.target?.product_ids||[]).join(', '),
      exclude_vendors: (r.constraints?.exclude?.vendors||[]).join(', '),
      exclude_brands: (r.constraints?.exclude?.brands||[]).join(', '),
      exclude_categories: (r.constraints?.exclude?.categories||[]).join(', '),
      exclude_product_ids: (r.constraints?.exclude?.product_ids||[]).join(', '),
      pins: (r.overrides?.pins||[]).join(', '),
      blocklist: (r.overrides?.blocklist||[]).join(', '),
      boosts: (r.ranking?.boosts||[]).map(b=>({ field: b.field, op: b.op, value: String(b.value), weight: b.weight })),
      penalties: (r.ranking?.penalties||[]).map(b=>({ field: b.field, op: b.op, value: String(b.value), weight: b.weight })),
      diversity_by: (r.diversity?.by||'') as any, diversity_max: r.diversity?.max_per_group || 2,
    });
    setOpenForm(true);
  };
  const splitCsv = (s?: string) => (s ? s.split(',').map(x=>x.trim()).filter(Boolean) : undefined);
  const submitForm = async () => {
    if (!form) return;
    try {
      const kind_scope = [form.kind_similar && 'similar', form.kind_complementary && 'complementary', form.kind_xsell && 'x-sell'].filter(Boolean) as ('similar'|'complementary'|'x-sell')[];
      const payload: any = {
        name: form.name, description: form.description, mode: form.mode, priority: Number(form.priority), kind_scope,
        target: {
          category_path: splitCsv(form.target_category_path),
          product_ids: splitCsv(form.target_product_ids),
        },
        constraints: {
          include_only: {
            in_stock: form.include_in_stock || undefined,
            min_price: form.min_price ? Number(form.min_price) : undefined,
            max_price: form.max_price ? Number(form.max_price) : undefined,
          },
          exclude: {
            vendors: splitCsv(form.exclude_vendors),
            brands: splitCsv(form.exclude_brands),
            categories: splitCsv(form.exclude_categories),
            product_ids: splitCsv(form.exclude_product_ids),
          },
        },
        overrides: { pins: splitCsv(form.pins), blocklist: splitCsv(form.blocklist) },
        ranking: {
          boosts: (form.boosts||[]).filter(b=>b.field).map(b=>({ field: b.field, op: b.op as any, value: b.value, weight: Number(b.weight) })),
          penalties: (form.penalties||[]).filter(b=>b.field).map(b=>({ field: b.field, op: b.op as any, value: b.value, weight: Number(b.weight) })),
        },
        diversity: form.diversity_by ? { by: form.diversity_by, max_per_group: form.diversity_max } : undefined,
      };
      if (editing) {
        await updateRule(editing._id, payload);
        toast({ title: 'Règle mise à jour' });
      } else {
        await createRule(payload);
        toast({ title: 'Règle créée' });
      }
      setOpenForm(false);
      await refresh();
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Échec', description: 'Action impossible' });
    }
  };

  const onPauseResume = async (r: Rule) => {
    const next = r.mode === 'paused' ? 'active' : 'paused';
    const prev = items;
    setItems(prev.map(i => i._id === r._id ? { ...i, mode: next } as Rule : i));
    try {
      await updateRule(r._id, { mode: next });
      toast({ title: next === 'paused' ? 'Règle mise en pause' : 'Règle activée' });
    } catch (e) {
      setItems(prev); // rollback
      toast({ variant: 'destructive', title: 'Échec', description: 'Impossible de mettre à jour la règle' });
    }
  };

  const onDelete = async (r: Rule) => {
    if (!confirm('Supprimer cette règle ?')) return;
    const prev = items;
    setItems(prev.filter(i => i._id !== r._id));
    try {
      await deleteRule(r._id);
      toast({ title: 'Règle supprimée' });
    } catch (e) {
      setItems(prev);
      toast({ variant: 'destructive', title: 'Échec', description: 'Suppression impossible' });
    }
  };

  const onOpenPreview = (r?: Rule) => {
    setPreviewParams(p => ({ ...p, product_id: '', kind: 'similar' }));
    setPreviewData(null);
    setOpenPreview(true);
  };
  const runPreview = async () => {
    try {
      const res = await previewRule(previewParams);
      setPreviewData({ before: res.before, after: res.after });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Échec de la prévisualisation' });
    }
  };

  return (
    <div className="space-y-6">
      <Hero
        title="Règles métiers"
        subtitle="Créez, éditez et prévisualisez l'impact de vos règles sur les recommandations."
        variant="performance"
        actions={[{ label: 'Créer une règle', variant: 'default', onClick: openCreate } ]}
      />

      <Tabs value={activeTab} onValueChange={(v)=>setActiveTab(v as any)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="ai">AI Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6 mt-4">
          <Card className="sticky top-16 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-sm text-foreground">Mode</label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['all','active','draft','paused','archived'].map(m=> (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-foreground">Kind</label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['all','similar','complementary','x-sell'].map(k=> (<SelectItem key={k} value={k}>{k}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-foreground">Recherche</label>
                <div className="flex gap-2">
                  <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Nom, label..." />
                  <Button onClick={()=>void refresh()}>Filtrer</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Liste des règles</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_,i)=>(<div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />))}</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground py-12 text-center">Aucune règle</div>
              ) : (
                <div className="space-y-2">
                  {items.map((r)=> (
                    <div key={r._id} className="p-4 rounded-xl border border-border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">{r.name} <span className="text-xs text-muted-foreground ml-2">prio {r.priority}</span></div>
                        <div className="text-xs text-muted-foreground">{r.mode} • {r.kind_scope?.join(', ') || 'all kinds'}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={()=>onOpenPreview(r)}>Preview</Button>
                        <Button variant="outline" size="sm" onClick={()=>openEdit(r)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={()=>onPauseResume(r)}>{r.mode==='paused'?'Resume':'Pause'}</Button>
                        <Button variant="outline" size="sm" onClick={()=>onDelete(r)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6 mt-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="text-sm text-foreground">Règle</label>
                <Select value={insightsRuleId} onValueChange={(v)=>{ setInsightsRuleId(v); void loadInsights(v); }}>
                  <SelectTrigger><SelectValue placeholder="Choisir une règle" /></SelectTrigger>
                  <SelectContent>
                    {items.map(r=> (<SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={()=> insightsRuleId && loadInsights(insightsRuleId)} disabled={!insightsRuleId || insightsLoading}>Rafraîchir</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Hits</div><div className="text-2xl font-semibold">{insights?.kpis?.hits ?? '—'}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">CTR</div><div className="text-2xl font-semibold">{insights?.kpis?.ctr !== undefined ? `${Math.round((insights?.kpis?.ctr||0)*100)}%` : '—'}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Revenue</div><div className="text-2xl font-semibold">{insights?.kpis?.revenue !== undefined ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(insights?.kpis?.revenue||0) : '—'}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Uplift (J-7/J-30)</div><div className="text-sm">J-7: {insights?.kpis?.uplift7 !== undefined ? `${Math.round((insights?.kpis?.uplift7||0)*100)}%` : '—'} • J-30: {insights?.kpis?.uplift30 !== undefined ? `${Math.round((insights?.kpis?.uplift30||0)*100)}%` : '—'}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Évolution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-40 rounded-xl bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">Graph placeholder (hits / CTR / revenue)</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Top produits affectés</CardTitle></CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="space-y-2">{[...Array(4)].map((_,i)=>(<div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />))}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left py-2">Produit</th>
                        <th className="text-left py-2">Avant</th>
                        <th className="text-left py-2">Après</th>
                        <th className="text-left py-2">Δ</th>
                        <th className="text-left py-2">Hits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(insights?.topProducts||[]).map((p,i)=> (
                        <tr key={i} className="border-t border-border">
                          <td className="py-2">{p.name || p.product_id}</td>
                          <td className="py-2">{p.before_rank ?? '—'}</td>
                          <td className="py-2">{p.after_rank ?? '—'}</td>
                          <td className="py-2">{p.delta ?? '—'}</td>
                          <td className="py-2">{p.hits ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!insights?.topProducts || insights?.topProducts.length === 0) && <div className="text-sm text-muted-foreground py-6 text-center">Aucune donnée</div>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Derniers logs (rule_hits)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(insights?.logs||[]).map((l,i)=>(
                  <div key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="w-40 shrink-0">{new Date(l.at).toLocaleString('fr-FR')}</span>
                    <span className="flex-1">{l.product_id}</span>
                    <span className="w-24 text-right">{l.action}{l.delta ? ` (${l.delta>0?'+':''}${l.delta})` : ''}</span>
                  </div>
                ))}
                {(!insights?.logs || insights?.logs.length === 0) && <div className="text-sm text-muted-foreground py-4">Aucun log</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Propositions automatiques</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="font-medium text-foreground">Ajoute boost stock ≥ 20 (+5) sur Running/Homme</div>
                <div className="text-sm text-muted-foreground mt-1">Explication: améliore l’offre pour les produits disponibles en quantité, sur la catégorie Homme/Chaussures/Running.</div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" onClick={prefillBoostStockSuggestion}>Préremplir</Button>
                  <Button variant="outline" onClick={()=>{ setOpenPreview(true); }}>Simuler</Button>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="font-medium text-foreground">PIN — Top sellers Running Homme</div>
                <div className="text-sm text-muted-foreground mt-1">Explication: garantir en tête les meilleurs vendeurs pour maximiser le CTR.</div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" onClick={()=>{ setEditing(null); setForm(defaultForm({ name: 'PIN — Top sellers Running Homme', mode: 'draft', priority: 90, target_category_path: 'Homme/Chaussures/Running', pins: 'prod_abc123, prod_def456' } as any)); setOpenForm(true); }}>Préremplir</Button>
                  <Button variant="outline" onClick={()=>{ setOpenPreview(true); }}>Simuler</Button>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="font-medium text-foreground">Blocklist vendor market_bad</div>
                <div className="text-sm text-muted-foreground mt-1">Explication: exclure un vendeur problématique pour améliorer la qualité.</div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" onClick={()=>{ setEditing(null); setForm(defaultForm({ name: 'Blocklist vendor market_bad', mode: 'active', priority: 85, exclude_vendors: 'market_bad' } as any)); setOpenForm(true); }}>Préremplir</Button>
                  <Button variant="outline" onClick={()=>{ setOpenPreview(true); }}>Simuler</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing? 'Modifier la règle' : 'Créer une règle'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basics" className="w-full">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
              <TabsTrigger value="basics">Général</TabsTrigger>
              <TabsTrigger value="scope">Cible</TabsTrigger>
              <TabsTrigger value="constraints">Contraintes</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="overrides">Overrides</TabsTrigger>
              <TabsTrigger value="diversity">Diversité</TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Nom</Label>
                  <Input value={form?.name || ''} onChange={e=>upd({ name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-sm">Priorité (0..100)</Label>
                  <Input type="number" value={form?.priority ?? 50} onChange={e=>upd({ priority: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-sm">Mode</Label>
                  <Select value={form?.mode || 'draft'} onValueChange={(v)=>upd({ mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['draft','active','paused','archived'].map(m=> (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Description</Label>
                  <Input value={form?.description || ''} onChange={e=>upd({ description: e.target.value })} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scope" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Kinds cibles</Label>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span>similar</span><Switch checked={!!form?.kind_similar} onCheckedChange={(v)=>upd({ kind_similar: v })} /></div>
                    <div className="flex items-center justify-between"><span>complementary</span><Switch checked={!!form?.kind_complementary} onCheckedChange={(v)=>upd({ kind_complementary: v })} /></div>
                    <div className="flex items-center justify-between"><span>x-sell</span><Switch checked={!!form?.kind_xsell} onCheckedChange={(v)=>upd({ kind_xsell: v })} /></div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Target category_path (CSV)</Label>
                  <Input value={form?.target_category_path || ''} onChange={e=>upd({ target_category_path: e.target.value })} placeholder="Homme/Chaussures/Running" />
                </div>
                <div>
                  <Label className="text-sm">Target product_ids (CSV)</Label>
                  <Input value={form?.target_product_ids || ''} onChange={e=>upd({ target_product_ids: e.target.value })} placeholder="prod_abc, prod_def" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="constraints" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Include only</Label>
                  <div className="flex items-center justify-between"><span className="text-sm">in_stock</span><Switch checked={!!form?.include_in_stock} onCheckedChange={(v)=>upd({ include_in_stock: v })} /></div>
                  <Input type="number" placeholder="min_price" value={form?.min_price || ''} onChange={e=>upd({ min_price: e.target.value })} />
                  <Input type="number" placeholder="max_price" value={form?.max_price || ''} onChange={e=>upd({ max_price: e.target.value })} />
                </div>
                <div>
                  <Label className="text-sm">Exclude vendors (CSV)</Label>
                  <Input value={form?.exclude_vendors || ''} onChange={e=>upd({ exclude_vendors: e.target.value })} placeholder="market_bad" />
                </div>
                <div>
                  <Label className="text-sm">Exclude product_ids (CSV)</Label>
                  <Input value={form?.exclude_product_ids || ''} onChange={e=>upd({ exclude_product_ids: e.target.value })} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ranking" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Boosts</Label>
                    <Button size="sm" variant="outline" onClick={()=>upd({ boosts: [ ...(form?.boosts||[]), { field: '', op: 'eq', value: '', weight: 5 } ] })}>+ Ajouter</Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {(form?.boosts||[]).map((b, i)=> (
                      <div key={i} className="grid grid-cols-4 gap-2">
                        <Input placeholder="field" value={b.field} onChange={e=>{ const arr=[...(form?.boosts||[])]; arr[i]={ ...arr[i], field: e.target.value }; upd({ boosts: arr }); }} />
                        <Input placeholder="op" value={b.op} onChange={e=>{ const arr=[...(form?.boosts||[])]; arr[i]={ ...arr[i], op: e.target.value }; upd({ boosts: arr }); }} />
                        <Input placeholder="value" value={b.value} onChange={e=>{ const arr=[...(form?.boosts||[])]; arr[i]={ ...arr[i], value: e.target.value }; upd({ boosts: arr }); }} />
                        <Input type="number" placeholder="weight" value={b.weight} onChange={e=>{ const arr=[...(form?.boosts||[])]; arr[i]={ ...arr[i], weight: Number(e.target.value) }; upd({ boosts: arr }); }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Penalties</Label>
                    <Button size="sm" variant="outline" onClick={()=>upd({ penalties: [ ...(form?.penalties||[]), { field: '', op: 'eq', value: '', weight: 5 } ] })}>+ Ajouter</Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {(form?.penalties||[]).map((b, i)=> (
                      <div key={i} className="grid grid-cols-4 gap-2">
                        <Input placeholder="field" value={b.field} onChange={e=>{ const arr=[...(form?.penalties||[])]; arr[i]={ ...arr[i], field: e.target.value }; upd({ penalties: arr }); }} />
                        <Input placeholder="op" value={b.op} onChange={e=>{ const arr=[...(form?.penalties||[])]; arr[i]={ ...arr[i], op: e.target.value }; upd({ penalties: arr }); }} />
                        <Input placeholder="value" value={b.value} onChange={e=>{ const arr=[...(form?.penalties||[])]; arr[i]={ ...arr[i], value: e.target.value }; upd({ penalties: arr }); }} />
                        <Input type="number" placeholder="weight" value={b.weight} onChange={e=>{ const arr=[...(form?.penalties||[])]; arr[i]={ ...arr[i], weight: Number(e.target.value) }; upd({ penalties: arr }); }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="overrides" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Pins (CSV)</Label>
                  <Input value={form?.pins || ''} onChange={e=>upd({ pins: e.target.value })} placeholder="prod_abc123, prod_def456" />
                </div>
                <div>
                  <Label className="text-sm">Blocklist (CSV)</Label>
                  <Input value={form?.blocklist || ''} onChange={e=>upd({ blocklist: e.target.value })} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="diversity" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Diversité par</Label>
                  <Select value={(form?.diversity_by && form.diversity_by.length>0) ? (form.diversity_by as any) : 'none'} onValueChange={(v)=>upd({ diversity_by: (v === 'none' ? '' : (v as any)) })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="brand">brand</SelectItem>
                      <SelectItem value="category">category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Max par groupe</Label>
                  <Input type="number" value={form?.diversity_max ?? 2} onChange={e=>upd({ diversity_max: Number(e.target.value) })} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpenForm(false)}>Annuler</Button>
            <Button onClick={submitForm}>{editing?'Enregistrer':'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={openPreview} onOpenChange={setOpenPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Prévisualisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm text-foreground">Product ID</label>
                <Input value={previewParams.product_id} onChange={e=>setPreviewParams(p=>({ ...p, product_id: e.target.value }))} placeholder="prod_..." />
              </div>
              <div>
                <label className="text-sm text-foreground">Kind</label>
                <Select value={previewParams.kind} onValueChange={(v)=>setPreviewParams(p=>({ ...p, kind: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="similar">similar</SelectItem>
                    <SelectItem value="complementary">complementary</SelectItem>
                    <SelectItem value="x-sell">x-sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={runPreview}>Preview</Button>
            </div>
            {previewData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-2">Avant</div>
                  <div className="space-y-2">
                    {previewData.before.map((it:any, i:number)=> (
                      <div key={i} className="p-3 border border-border rounded-lg flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded" />
                        <div className="text-sm text-foreground">{it.name || it.product_id}</div>
                        <div className="ml-auto text-xs text-muted-foreground">{Math.round((it.score||0)*100)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Après</div>
                  <div className="space-y-2">
                    {previewData.after.map((it:any, i:number)=> (
                      <div key={i} className="p-3 border border-border rounded-lg flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded" />
                        <div className="text-sm text-foreground">{it.name || it.product_id}</div>
                        <div className="ml-auto text-xs text-muted-foreground">{Math.round((it.score||0)*100)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpenPreview(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


