'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { formatDate, isOverdue, getPriorityColor } from '@/lib/utils';
import { Lead } from '@/lib/types';

interface FollowupsSectionProps {
  todayFollowups: Lead[];
  missedFollowups: Lead[];
  onCall?: (lead: Lead) => void;
  onWhatsApp?: (lead: Lead) => void;
  onOpenLead?: (lead: Lead) => void;
  isLoading?: boolean;
}

export function FollowupsSection({
  todayFollowups,
  missedFollowups,
  onCall,
  onWhatsApp,
  onOpenLead,
  isLoading = false,
}: FollowupsSectionProps) {
  const renderLeadRow = (lead: Lead, isMissed = false) => (
    <div
      key={lead.id}
      className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-base ${
        isMissed ? 'bg-red-50' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{lead.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">{lead.phone}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500 truncate">{lead.course}</span>
        </div>
        {isMissed && lead.nextFollowUp && (
          <p className="text-xs text-red-600 mt-1 font-medium">
            Missed on{' '}
            {new Date(lead.nextFollowUp!).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 ml-3">
        {lead.priority && (
          <Badge
            variant="outline"
            className={`text-xs font-medium ${
              lead.priority === 'HOT'
                ? 'badge-hot'
                : lead.priority === 'WARM'
                ? 'badge-warm'
                : 'badge-cold'
            }`}
          >
            {lead.priority}
          </Badge>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onCall?.(lead)}
          disabled={isLoading}
          className="p-2 h-auto hover:bg-blue-100"
        >
          <Phone size={16} className="text-blue-600" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onWhatsApp?.(lead)}
          disabled={isLoading}
          className="p-2 h-auto hover:bg-green-100"
        >
          <MessageCircle size={16} className="text-green-600" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onOpenLead?.(lead)}
          disabled={isLoading}
          className="p-2 h-auto"
        >
          <ArrowRight size={16} className="text-gray-400" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 mt-24 pb-8">
      {/* Missed Followups Alert */}
      {missedFollowups && missedFollowups.length > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50/30">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-red-600" />
              <h2 className="text-lg font-bold text-red-900">Missed Follow-ups</h2>
              <Badge className="ml-auto bg-red-100 text-red-700 border-0">
                {missedFollowups.length}
              </Badge>
            </div>

            {missedFollowups.length > 0 ? (
              <div className="space-y-0 divide-y divide-gray-200">
                {missedFollowups.map((lead) => renderLeadRow(lead, true))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">All caught up!</p>
            )}
          </div>
        </Card>
      )}

      {/* Today's Followups */}
      {todayFollowups && todayFollowups.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <h2 className="text-lg font-bold text-gray-900">Today's Follow-ups</h2>
              <Badge className="ml-auto bg-blue-100 text-blue-700 border-0">
                {todayFollowups.length}
              </Badge>
            </div>

            {todayFollowups.length > 0 ? (
              <div className="space-y-0 divide-y divide-gray-200">
                {todayFollowups.map((lead) => renderLeadRow(lead, false))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No follow-ups for today</p>
            )}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {(!todayFollowups || todayFollowups.length === 0) &&
        (!missedFollowups || missedFollowups.length === 0) && (
          <Card>
            <div className="p-12 text-center">
              <p className="text-gray-500">No follow-ups scheduled</p>
              <p className="text-xs text-gray-400 mt-1">
                Add follow-up dates to leads to see them here
              </p>
            </div>
          </Card>
        )}
    </div>
  );
}
