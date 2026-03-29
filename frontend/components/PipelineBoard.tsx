"use client";

import { LEAD_STATUSES } from "@/lib/constants";
import { Lead, LeadStatus } from "@/lib/types";
import { LeadCard } from "./LeadCard";

type PipelineBoardProps = {
  leads: Lead[];
  onStageMove: (leadId: number, status: LeadStatus) => Promise<void>;
  onOpenLead: (leadId: number) => void;
};

export default function PipelineBoard({
  leads,
  onStageMove,
  onOpenLead
}: PipelineBoardProps) {
  const grouped = LEAD_STATUSES.map((stage) => ({
    ...stage,
    leads: leads.filter((lead) => lead.status === stage.value)
  }));

  return (
    <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-2 xl:grid-cols-6">
      {grouped.map((column) => (
        <section
          key={column.value}
          className="min-h-[400px] rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm"
          onDragOver={(event) => event.preventDefault()}
          onDrop={async (event) => {
            event.preventDefault();
            const leadId = Number(event.dataTransfer.getData("leadId"));
            if (!leadId) return;
            await onStageMove(leadId, column.value);
          }}
        >
          <header className="mb-4 flex items-center justify-between sticky top-0 bg-slate-50 pb-2">
            <h3 className="text-sm font-semibold text-slate-700">{column.label}</h3>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
              {column.leads.length}
            </span>
          </header>

          <div className="space-y-3">
            {column.leads.map((lead) => (
              <div
                key={lead.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("leadId", String(lead.id));
                }}
                onDragEnd={(event) => {
                  event.dataTransfer.dropEffect = "move";
                }}
              >
                <LeadCard
                  lead={lead}
                  onClick={() => onOpenLead(lead.id)}
                  showFollowup={true}
                />
              </div>
            ))}

            {column.leads.length === 0 && (
              <div className="rounded-md border-2 border-dashed border-slate-300 p-6 text-center">
                <p className="text-xs text-slate-400">No leads yet</p>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
