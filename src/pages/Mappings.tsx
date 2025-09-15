import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { unifiedProductSchema } from '@/schemas/unifiedProduct';
import { Api, DEFAULT_TENANT } from '@/lib/api';
import { ArrowRight, Save, RotateCcw, Upload } from 'lucide-react';
import Hero from '@/components/Hero';

export default function Mappings() {
  const { toast } = useToast();

  const [sampleText, setSampleText] = useState('');
  const [sourceFields, setSourceFields] = useState<Array<{ id: string; type: string }>>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const parseSample = () => {
    try {
      const json = JSON.parse(sampleText);
      // Détecter automatiquement le bon niveau d'objet produit
      let record: any | null = null;
      if (Array.isArray(json) && typeof json[0] === 'object') {
        record = json[0];
      } else if (json && typeof json === 'object') {
        // priorité à 'products' si présent, sinon premier tableau d'objets
        const entries = Object.entries(json as Record<string, unknown>);
        const preferred = entries.find(([k, v]) => k === 'products' && Array.isArray(v) && typeof (v as any[])[0] === 'object');
        const firstArrayObj = preferred || entries.find(([_, v]) => Array.isArray(v) && typeof (v as any[])[0] === 'object');
        if (firstArrayObj) {
          record = (firstArrayObj[1] as any[])[0];
        } else if (entries.length > 0) {
          record = json;
        }
      }

      if (!record || typeof record !== 'object') return setSourceFields([]);
      const fields: Array<{ id: string; type: string }> = Object.entries(record).map(([k, v]) => ({ id: k, type: Array.isArray(v) ? 'array' : typeof v }));
      setSourceFields(fields);
      const auto: Record<string, string> = {};
      fields.forEach(f => {
        const hit = unifiedProductSchema.find(u => u.id === f.id);
        if (hit) auto[f.id] = hit.id;
      });
      setMappings(prev => ({ ...auto, ...prev }));
    } catch {
      setSourceFields([]);
      toast({ variant: 'destructive', title: 'JSON invalide', description: 'Vérifiez votre échantillon.' });
    }
  };

  const previewRows = useMemo(() => {
    try {
      const json = JSON.parse(sampleText);
      let arr: any[] = [];
      if (Array.isArray(json) && typeof json[0] === 'object') {
        arr = json.slice(0, 5);
      } else if (json && typeof json === 'object') {
        const entries = Object.entries(json as Record<string, unknown>);
        const preferred = entries.find(([k, v]) => k === 'products' && Array.isArray(v) && typeof (v as any[])[0] === 'object');
        const firstArrayObj = preferred || entries.find(([_, v]) => Array.isArray(v) && typeof (v as any[])[0] === 'object');
        if (firstArrayObj) arr = (firstArrayObj[1] as any[]).slice(0, 5);
        else arr = [json];
      }
      return arr.map((row: any) => {
        const out: any = {};
        Object.entries(mappings).forEach(([src, dst]) => {
          if (dst) out[dst] = row[src];
        });
        return { src: row, dst: out };
      });
    } catch {
      return [];
    }
  }, [sampleText, mappings]);

  const resetMappings = () => setMappings({});

  const saveMapping = async () => {
    setSaving(true);
    try {
      await Api.mappingsSave({ tenant: DEFAULT_TENANT, status: 'active', schema: 'unified_product_v1', mappings, transforms: {} });
      toast({ title: 'Mapping sauvegardé', description: 'Version active mise à jour.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erreur de sauvegarde', description: 'Réessayez plus tard.' });
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Hero
        title="Mappings de données"
        subtitle="Reliez vos champs sources au schéma unifié pour une ingestion sans friction."
        actions={[]}
        variant="catalog"
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Button variant="outline" onClick={resetMappings}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                if (sourceFields.length === 0) { parseSample(); }
                const suggestPayload = {
                  tenant: DEFAULT_TENANT,
                  source_fields: sourceFields.map(f => ({ name: f.id, type: f.type })),
                  unified_schema: unifiedProductSchema.map(u => ({ id: u.id, label: u.label, type: u.type, required: u.required, description: u.description })),
                  locale: 'fr-FR',
                };
                const res = await Api.mappingSuggest(suggestPayload);
                const next: Record<string, string> = { ...mappings };
                res.suggestions?.forEach(s => { if (s.source && s.target) next[s.source] = s.target; });
                setMappings(next);
                toast({ title: 'Suggestions appliquées', description: 'Vérifiez et ajustez si besoin.' });
              } catch (e) {
                toast({ variant: 'destructive', title: 'Échec des suggestions', description: 'Vérifiez le webhook IA.' });
                console.error(e);
              }
            }}
          >
            Proposer IA
          </Button>
          <Button onClick={saveMapping} disabled={saving || Object.keys(mappings).length === 0} className="bg-primary hover:bg-primary-hover text-primary-foreground">
            <Save className="w-4 h-4 mr-2" />Sauvegarder et activer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Échantillon & Champs source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Échantillon (JSON)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <textarea value={sampleText} onChange={(e) => setSampleText(e.target.value)} className="w-full h-40 p-3 bg-muted rounded text-sm font-mono text-foreground" placeholder='Collez un objet ou un tableau JSON ici' />
              <div className="flex gap-2">
                <Button variant="outline" onClick={parseSample}><Upload className="w-4 h-4 mr-2" />Analyser</Button>
                <Button variant="outline" onClick={resetMappings}><RotateCcw className="w-4 h-4 mr-2" />Reset mapping</Button>
              </div>
              <div className="space-y-2">
                {sourceFields.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucun champ détecté</div>
                ) : (
                  sourceFields.map((f) => (
                    <div key={f.id} className="p-3 bg-card-hover rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground">{f.id}</div>
                        <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">{f.type}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Correspondances */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Correspondances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sourceFields.length === 0 ? (
                <div className="text-sm text-muted-foreground">Chargez un échantillon pour commencer</div>
              ) : (
                sourceFields.map((f) => (
                  <div key={f.id} className="flex items-center gap-3">
                    <div className="flex-1 text-sm font-medium text-foreground">{f.id}</div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <select
                        className="w-full p-2 bg-card-hover rounded border border-border text-sm"
                        value={mappings[f.id] ?? ''}
                        onChange={(e) => setMappings(prev => ({ ...prev, [f.id]: e.target.value }))}
                      >
                        <option value="">—</option>
                        {unifiedProductSchema.map(u => (
                          <option key={u.id} value={u.id}>{u.label} ({u.id})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schéma unifié */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Données unifiées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unifiedProductSchema.map((field) => (
                <div key={field.id} className={`p-3 bg-card-hover rounded-lg border ${Object.values(mappings).includes(field.id) ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="font-medium text-foreground">{field.label}</div>
                      {field.required && <div className="text-xs text-error">*</div>}
                    </div>
                    <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">{field.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aperçu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Aperçu (1–5 lignes)</CardTitle>
        </CardHeader>
        <CardContent>
          {previewRows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Aucun aperçu</div>
          ) : (
            <div className="space-y-3">
              {previewRows.map((row, idx) => (
                <div key={idx} className="p-3 bg-card-hover rounded-lg border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Source</div>
                  <pre className="text-sm font-mono overflow-x-auto text-foreground">{JSON.stringify(row.src, null, 2)}</pre>
                  <div className="text-xs text-muted-foreground mt-3 mb-1">Unifié</div>
                  <pre className="text-sm font-mono overflow-x-auto text-foreground">{JSON.stringify(row.dst, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Button onClick={saveMapping} disabled={saving || Object.keys(mappings).length === 0} className="bg-primary hover:bg-primary-hover text-primary-foreground">
              <Save className="w-4 h-4 mr-2" />Sauvegarder et activer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}