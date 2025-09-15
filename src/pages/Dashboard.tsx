import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';
import Hero from '@/components/Hero';
import { useQuery } from '@tanstack/react-query';
import { Api, DEFAULT_TENANT } from '@/lib/api';

type ApiRun = {
  id?: string;
  tenant?: string;
  type: string;
  status: string;
  counts?: { inserted?: number; updated?: number; failed?: number };
  started_at: string;
  ended_at?: string;
};

const normalizeStatus = (s: string) => {
  const x = s.toLowerCase();
  if (x === 'ok' || x === 'success' || x === 'completed') return 'success';
  if (x === 'warning' || x === 'partial') return 'warning';
  if (x === 'error' || x === 'failed') return 'error';
  return 'pending';
};

export default function Dashboard() {
  const { data: health, isLoading: loadingHealth } = useQuery({ queryKey: ['health'], queryFn: Api.health });
  const { data: runs } = useQuery({
    queryKey: ['runs', DEFAULT_TENANT, 'ingest', 20],
    queryFn: () => Api.runs({ tenant: DEFAULT_TENANT, type: 'ingest', limit: 20 }) as Promise<ApiRun[]>,
  });

  const sorted = (runs ?? []).slice().sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  const lastRun = sorted[0];
  const total = sorted.length;
  const success = sorted.filter(r => normalizeStatus(r.status) === 'success').length;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
  const processed = sorted.reduce((acc, r) => acc + (r.counts?.inserted ?? 0) + (r.counts?.updated ?? 0), 0);

  return (
    <div className="space-y-6">
      <Hero
        title="Bienvenue dans RecoAI"
        subtitle="Pilotez vos recommandations, vos ingestions et vos catalogues depuis un espace unifié."
        actions={[
          { label: 'Explorer', variant: 'default' },
          { label: 'Voir les runs', variant: 'outline', href: '/runs' },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Santé du service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {loadingHealth ? (
                <div className="text-2xl font-bold text-foreground">...</div>
              ) : (
                <>
                  {String(health?.status || '').toLowerCase() === 'ok' ? (
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  ) : (
                    <XCircle className="w-6 h-6 text-error" />
                  )}
                  <div className="text-2xl font-bold text-foreground uppercase">
                    {health?.status ?? '-'}
                  </div>
                </>
              )}
            </div>
            {('db' in (health || {}) || 'mongo' in (health || {})) && (
              <p className="text-xs text-muted-foreground mt-1">DB: {(health as any).db || (health as any).mongo}</p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dernier run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {lastRun ? new Date(lastRun.started_at).toLocaleString('fr-FR') : '-'}
            </div>
            {lastRun && (
              <p className="text-xs text-muted-foreground mt-1">Statut: {lastRun.status}</p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de succès (20 derniers)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{success} / {total} réussis</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produits traités
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{processed}</div>
            <p className="text-xs text-muted-foreground mt-1">Somme inserted + updated</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Derniers runs d'ingestion
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Aucune exécution à afficher</div>
          ) : (
            <div className="space-y-3">
              {sorted.slice(0, 8).map((run) => (
                <div key={(run.id ?? run.started_at) + run.status} className="flex items-center justify-between p-4 bg-card-hover rounded-lg border border-border">
                  <div>
                    <div className="font-medium text-foreground">{run.id ?? '—'}</div>
                    <div className="text-sm text-muted-foreground">{run.type} • {new Date(run.started_at).toLocaleString('fr-FR')}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-foreground">{(run.counts?.inserted ?? 0) + (run.counts?.updated ?? 0)} traités</div>
                    {run.counts?.failed ? (
                      <div className="text-error">{run.counts.failed} échecs</div>
                    ) : null}
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