'use client';

import { Phone, MessageCircle, Mail, FileText, CheckCircle2 } from 'lucide-react';

interface Activity {
  id: number;
  type: 'call' | 'whatsapp' | 'email' | 'note' | 'status';
  title: string;
  description: string;
  timestamp: string;
  leadName: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const iconMap = {
  call: { icon: Phone, color: 'bg-blue-100 text-blue-600' },
  whatsapp: { icon: MessageCircle, color: 'bg-green-100 text-green-600' },
  email: { icon: Mail, color: 'bg-purple-100 text-purple-600' },
  note: { icon: FileText, color: 'bg-yellow-100 text-yellow-600' },
  status: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <div className="bg-gradient-to-br from-slate-900/5 to-slate-900/10 border border-slate-200/30 rounded-2xl p-8 backdrop-blur-xl">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900">Recent Activities</h2>
        <p className="text-sm text-slate-500 mt-1">Last 10 actions across your leads</p>
      </div>

      <div className="space-y-6">
        {activities.slice(0, 6).map((activity, index) => {
          const { icon: Icon, color } = iconMap[activity.type];

          return (
            <div key={activity.id} className="flex gap-4 group cursor-pointer">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow`}>
                  <Icon size={18} />
                </div>
                {index < activities.length - 1 && (
                  <div className="w-0.5 h-16 bg-gradient-to-b from-slate-300/50 to-transparent mt-2" />
                )}
              </div>

              {/* Activity content */}
              <div className="flex-1 py-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      <span className="font-medium">{activity.leadName}</span> · {activity.timestamp}
                    </p>
                  </div>
                </div>
                {/* Hover effect on background */}
                <div className="absolute inset-0 bg-slate-100/0 group-hover:bg-slate-100/30 rounded-lg -z-10 transition-colors duration-300" />
              </div>
            </div>
          );
        })}
      </div>

      {/* View all button */}
      <button className="w-full mt-8 py-3 px-4 rounded-lg border border-slate-200/30 text-slate-600 font-medium text-sm hover:bg-slate-100/50 transition-all duration-200">
        View All Activities
      </button>
    </div>
  );
}
