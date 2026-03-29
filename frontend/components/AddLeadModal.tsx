'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

const COURSES = [
  'B.Tech Computer Science',
  'B.Tech Electronics',
  'BCA',
  'B.Sc Mathematics',
  'MBA',
];

const SOURCES = [
  'Website',
  'Social Media',
  'Referral',
  'Advertisement',
  'Walk-in',
];

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export function AddLeadModal({ 
  open, 
  onOpenChange,
  onSubmit,
  isLoading = false,
}: AddLeadModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    course: string;
    source: string;
    parentName: string;
    parentPhone: string;
  }>({
    name: '',
    email: '',
    phone: '',
    course: '',
    source: '',
    parentName: '',
    parentPhone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    setFormData({
      name: '',
      email: '',
      phone: '',
      course: '',
      source: '',
      parentName: '',
      parentPhone: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              Add New Lead
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              Quickly add a new student lead to your pipeline
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Student Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Student Information</h3>
            
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Full Name *</label>
              <Input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="rounded-lg border-slate-200"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Email</label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="rounded-lg border-slate-200"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Phone *</label>
                <Input
                  type="tel"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                  className="rounded-lg border-slate-200"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Course *</label>
                <Select value={formData.course || ''} onValueChange={(value) => value && setFormData({...formData, course: value})}>
                  <SelectTrigger disabled={isLoading}>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSES.map((course) => (
                      <SelectItem key={course} value={course}>
                        {course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Source *</label>
                <Select value={formData.source || ''} onValueChange={(value) => value && setFormData({...formData, source: value})}>
                  <SelectTrigger disabled={isLoading}>
                    <SelectValue placeholder="How did they find us?" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 my-4" />

          {/* Parent Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Parent Information</h3>
            
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Parent Name</label>
              <Input
                type="text"
                placeholder="Parent name"
                value={formData.parentName}
                onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                className="rounded-lg border-slate-200"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Parent Phone</label>
              <Input
                type="tel"
                placeholder="Parent phone"
                value={formData.parentPhone || ''}
                onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                className="rounded-lg border-slate-200"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Actions */}
          <DialogFooter className="gap-3 border-t border-slate-200 pt-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isLoading ? 'Adding...' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
