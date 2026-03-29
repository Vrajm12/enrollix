'use client';

interface Stage {
  name: string;
  count: number;
  color: string;
}

interface PipelineProgressProps {
  stages: Stage[];
  total: number;
}

export function PipelineProgress({ stages, total }: PipelineProgressProps) {
  return (
    <div className="bg-gradient-to-br from-slate-900/5 to-slate-900/10 border border-slate-200/30 rounded-2xl p-8 backdrop-blur-xl">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900">Pipeline Distribution</h2>
        <p className="text-sm text-slate-500 mt-1">Leads across all stages</p>
      </div>

      {/* Horizontal bar */}
      <div className="mb-8">
        <div className="flex h-10 rounded-lg overflow-hidden border border-slate-200/30 shadow-md">
          {stages.map((stage) => (
            <div
              key={stage.name}
              className={`${stage.color} flex items-center justify-center border-r border-white/20 last:border-r-0 hover:opacity-80 transition-opacity cursor-pointer group relative`}
              style={{ width: `${(stage.count / total) * 100}%` }}
              title={`${stage.name}: ${stage.count}`}
            >
              {(stage.count / total) * 100 > 10 && (
                <span className="text-xs font-bold text-white opacity-75 group-hover:opacity-100">
                  {((stage.count / total) * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stages.map((stage) => (
          <div key={stage.name} className="flex items-center gap-3 p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors cursor-pointer">
            <div className={`w-3 h-3 rounded-full ${stage.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-600 font-semibold truncate">{stage.name}</p>
              <p className="text-sm font-bold text-slate-900">{stage.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 pt-6 border-t border-slate-200/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Pipeline Value</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              ${(total * 15000).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Average Deal Size</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              ${(15000).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
