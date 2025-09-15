import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Eye, EyeOff, Plus, Trash2, Edit } from 'lucide-react';
import { useState } from 'react';
import Hero from '@/components/Hero';

type ApiKey = {
  id: string;
  name: string;
  value: string;
  created: string;
  lastUsed: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  status: 'Active' | 'Pending' | 'Disabled';
  lastLogin: string;
};

const apiKeys: ApiKey[] = [];

const users: User[] = [];

export default function Settings() {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [brandBoost, setBrandBoost] = useState([25]);
  const [pricePenalty, setPricePenalty] = useState([15]);
  const [stockWeight, setStockWeight] = useState([40]);

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const maskApiKey = (key: string) => {
    return key.substring(0, 12) + '•'.repeat(20) + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6">
      <Hero
        title="Paramètres"
        subtitle="Gérez votre tenant, vos clés API, vos règles et vos utilisateurs."
        variant="default"
      />

      {/* Tenant Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Informations tenant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName" className="text-sm font-medium text-foreground">
                Nom du tenant
              </Label>
              <Input id="tenantName" defaultValue="" placeholder="Nom du tenant" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantId" className="text-sm font-medium text-foreground">
                Tenant ID
              </Label>
              <Input id="tenantId" value="" disabled placeholder="—" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-foreground">
              Description
            </Label>
            <Input 
              id="description" 
              defaultValue="" 
              placeholder="Description" 
            />
          </div>
          <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
            Sauvegarder
          </Button>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Clés API
          </CardTitle>
          <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle clé
          </Button>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Aucune clé API
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 bg-card-hover rounded-lg border border-border"
                >
                  <div className="flex-1">
                    <div className="font-medium text-foreground mb-1">{key.name}</div>
                    <div className="font-mono text-sm text-muted-foreground mb-2">
                      {visibleKeys.has(key.id) ? key.value : maskApiKey(key.value)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Créée: {key.created} • Dernière utilisation: {key.lastUsed}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleKeyVisibility(key.id)}
                    >
                      {visibleKeys.has(key.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(key.value)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4 text-error" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendation Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Règles globales de recommandation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-foreground mb-3 block">
                Brand Boost: {brandBoost[0]}%
              </Label>
              <Slider
                value={brandBoost}
                onValueChange={setBrandBoost}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Boost pour les produits de la même marque
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-3 block">
                Price Penalty: {pricePenalty[0]}%
              </Label>
              <Slider
                value={pricePenalty}
                onValueChange={setPricePenalty}
                max={50}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pénalité pour les produits plus chers
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-3 block">
                Stock Weight: {stockWeight[0]}%
              </Label>
              <Slider
                value={stockWeight}
                onValueChange={setStockWeight}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Poids du stock disponible dans le score
              </p>
            </div>
          </div>

          <Separator />

          <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
            Appliquer les règles
          </Button>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Gestion des utilisateurs
          </CardTitle>
          <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Inviter utilisateur
          </Button>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Aucun utilisateur
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-card-hover rounded-lg border border-border"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-foreground">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge 
                      variant={user.role === 'Admin' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {user.role}
                    </Badge>
                    <Badge 
                      variant={user.status === 'Active' ? 'secondary' : 'outline'}
                      className={user.status === 'Active' ? 'text-success' : 'text-warning'}
                    >
                      {user.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground text-right">
                      <div>Dernière connexion:</div>
                      <div>{user.lastLogin}</div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4 text-error" />
                      </Button>
                    </div>
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