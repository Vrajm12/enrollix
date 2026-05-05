'use client';

import Sidebar from '@/components/Sidebar';
import { Clock3, ShieldCheck } from 'lucide-react';

export default function WhatsAppPage() {
  return (
    <div className="flex min-h-screen bg-[#f3f8ff]">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl border border-blue-100 bg-white p-8 shadow-sm">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Clock3 size={28} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">WhatsApp Feature Under Development</h1>
            <p className="mt-3 text-slate-600">
              This module is currently disabled for all tenants.
            </p>
            <p className="mt-2 text-slate-600">
              We will enable WhatsApp once your institute purchases and connects an external WhatsApp Business API.
            </p>

            <div className="mt-8 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 text-emerald-700" size={18} />
                <p className="text-sm text-emerald-900">
                  Current status: safely disabled to avoid partial or unconfigured messaging setup.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
