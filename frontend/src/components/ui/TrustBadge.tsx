import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, AlertTriangle } from 'lucide-react';
import { cn, getTrustLabel, getTrustStatus } from '../../lib/utils';

interface TrustBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

const icons = {
  trusted: ShieldCheck,
  good: Shield,
  caution: AlertTriangle,
  high_risk: ShieldAlert,
  unknown: ShieldX,
  blocked: ShieldX,
};

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  score,
  size = 'md',
  showScore = true,
  className,
}) => {
  const status = getTrustStatus(score);
  const label = getTrustLabel(score);
  const Icon = icons[status as keyof typeof icons] || Shield;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const iconSizes = { sm: 12, md: 14, lg: 18 };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        `trust-badge-${status}`,
        sizeClasses[size],
        className
      )}
    >
      <Icon size={iconSizes[size]} />
      {label}
      {showScore && <span className="opacity-70">({score}/100)</span>}
    </span>
  );
};
