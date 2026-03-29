"use client";

import { LeadListContent } from "@/components/LeadListContent";
import { Suspense } from "react";

export default function LeadListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-sm text-slate-600">Loading leads...</div>
        </div>
      }
    >
      <LeadListContent />
    </Suspense>
  );
}
