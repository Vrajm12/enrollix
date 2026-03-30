'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Globe, Lock, MessageSquare, Save, Settings2, Shield, UserCircle2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { clearSession, getToken, getUser } from '@/lib/auth';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';

type SettingsState = {
  displayName: string;
  email: string;
  role: User['role'] | '';
  dailySummary: boolean;
  followUpReminders: boolean;
  whatsappAlerts: boolean;
  autoAssignNewLeads: boolean;
  defaultLandingPage: string;
  timezone: string;
};

const SETTINGS_STORAGE_KEY = 'education_crm_settings';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({
    displayName: '',
    email: '',
    role: '',
    dailySummary: true,
    followUpReminders: true,
    whatsappAlerts: true,
    autoAssignNewLeads: false,
    defaultLandingPage: '/dashboard',
    timezone: 'Asia/Kolkata',
  });

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    const currentUser = getUser();
    if (!currentUser) {
      clearSession();
      router.replace('/login');
      return;
    }

    setUser(currentUser);

    const stored = typeof window !== 'undefined' ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        setSettings((current) => ({
          ...current,
          ...parsed,
          displayName: parsed.displayName ?? currentUser.name,
          email: parsed.email ?? currentUser.email,
          role: parsed.role ?? currentUser.role,
        }));
        return;
      } catch {
        // Fall through to defaults below.
      }
    }

    setSettings((current) => ({
      ...current,
      displayName: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
    }));
  }, [router]);

  const initials = useMemo(() => {
    if (!settings.displayName) return 'E';
    return settings.displayName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [settings.displayName]);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSaved(false);
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="flex bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 md:ml-60 flex flex-col">
        <div className="flex-1 overflow-auto py-8 md:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  <Settings2 size={14} />
                  Workspace Settings
                </p>
                <h1 className="text-4xl font-bold text-slate-900">Settings</h1>
                <p className="mt-2 text-slate-600">Manage profile details, notifications, and CRM preferences in one place.</p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-11 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700"
              >
                {saving ? <Save size={16} className="mr-2 animate-pulse" /> : <Save size={16} className="mr-2" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {saved && (
              <div className="mb-8 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                <Check size={16} />
                Settings saved on this device.
              </div>
            )}

            <div className="grid gap-8 xl:grid-cols-[1.15fr,0.85fr]">
              <section className="space-y-8">
                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-500/20">
                      {initials}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Profile</h2>
                      <p className="mt-1 text-sm text-slate-600">Keep your account details up to date for clearer team collaboration.</p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Display Name</label>
                      <Input
                        value={settings.displayName}
                        onChange={(e) => updateSetting('displayName', e.target.value)}
                        className="h-11 rounded-xl border-slate-200 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                      <Input
                        value={settings.email}
                        onChange={(e) => updateSetting('email', e.target.value)}
                        className="h-11 rounded-xl border-slate-200 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
                      <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700">
                        {settings.role || user?.role || 'COUNSELOR'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => updateSetting('timezone', e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata</option>
                        <option value="Asia/Dubai">Asia/Dubai</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="America/New_York">America/New_York</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-start gap-3">
                    <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
                      <p className="mt-1 text-sm text-slate-600">Choose what updates should reach you while you work through leads.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        key: 'dailySummary' as const,
                        title: 'Daily summary email',
                        description: 'Receive a quick summary of pipeline movement and conversions.',
                      },
                      {
                        key: 'followUpReminders' as const,
                        title: 'Follow-up reminders',
                        description: 'Get prompted before today’s follow-ups slip past schedule.',
                      },
                      {
                        key: 'whatsappAlerts' as const,
                        title: 'WhatsApp conversation alerts',
                        description: 'Surface unread WhatsApp conversations inside the CRM shell.',
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-slate-50"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateSetting(item.key, !settings[item.key])}
                          className={`relative mt-1 h-7 w-12 rounded-full transition ${
                            settings[item.key] ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                          aria-pressed={settings[item.key]}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                              settings[item.key] ? 'left-6' : 'left-1'
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              <aside className="space-y-8">
                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                      <Globe size={18} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Workspace Preferences</h2>
                      <p className="mt-1 text-sm text-slate-600">Tune the CRM to match your team’s daily rhythm.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Default landing page</label>
                      <select
                        value={settings.defaultLandingPage}
                        onChange={(e) => updateSetting('defaultLandingPage', e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      >
                        <option value="/dashboard">Dashboard</option>
                        <option value="/leads">Lead List</option>
                        <option value="/followups">My Follow-ups</option>
                        <option value="/analytics">Analytics</option>
                      </select>
                    </div>

                    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-900">Auto-assign new leads</p>
                        <p className="mt-1 text-sm text-slate-600">Automatically route incoming leads to the active counselor queue.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSetting('autoAssignNewLeads', !settings.autoAssignNewLeads)}
                        className={`relative mt-1 h-7 w-12 rounded-full transition ${
                          settings.autoAssignNewLeads ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                        aria-pressed={settings.autoAssignNewLeads}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                            settings.autoAssignNewLeads ? 'left-6' : 'left-1'
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Security & Integrations</h2>
                      <p className="mt-1 text-sm text-slate-600">Quick visibility into the tools that power the workflow.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { icon: UserCircle2, label: 'Account session', value: 'Active on this browser', tone: 'text-emerald-600 bg-emerald-50' },
                      { icon: MessageSquare, label: 'WhatsApp channel', value: 'Configured in CRM', tone: 'text-blue-600 bg-blue-50' },
                      { icon: Lock, label: 'JWT security', value: 'Protected by backend auth', tone: 'text-violet-600 bg-violet-50' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-xl p-2.5 ${item.tone}`}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{item.label}</p>
                              <p className="text-sm text-slate-600">{item.value}</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            OK
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
