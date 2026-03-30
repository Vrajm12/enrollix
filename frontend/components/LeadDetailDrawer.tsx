'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  X,
  Calendar,
} from 'lucide-react';
import { LEAD_STATUSES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { Lead, LeadStatus, Priority } from '@/lib/types';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePriority?: (leadId: number, priority: Priority) => Promise<void>;
  onUpdateStatus?: (leadId: number, status: LeadStatus) => Promise<void>;
  onCall?: (lead: Lead) => void;
  onWhatsApp?: (lead: Lead) => void;
  onEmail?: (lead: Lead) => void;
  isLoading?: boolean;
}

const PRIORITIES: Priority[] = ['COLD', 'WARM', 'HOT'];

export function LeadDetailDrawer({
  lead,
  open,
  onOpenChange,
  onUpdatePriority,
  onUpdateStatus,
  onCall,
  onWhatsApp,
  onEmail,
  isLoading = false,
}: LeadDetailDrawerProps) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[450px] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-white text-xl font-bold">{lead.name}</SheetTitle>
                <SheetDescription className="text-white/80 text-sm mt-1">
                  {lead.course}
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="p-0 h-auto text-white hover:bg-white/20"
              >
                <X size={20} />
              </Button>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Contact Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Contact Information</h3>

              <a
                href={`tel:${lead.phone}`}
                onClick={() => onCall?.(lead)}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Phone size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{lead.phone}</p>
                </div>
              </a>

              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  onClick={() => onEmail?.(lead)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-gray-200 transition-colors">
                    <Mail size={18} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{lead.email}</p>
                  </div>
                </a>
              )}

              {lead.address && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <MapPin size={18} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="text-sm font-medium text-gray-900">{lead.address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Lead Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Lead Information</h3>

              {lead.source && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-medium">Source:</span>
                  <Badge variant="outline" className="text-xs">
                    {lead.source}
                  </Badge>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Status & Priority */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Lead Status</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 font-medium mb-1 block">Status</label>
                  <Select
                    value={lead.status || 'LEAD'}
                    onValueChange={(value) => {
                      if (onUpdateStatus && value) {
                        void onUpdateStatus(lead.id, value as LeadStatus);
                      }
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-gray-600 font-medium mb-1 block">Priority</label>
                  <Select
                    value={lead.priority || 'COLD'}
                    onValueChange={(value) => {
                      if (onUpdatePriority && value) {
                        void onUpdatePriority(lead.id, value as Priority);
                      }
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Follow-up */}
            {lead.nextFollowUp && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Next Follow-up</h3>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Calendar size={16} className="text-blue-600" />
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Scheduled for</p>
                    <p className="text-sm font-semibold text-blue-900">
                      {formatDate(lead.nextFollowUp!)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="border-t border-gray-200 bg-white p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onCall?.(lead)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              disabled={isLoading}
            >
              <Phone size={16} className="mr-1" />
              Call
            </Button>

            <Button
              onClick={() => onWhatsApp?.(lead)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              disabled={isLoading}
            >
              <MessageCircle size={16} className="mr-1" />
              WhatsApp
            </Button>

            <Button
              onClick={() => onEmail?.(lead)}
              variant="outline"
              className="flex-1 rounded-lg"
              disabled={isLoading}
            >
              <Mail size={16} />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
