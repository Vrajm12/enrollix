'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lead } from '@/lib/types';

interface PipelineColumn {
  status: string;
  label: string;
  leads: Lead[];
  color?: string;
}

interface PipelineKanbanProps {
  columns: PipelineColumn[];
  onCall?: (lead: Lead) => void;
  onWhatsApp?: (lead: Lead) => void;
  onOpenLead?: (lead: Lead) => void;
  isLoading?: boolean;
}

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  COLD: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  WARM: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  HOT: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export function PipelineKanban({
  columns,
  onCall,
  onWhatsApp,
  onOpenLead,
  isLoading = false,
}: PipelineKanbanProps) {
  const renderLeadCard = (lead: Lead) => (
    <div
      key={lead.id}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover-lift space-y-3 cursor-pointer group"
      onClick={() => onOpenLead?.(lead)}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-base truncate">
            {lead.name}
          </p>
          <p className="text-xs text-gray-500 mt-1 truncate">{lead.phone}</p>
        </div>
      </div>

      {/* Course */}
      <p className="text-xs text-gray-600 line-clamp-2">{lead.course}</p>

      {/* Priority Badge */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            'text-xs font-medium border',
            PRIORITY_CONFIG[lead.priority]?.bg,
            PRIORITY_CONFIG[lead.priority]?.text,
            PRIORITY_CONFIG[lead.priority]?.border,
            'cursor-pointer'
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {lead.priority}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onCall?.(lead);
          }}
          disabled={isLoading}
          className="p-2 h-auto hover:bg-blue-100 flex-1"
        >
          <Phone size={14} className="text-blue-600" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onWhatsApp?.(lead);
          }}
          disabled={isLoading}
          className="p-2 h-auto hover:bg-green-100 flex-1"
        >
          <MessageCircle size={14} className="text-green-600" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLead?.(lead);
          }}
          disabled={isLoading}
          className="p-2 h-auto flex-1"
        >
          <ArrowRight size={14} className="text-gray-400" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mt-24 pb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Pipeline</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.status} className="space-y-4 min-w-[280px]">
            {/* Column Header */}
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-gray-900">{column.label}</h3>
              <Badge variant="secondary" className="ml-auto bg-gray-100 text-gray-700">
                {column.leads.length}
              </Badge>
            </div>

            {/* Cards Container */}
            <div className="space-y-3">
              {column.leads.length > 0 ? (
                column.leads.map((lead) => renderLeadCard(lead))
              ) : (
                <div className="text-center py-8 px-4 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200">
                  <p className="text-xs text-gray-500">No leads in this stage</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
