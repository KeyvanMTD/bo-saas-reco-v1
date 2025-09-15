import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, RefreshCw, Calendar, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Api, DEFAULT_TENANT } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Hero from '@/components/Hero';

type ApiRun = {
  id: string;
  tenant: string;
  type: string;
  status: string;
  counts?: { inserted?: number; updated?: number; failed?: number };
  started_at: string;
  ended_at?: string;
};

export default function Ingestions() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [feedUrl, setFeedUrl] = useState('');
  const { data: runs, isLoading } = useQuery({
    queryKey: ['runs', DEFAULT_TENANT, 'ingest'],
    queryFn: () => Api.runs({ tenant: DEFAULT_TENANT, type: 'ingest', limit: 20 }),
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
      case 'ok':
        return 'Completed';
      case 'warning':
        return 'Partial';
      case 'error':
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };
  // KPIs calculés à partir des vrais runs
  const { lastRunText, successRate24h, processed24h } = useMemo(() => {
    const list: ApiRun[] = Array.isArray(runs) ? runs.slice() : [];
    // tri desc par date de début
    list.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    const last = list[0];
    const lastRunText = last ? `${formatDate(last.started_at)}${last.ended_at ? ` → ${formatDate(last.ended_at)}` : ''}` : '—';

    const now = Date.now();
    const in24h = list.filter((r) => now - new Date(r.started_at).getTime() <= 24 * 60 * 60 * 1000);
    const total24h = in24h.length;
    const ok24h = in24h.filter((r) => (r.status === 'ok' || r.status === 'success')).length;
    const successRate24h = total24h > 0 ? Math.round((ok24h / total24h) * 1000) / 10 : 0; // 0.1%

    let processed24h = 0;
    for (const r of in24h) {
      const inserted = r.counts?.inserted ?? 0;
      const updated = r.counts?.updated ?? 0;
      processed24h += inserted + updated;
    }
    return { lastRunText, successRate24h, processed24h };
  }, [runs]);


  const handleStartIngestion = async () => {
    if (!feedUrl) return;
    try {
      await Api.ingestStart({ tenant: DEFAULT_TENANT, feed_url: feedUrl, feed_type: 'json', batch_size: 100, dry_run: false });
      toast({ title: 'Ingestion démarrée', description: 'Le run a été lancé avec succès.' });
      queryClient.invalidateQueries({ queryKey: ['runs', DEFAULT_TENANT, 'ingest'] });
    } catch (e) {
      toast({ variant: 'destructive', title: "Échec de l'ingestion", description: 'Vérifiez le feed et réessayez.' });
      console.error(e);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      toast({ variant: 'destructive', title: 'Format invalide', description: 'Veuillez sélectionner un fichier .json' });
      e.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await Api.ingestStart({ tenant: DEFAULT_TENANT, feed_inline: json, feed_type: 'json', batch_size: 100, dry_run: false });
      toast({ title: 'Ingestion démarrée', description: `${file.name} envoyé avec succès.` });
      queryClient.invalidateQueries({ queryKey: ['runs', DEFAULT_TENANT, 'ingest'] });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur lors de l\'import', description: 'Vérifiez que le JSON est valide.' });
      console.error(err);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Hero
        variant="ingestions"
        title="Ingestions de données"
        subtitle="Importez vos produits, mappez vos champs et lancez vos flux en toute confiance."
        actions={[{ label: 'Planifier', variant: 'outline' }, { label: 'Importer JSON', variant: 'default', onClick: handleUploadClick }]}
      />
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileSelected} />

      {/* Démarrer via URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Démarrer via URL</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <Input placeholder="https://example.com/feed.json" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} />
          </div>
          <div>
            <Button className="w-full bg-primary hover:bg-primary-hover text-primary-foreground" onClick={handleStartIngestion} disabled={!feedUrl}>
              <Play className="w-4 h-4 mr-2" />
              Lancer ingestion
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dernière ingestion</p>
                <p className="text-2xl font-bold text-foreground">{lastRunText}</p>
                <p className="text-xs text-muted-foreground mt-1">Basé sur l'historique des runs</p>
              </div>
              <div className="p-3 bg-success-light rounded-full">
                <RefreshCw className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux de succès (24h)</p>
                <p className="text-2xl font-bold text-foreground">{successRate24h.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Sur les dernières 24h</p>
              </div>
              <div className="p-3 bg-warning-light rounded-full">
                <RefreshCw className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Produits traités</p>
                <p className="text-2xl font-bold text-foreground">{processed24h.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-muted-foreground mt-1">Somme inserted + updated (24h)</p>
              </div>
              <div className="p-3 bg-success-light rounded-full">
                <RefreshCw className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Historique des runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Chargement…</div>
          ) : !runs || runs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Aucun historique d'ingestion à afficher
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run: ApiRun) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-4 bg-card-hover rounded-lg border border-border hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-xs px-2 py-1 rounded-full border border-border text-muted-foreground">
                      {getStatusLabel(run.status)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{run.id}</div>
                      <div className="text-sm text-muted-foreground">
                        {run.type}
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center space-x-8">
                    {run.counts?.inserted !== undefined && (
                      <div className="text-center">
                        <div className="text-sm font-medium text-success">{run.counts.inserted}</div>
                        <div className="text-xs text-muted-foreground">Inserted</div>
                      </div>
                    )}
                    {run.counts?.updated !== undefined && (
                      <div className="text-center">
                        <div className="text-sm font-medium text-warning">{run.counts.updated}</div>
                        <div className="text-xs text-muted-foreground">Updated</div>
                      </div>
                    )}
                    {run.counts?.failed !== undefined && run.counts.failed > 0 && (
                      <div className="text-center">
                        <div className="text-sm font-medium text-error">{run.counts.failed}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">
                      {formatDate(run.started_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {run.ended_at ? `to ${formatDate(run.ended_at)}` : ''}
                    </div>
                  </div>

                  <Button variant="outline" size="sm">
                    Détails
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}