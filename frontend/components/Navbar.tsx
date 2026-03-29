'use client';

import { Plus, LogOut, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnrollixLogo } from '@/components/EnrollixLogo';
import { useState } from 'react';

interface NavbarProps {
  onAddLead: () => void;
  onLogout: () => void;
}

export function Navbar({ onAddLead, onLogout }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 md:ml-60 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Left: Brand with Logo */}
        <div className="flex items-center gap-4">
          <EnrollixLogo size="md" animated={true} />
          <div className="hidden sm:block text-xs text-slate-500 font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Button 
            onClick={onAddLead}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg px-4 py-2.5 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Lead</span>
          </Button>

          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2.5 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-110"
            >
              <UserCircle size={24} className="text-blue-600" />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white border border-slate-200/50 rounded-xl shadow-xl backdrop-blur-sm animate-slide-down">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Menu</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 text-left group"
                >
                  <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
