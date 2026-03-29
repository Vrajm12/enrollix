'use client';

import { useState, useEffect } from 'react';
import WhatsAppChat from '@/components/WhatsAppChat';
import { MessageSquare, MoreVertical, Plus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function WhatsAppPage() {
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [messageStats, setMessageStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const stats = await api.getMessagingStats();
      setMessageStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (message: string, leadId: number) => {
    try {
      await api.sendWhatsApp(leadId, message);
      await loadStats();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="flex bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
      <main className="flex-1 flex flex-col">
        <div className="pt-20 pb-12 flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-slate-900">WhatsApp Business</h1>
                  <p className="text-slate-600 mt-2">Manage customer conversations and send bulk messages</p>
                </div>
                <button
                  onClick={() => setShowNewConversation(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  New Chat
                </button>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 overflow-hidden">
              <WhatsAppChat contactId={1} onSendMessage={handleSendMessage} />
            </div>

            {/* Quick Stats */}
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-red-600 text-center py-4">{error}</div>
            ) : (
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="bg-white border border-slate-200/50 rounded-xl p-4 text-center">
                  <p className="text-sm text-slate-600 mb-1">Total Messages</p>
                  <p className="text-2xl font-bold text-slate-900">{(messageStats?.whatsapp?.total || 0) + (messageStats?.sms?.total || 0)}</p>
                </div>
                <div className="bg-white border border-slate-200/50 rounded-xl p-4 text-center">
                  <p className="text-sm text-slate-600 mb-1">WhatsApp Sent</p>
                  <p className="text-2xl font-bold text-green-600">{messageStats?.whatsapp?.total || 0}</p>
                </div>
                <div className="bg-white border border-slate-200/50 rounded-xl p-4 text-center">
                  <p className="text-sm text-slate-600 mb-1">SMS Sent</p>
                  <p className="text-2xl font-bold text-blue-600">{messageStats?.sms?.total || 0}</p>
                </div>
                <div className="bg-white border border-slate-200/50 rounded-xl p-4 text-center">
                  <p className="text-sm text-slate-600 mb-1">Delivery Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {messageStats?.whatsapp?.deliveryRate
                      ? messageStats.whatsapp.deliveryRate.toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Start New Conversation</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Lead Name or Phone</label>
                <input
                  type="text"
                  placeholder="Search lead..."
                  className="w-full px-4 py-2 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Initial Message</label>
                <textarea
                  placeholder="Your message..."
                  className="w-full px-4 py-2 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                  rows={4}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewConversation(false)}
                className="flex-1 px-4 py-2 border border-slate-200/50 rounded-lg font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
