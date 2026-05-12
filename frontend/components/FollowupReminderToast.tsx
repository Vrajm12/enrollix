"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import { api } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";
import { Lead } from "@/lib/types";

type ReminderItem = {
  id: string;
  leadId: number;
  leadName: string;
  followupAt: string;
  minutesLeft: number;
};

const POLL_INTERVAL_MS = 60 * 1000;
const REMINDER_WINDOW_MINUTES = 30;
const STORAGE_PREFIX = "followup_reminded";

const getDayKey = () => new Date().toISOString().slice(0, 10);

export default function FollowupReminderToast() {
  const pathname = usePathname();
  const [items, setItems] = useState<ReminderItem[]>([]);
  const reminderStoreKey = useMemo(() => `${STORAGE_PREFIX}_${getDayKey()}`, []);

  useEffect(() => {
    if (pathname === "/login") {
      return;
    }
    if (!getUser() || !getToken()) {
      return;
    }

    let timer: NodeJS.Timeout | null = null;

    const readNotifiedIds = () => {
      try {
        const raw = localStorage.getItem(reminderStoreKey);
        if (!raw) return new Set<string>();
        return new Set<string>(JSON.parse(raw) as string[]);
      } catch {
        return new Set<string>();
      }
    };

    const saveNotifiedIds = (ids: Set<string>) => {
      localStorage.setItem(reminderStoreKey, JSON.stringify(Array.from(ids)));
    };

    const toReminder = (lead: Lead, now: Date): ReminderItem | null => {
      if (!lead.nextFollowUp) return null;
      const followupAt = new Date(lead.nextFollowUp);
      const diffMs = followupAt.getTime() - now.getTime();
      const minutesLeft = Math.floor(diffMs / (60 * 1000));
      if (minutesLeft < 0 || minutesLeft > REMINDER_WINDOW_MINUTES) {
        return null;
      }

      return {
        id: `${lead.id}_${followupAt.toISOString()}`,
        leadId: lead.id,
        leadName: lead.name,
        followupAt: followupAt.toISOString(),
        minutesLeft
      };
    };

    const loadReminders = async () => {
      try {
        const leads = await api.getTodayFollowups();
        const now = new Date();
        const notified = readNotifiedIds();
        const newItems: ReminderItem[] = [];

        for (const lead of leads) {
          const reminder = toReminder(lead, now);
          if (!reminder) continue;
          if (notified.has(reminder.id)) continue;
          notified.add(reminder.id);
          newItems.push(reminder);
        }

        if (newItems.length > 0) {
          saveNotifiedIds(notified);
          setItems((prev) => [...newItems, ...prev].slice(0, 5));
        }
      } catch {
        // Silent fail: reminder should never block normal app usage.
      }
    };

    void loadReminders();
    timer = setInterval(() => {
      void loadReminders();
    }, POLL_INTERVAL_MS);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pathname, reminderStoreKey]);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[92vw] flex-col gap-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-cyan-200 bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Bell className="mt-0.5 h-4 w-4 text-cyan-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Follow-up Reminder</p>
                <p className="text-sm text-slate-700">
                  {item.leadName} in {item.minutesLeft} min
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(item.followupAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short"
                  })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((entry) => entry.id !== item.id))}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Dismiss reminder"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
