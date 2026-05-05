'use client';

import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  trend?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'cyan' | 'sky' | 'red';
  comparison?: string;
}

const colorStyles = {
  blue: 'from-blue-600/10 to-blue-500/5 border-blue-200/50',
  green: 'from-emerald-600/10 to-emerald-500/5 border-emerald-200/50',
  cyan: 'from-cyan-600/10 to-cyan-500/5 border-cyan-200/50',
  sky: 'from-sky-600/10 to-sky-500/5 border-sky-200/50',
  red: 'from-red-600/10 to-red-600/5 border-red-200/30',
};

const iconColors = {
  blue: 'text-blue-600',
  green: 'text-emerald-600',
  cyan: 'text-cyan-600',
  sky: 'text-sky-600',
  red: 'text-red-600',
};

export function ModernKPICard({
  title,
  value,
  trend,
  subtitle,
  icon,
  color = 'blue',
  comparison,
}: KPICardProps) {
  const isPositive = trend && trend > 0;

  return (
    <div
      className={`bg-gradient-to-br ${colorStyles[color]} border rounded-2xl p-6 bg-white hover:shadow-md transition-all duration-300 hover:translate-y-[-1px] group`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              {title}
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          </div>
          {icon && <div className={`${iconColors[color]} opacity-50 group-hover:opacity-100 transition-opacity`}>{icon}</div>}
        </div>

        {/* Trend & Comparison */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/20">
          {trend !== undefined && (
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? (
                <TrendingUp size={16} />
              ) : (
                <TrendingDown size={16} />
              )}
              <span className="text-sm font-semibold">{Math.abs(trend)}%</span>
            </div>
          )}
          {comparison && <p className="text-xs text-slate-500">{comparison}</p>}
        </div>

        {/* Mini Sparkline visualization */}
        <div className="flex items-end gap-1 h-8">
          {[65, 45, 72, 56, 89, 73, 92].map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-blue-400/40 to-blue-600/20 rounded-t opacity-60 hover:opacity-100 transition-opacity"
              style={{ height: `${(height / 100) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
