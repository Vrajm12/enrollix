'use client';

import { useState } from 'react';
import { Upload, Send, Edit2, FileDown, CheckCircle, AlertCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface BulkMessage {
  id: number;
  name: string;
  count: number;
  category: string;
  createdAt: string;
}

interface ImportedLead {
  name: string;
  email: string;
  phone: string;
  status: 'imported' | 'duplicate' | 'error';
}

export default function BulkActionsPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'messaging' | 'updates' | 'export'>('import');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importedLeads, setImportedLeads] = useState<ImportedLead[]>([]);
  const [importStats, setImportStats] = useState({ total: 0, imported: 0, duplicates: 0, errors: 0 });
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [templateMessage, setTemplateMessage] = useState('');
  const [templates, setTemplates] = useState<BulkMessage[]>([
    { id: 1, name: 'Welcome Email', count: 45, category: 'email', createdAt: '2026-03-20' },
    { id: 2, name: 'Follow-up WhatsApp', count: 32, category: 'whatsapp', createdAt: '2026-03-18' },
    { id: 3, name: 'Special Offer SMS', count: 28, category: 'sms', createdAt: '2026-03-15' },
  ]);
  const [exportFilter, setExportFilter] = useState('all');

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      // Simulate CSV parsing
      const mockLeads: ImportedLead[] = [
        { name: 'New Lead 1', email: 'new1@example.com', phone: '555-0001', status: 'imported' },
        { name: 'New Lead 2', email: 'new2@example.com', phone: '555-0002', status: 'imported' },
        { name: 'Existing Lead', email: 'existing@example.com', phone: '555-0003', status: 'duplicate' },
        { name: 'Invalid Entry', email: 'invalid', phone: '', status: 'error' },
      ];
      setImportedLeads(mockLeads);
      setImportStats({
        total: 4,
        imported: 2,
        duplicates: 1,
        errors: 1,
      });
    }
  };

  const templates_category = {
    email: 'Email',
    whatsapp: 'WhatsApp',
    sms: 'SMS',
  };

  return (
    <div className="flex bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 md:ml-60 flex flex-col">
        <div className="flex-1 overflow-auto py-8 md:py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-slate-900">Bulk Actions</h1>
              <p className="text-slate-600 mt-2">Manage multiple leads, import data, and send bulk messages</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-slate-200/50">
              {[
                { id: 'import', label: '📥 Import CSV', icon: Upload },
                { id: 'messaging', label: '💬 Bulk Messaging', icon: Send },
                { id: 'updates', label: '✎ Bulk Updates', icon: Edit2 },
                { id: 'export', label: '📤 Export Data', icon: FileDown },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-6 py-3 font-semibold border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-blue-600'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Import CSV Tab */}
            {activeTab === 'import' && (
              <div className="space-y-8">
                {/* Upload Area */}
                <div className="bg-white border-2 border-dashed border-blue-300 rounded-2xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload size={48} className="mx-auto mb-4 text-blue-600" />
                    <p className="text-xl font-bold text-slate-900 mb-2">Drag and drop your CSV file</p>
                    <p className="text-sm text-slate-600 mb-4">or click to browse</p>
                    <p className="text-xs text-slate-500">
                      Expected columns: Name, Email, Phone (optional: Status, Priority)
                    </p>
                  </label>
                </div>

                {csvFile && (
                  <>
                    {/* Upload Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-slate-100 rounded-xl p-4">
                        <p className="text-sm text-slate-600 mb-1">Total Records</p>
                        <p className="text-3xl font-bold text-slate-900">{importStats.total}</p>
                      </div>
                      <div className="bg-green-100 rounded-xl p-4">
                        <p className="text-sm text-green-600 mb-1">Imported</p>
                        <p className="text-3xl font-bold text-green-600">{importStats.imported}</p>
                      </div>
                      <div className="bg-yellow-100 rounded-xl p-4">
                        <p className="text-sm text-yellow-600 mb-1">Duplicates</p>
                        <p className="text-3xl font-bold text-yellow-600">{importStats.duplicates}</p>
                      </div>
                      <div className="bg-red-100 rounded-xl p-4">
                        <p className="text-sm text-red-600 mb-1">Errors</p>
                        <p className="text-3xl font-bold text-red-600">{importStats.errors}</p>
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="bg-white border border-slate-200/50 rounded-2xl overflow-hidden">
                      <div className="grid grid-cols-[2fr,2fr,1.5fr,1fr] gap-4 p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/50 font-semibold text-sm text-slate-600">
                        <div>Name</div>
                        <div>Email</div>
                        <div>Phone</div>
                        <div>Status</div>
                      </div>
                      <div className="divide-y divide-slate-200/50">
                        {importedLeads.map((lead, idx) => (
                          <div
                            key={idx}
                            className={`grid grid-cols-[2fr,2fr,1.5fr,1fr] gap-4 p-6 items-center ${
                              lead.status === 'imported'
                                ? 'bg-green-50'
                                : lead.status === 'duplicate'
                                  ? 'bg-yellow-50'
                                  : 'bg-red-50'
                            }`}
                          >
                            <p className="font-medium text-slate-900">{lead.name}</p>
                            <p className="text-sm text-slate-600">{lead.email}</p>
                            <p className="text-sm text-slate-600">{lead.phone || '-'}</p>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                                lead.status === 'imported'
                                  ? 'bg-green-200 text-green-700'
                                  : lead.status === 'duplicate'
                                    ? 'bg-yellow-200 text-yellow-700'
                                    : 'bg-red-200 text-red-700'
                              }`}
                            >
                              {lead.status === 'imported' ? '✓ Ready' : lead.status === 'duplicate' ? '⚠ Duplicate' : '✗ Error'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                      Import {importStats.imported} Leads
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Bulk Messaging Tab */}
            {activeTab === 'messaging' && (
              <div className="space-y-8">
                {/* Message Templates */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Saved Templates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="bg-white border border-slate-200/50 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setTemplateMessage(template.name)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <p className="font-semibold text-slate-900">{template.name}</p>
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                            {templates_category[template.category as keyof typeof templates_category]}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{template.count} leads</p>
                        <p className="text-xs text-slate-500">Created: {template.createdAt}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compose Message */}
                <div className="bg-white border border-slate-200/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Compose New Message</h3>

                  {/* Channel Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-900 mb-3">Channel</label>
                    <div className="flex gap-3">
                      {(['email', 'whatsapp', 'sms'] as const).map((channel) => (
                        <button
                          key={channel}
                          className="px-4 py-2 rounded-lg border border-slate-200/50 font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          {channel === 'email' ? '📧 Email' : channel === 'whatsapp' ? '💬 WhatsApp' : '📱 SMS'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Text */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Message</label>
                    <textarea
                      value={templateMessage}
                      onChange={(e) => setTemplateMessage(e.target.value)}
                      placeholder="Write your message here... Use {name} for personalization"
                      className="w-full px-4 py-3 border border-slate-200/50 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none"
                      rows={6}
                    />
                    <p className="text-xs text-slate-500 mt-2">Available variables: {'{name}'}, {'{email}'}, {'{phone}'}, {'{status}'}</p>
                  </div>

                  {/* Target Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-900 mb-3">Send To</label>
                    <div className="space-y-2">
                      {['All Leads', 'Cold Leads', 'Warm Leads', 'Hot Leads', 'Custom List'].map((option) => (
                        <label key={option} className="flex items-center p-3 border border-slate-200/50 rounded-lg cursor-pointer hover:bg-slate-50">
                          <input type="radio" name="target" defaultChecked={option === 'All Leads'} className="mr-3" />
                          <span className="font-medium text-slate-600">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Send size={20} />
                    Send Message
                  </button>
                </div>
              </div>
            )}

            {/* Bulk Updates Tab */}
            {activeTab === 'updates' && (
              <div className="space-y-8">
                <div className="bg-white border border-slate-200/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Update Multiple Leads</h3>

                  {/* Lead Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-900 mb-3">Select Leads</label>
                    <div className="space-y-2">
                      {['By Status', 'By Priority', 'By Assignee', 'Custom Filter'].map((filter) => (
                        <button
                          key={filter}
                          className="w-full px-4 py-3 border border-slate-200/50 rounded-lg text-left font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Update Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Change Status To</label>
                      <select className="w-full px-4 py-2 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500">
                        <option>- No change -</option>
                        <option>Qualified</option>
                        <option>Failed</option>
                        <option>Converted</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Change Priority To</label>
                      <select className="w-full px-4 py-2 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500">
                        <option>- No change -</option>
                        <option>COLD</option>
                        <option>WARM</option>
                        <option>HOT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Assign To</label>
                      <select className="w-full px-4 py-2 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500">
                        <option>- No change -</option>
                        <option>Sarah Johnson</option>
                        <option>John Smith</option>
                        <option>Mike Davis</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Add Tags</label>
                      <input
                        type="text"
                        placeholder="e.g., VIP, Recent Contact, etc."
                        className="w-full px-4 py-2 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Edit2 size={20} />
                    Update Leads
                  </button>
                </div>
              </div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
              <div className="space-y-8">
                <div className="bg-white border border-slate-200/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Export Lead Data</h3>

                  {/* Export Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Filter By</label>
                      <select
                        value={exportFilter}
                        onChange={(e) => setExportFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200/50 rounded-lg"
                      >
                        <option value="all">All Leads</option>
                        <option value="cold">Cold Leads</option>
                        <option value="warm">Warm Leads</option>
                        <option value="hot">Hot Leads</option>
                        <option value="converted">Converted</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Format</label>
                      <select className="w-full px-4 py-2 border border-slate-200/50 rounded-lg">
                        <option>CSV</option>
                        <option>Excel (.xlsx)</option>
                        <option>PDF Report</option>
                      </select>
                    </div>
                  </div>

                  {/* Columns Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-900 mb-3">Select Columns</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['Name', 'Email', 'Phone', 'Status', 'Priority', 'Assignee', 'Created', 'Last Contact'].map((col) => (
                        <label key={col} className="flex items-center">
                          <input type="checkbox" defaultChecked className="mr-2" />
                          <span className="text-sm font-medium text-slate-600">{col}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <FileDown size={20} />
                    Download Export ({exportFilter})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
