import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Api, DEFAULT_TENANT } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import Hero from '@/components/Hero';
import { CheckCircle2, XCircle, AlertTriangle, Clock3 } from 'lucide-react';

type ApiRun = {
  id?: string;
  tenant?: string;
  type: string;
  status: string;
  counts?: { inserted?: number; updated?: number; failed?: number };
  started_at: string;
  ended_at?: string;
};

export default function Runs() {
  const [type, setType] = useState<string>('ingest');
  const [limit, setLimit] = useState<string>('20');

  const { data: runs, isLoading } = useQuery({
    queryKey: ['runs', DEFAULT_TENANT, type, limit],
    queryFn: () => Api.runs({ tenant: DEFAULT_TENANT, type, limit: parseInt(limit) }),
  });

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('fr-FR');
  };

  const statusClass = (s: string) => {
    if (s === 'success' || s === 'completed') return 'text-success';
    if (s === 'warning' || s === 'partial') return 'text-warning';
    if (s === 'error' || s === 'failed') return 'text-error';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <Hero
        variant="runs"
        title="Historique des runs"
        subtitle="Explorez les exécutions d’ingestion et de recommandations."
      />

      <Card className="sticky top-16 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingest">Ingestion</SelectItem>
                  <SelectItem value="recommendations">Recommandations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Limit</label>
              <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="20" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Résultats</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-muted/40 animate-pulse h-20" />
              ))}
            </div>
          ) : !runs || runs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">Aucun run</div>
          ) : (
            <div className="space-y-3">
              {runs.map((run: ApiRun, idx: number) => (
                <div
                  key={run.id ?? `${run.type}-${run.started_at}-${idx}`}
                  className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      {statusClass(run.status) === 'text-success' ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : statusClass(run.status) === 'text-error' ? (
                        <XCircle className="w-5 h-5 text-error" />
                      ) : statusClass(run.status) === 'text-warning' ? (
                        <AlertTriangle className="w-5 h-5 text-warning" />
                      ) : (
                        <Clock3 className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{run.type}</div>
                      <div className="text-xs text-muted-foreground">{run.id ?? '—'} • {run.tenant ? `${run.tenant} • ` : ''}{(() => { const diff = Date.now() - new Date(run.started_at).getTime(); const m = Math.round(diff/60000); if (m<60) return `il y a ${m} min`; const h=Math.round(m/60); if (h<24) return `il y a ${h} h`; const d=Math.round(h/24); return `il y a ${d} j`; })()}</div>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-success">{run.counts?.inserted ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Insérés</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-warning">{run.counts?.updated ?? 0}</div>
                      <div className="text-xs text-muted-foreground">MàJ</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-medium ${run.counts?.failed ? 'text-error' : 'text-muted-foreground'}`}>{run.counts?.failed ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Échecs</div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className={`font-medium ${statusClass(run.status)}`}>{run.status}</div>
                    <div className="text-muted-foreground">{new Date(run.started_at).toLocaleString('fr-FR')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


