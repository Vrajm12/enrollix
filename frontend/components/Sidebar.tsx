'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  AlertCircle,
  Settings,
  Menu,
  X,
  MessageCircle,
  BarChart3,
  Package,
  LogOut,
  Shield,
} from 'lucide-react';
import { EnrollixLogoCompact } from '@/components/EnrollixLogo';
import { clearSession, getUser } from '@/lib/auth';

type MenuItem = {
  label: string;
  href: string;
  icon: any;
  section: string;
  badge?: number;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    setIsSuperAdmin(currentUser?.role === 'SUPER_ADMIN');
    setIsTenantAdmin(currentUser?.role === 'TENANT_ADMIN' || currentUser?.role === 'ADMIN');
  }, []);

  const menuItems: MenuItem[] = [
    ...(isSuperAdmin
      ? [
          {
            label: 'Super Admin',
            href: '/admin',
            icon: Shield,
            section: 'main',
          },
        ]
      : []),
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      section: 'main',
    },
    {
      label: 'Lead List',
      href: '/leads',
      icon: Users,
      section: 'main',
    },
    {
      label: 'My Follow-ups',
      href: '/followups',
      icon: MessageSquare,
      section: 'main',
    },
    {
      label: 'Failed Leads',
      href: '/failed',
      icon: AlertCircle,
      section: 'main',
    },
    {
      label: 'Bulk Actions',
      href: '/bulk-actions',
      icon: Package,
      section: 'tools',
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      section: 'tools',
    },
    {
      label: 'WhatsApp (Soon)',
      href: '/whatsapp',
      icon: MessageCircle,
      section: 'communication',
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      section: 'settings',
    },
    ...(isTenantAdmin
      ? [{ label: 'Teams', href: '/teams', icon: Users, section: 'settings' as const }]
      : []),
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '?');

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2.5 rounded-lg bg-blue-700 text-white shadow-lg hover:bg-blue-800 transition-all duration-200 hover:scale-105"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-60 bg-[#0e2f66] text-white overflow-y-auto transition-all duration-300 z-40 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 border-r border-blue-900/50`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-blue-900/50 bg-blue-900/20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg shadow-blue-500/30 group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
              <EnrollixLogoCompact size={40} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Guruverse</h1>
              <p className="text-xs text-blue-200 font-medium">Guruverse CRM</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-8">
          {/* Main Section */}
          <div>
            <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-4 px-3">
              Main
            </div>
            <div className="space-y-1.5">
              {menuItems
                .filter((item) => item.section === 'main')
                .map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                        active
                          ? 'bg-white text-blue-800 shadow-lg'
                          : 'text-blue-100 hover:bg-blue-800/70 hover:text-white'
                      }`}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="bg-red-500/80 text-white text-xs rounded-full px-2 py-1 font-bold backdrop-blur-sm">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>

          {/* Tools Section */}
          <div>
            <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-4 px-3">
              Tools
            </div>
            <div className="space-y-1.5">
              {menuItems
                .filter((item) => item.section === 'tools')
                .map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        active
                          ? 'bg-white text-blue-800 shadow-lg'
                          : 'text-blue-100 hover:bg-blue-800/70 hover:text-white'
                      }`}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="bg-green-500/80 text-white text-xs rounded-full px-2 py-1 font-bold">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>

          {/* Communication Section */}
          <div>
            <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-4 px-3">
              Communication
            </div>
            <div className="space-y-1.5">
              {menuItems
                .filter((item) => item.section === 'communication')
                .map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        active
                          ? 'bg-white text-blue-800 shadow-lg'
                          : 'text-blue-100 hover:bg-blue-800/70 hover:text-white'
                      }`}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="bg-red-500/80 text-white text-xs rounded-full px-2 py-1 font-bold backdrop-blur-sm">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>
        </nav>

        {/* Settings & Logout */}
        <div className="border-t border-blue-900/50 p-4 space-y-2">
          {menuItems
            .filter((item) => item.section === 'settings')
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-white text-blue-800 shadow-lg'
                      : 'text-blue-100 hover:bg-blue-800/70 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-100 hover:bg-blue-800/70 transition-all duration-200"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
