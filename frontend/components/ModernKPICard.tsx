'use client';

import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  trend?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  comparison?: string;
}

const colorStyles = {
  blue: 'from-blue-600/10 to-blue-600/5 border-blue-200/30',
  green: 'from-green-600/10 to-green-600/5 border-green-200/30',
  orange: 'from-orange-600/10 to-orange-600/5 border-orange-200/30',
  purple: 'from-purple-600/10 to-purple-600/5 border-purple-200/30',
  red: 'from-red-600/10 to-red-600/5 border-red-200/30',
};

const iconColors = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  orange: 'text-orange-600',
  purple: 'text-purple-600',
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
      className={`bg-gradient-to-br ${colorStyles[color]} border border-slate-200/30 rounded-2xl p-6 backdrop-blur-xl hover:shadow-xl transition-all duration-300 hover:scale-105 group`}
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
