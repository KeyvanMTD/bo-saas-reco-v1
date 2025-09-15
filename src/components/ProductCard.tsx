import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export type ProductCardProps = {
  id: string;
  name?: string;
  imageUrl?: string;
  brand?: string;
  price?: number;
  currency?: string;
  score?: number; // 0..1
};

function formatPrice(price?: number, currency?: string) {
  if (price === undefined) return null;
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR' }).format(price);
  } catch {
    return `${price}${currency ? ` ${currency}` : ''}`;
  }
}

export const ProductCard: React.FC<ProductCardProps> = ({ id, name, imageUrl, brand, price, currency, score }) => {
  const percent = typeof score === 'number' ? Math.max(0, Math.min(100, Math.round(score * 100))) : undefined;
  return (
    <div className="p-4 bg-card rounded-xl border border-border flex items-center gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="w-16 h-16 rounded bg-muted overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name || id} className="w-full h-full object-cover" />
        ) : (
          <div className="text-xs text-muted-foreground">Aperçu</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate">
            <div className="font-medium text-foreground truncate">{name || id}</div>
            {brand && <div className="text-xs text-muted-foreground truncate">{brand}</div>}
          </div>
          {typeof percent === 'number' && (
            <Badge variant="secondary" className="font-mono">{percent}%</Badge>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="text-sm text-foreground">{formatPrice(price, currency) || ''}</div>
          {typeof percent === 'number' && (
            <div className="flex-1">
              <Progress value={percent} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
