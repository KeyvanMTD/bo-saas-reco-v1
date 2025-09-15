import React from 'react';
import { Button } from '@/components/ui/button';

type HeroAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
};

export function Hero({
  title,
  subtitle,
  actions = [],
  rightSlot,
  variant = 'default',
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: HeroAction[];
  rightSlot?: React.ReactNode;
  variant?: 'default' | 'catalog' | 'preview' | 'ingestions' | 'runs' | 'performance';
}) {
  // Palette plus vive (bleu-violet) proche du design de référence
  const gradientByVariant: Record<string, string> = {
    default: 'from-[#4f46e5]/25 via-[#7c3aed]/25 to-[#60a5fa]/25', // indigo → violet → sky
    catalog: 'from-[#7c3aed]/25 via-[#6d28d9]/20 to-[#60a5fa]/25',
    preview: 'from-[#6366f1]/30 via-[#7c3aed]/25 to-[#6ee7f4]/20',
    ingestions: 'from-[#8b5cf6]/25 via-[#6366f1]/20 to-[#60a5fa]/20',
    runs: 'from-[#7c3aed]/25 via-[#6366f1]/20 to-[#6ee7f4]/20',
    performance: 'from-[#4f46e5]/30 via-[#7c3aed]/25 to-[#60a5fa]/25',
  };
  const gradient = gradientByVariant[variant] || gradientByVariant.default;
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradient} p-6 md:p-10 border border-border`}>
      {/* soft background rings / orbs */}
      <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-[#6d28d9]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[#60a5fa]/20 blur-3xl" />
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25),rgba(255,255,255,0)_60%)]" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm md:text-base text-muted-foreground">{subtitle}</p>
          )}
          {actions.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {actions.map((a, i) => (
                a.href ? (
                  <a key={i} href={a.href} target="_blank" rel="noreferrer">
                    <Button variant={a.variant || 'default'}>{a.label}</Button>
                  </a>
                ) : (
                  <Button key={i} variant={a.variant || 'default'} onClick={a.onClick}>{a.label}</Button>
                )
              ))}
            </div>
          )}
        </div>
        {rightSlot && (
          <div className="shrink-0">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

export default Hero;


