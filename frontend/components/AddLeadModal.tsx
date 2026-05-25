'use client';

import { useEffect, useState } from 'react';
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
import { api } from '@/lib/api';
import { COURSES, SOURCES } from '@/lib/constants';
import { CITIES_BY_STATE, INDIA_STATES } from '@/lib/indiaLocations';

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
  const [courseOptions, setCourseOptions] = useState<string[]>(COURSES);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    course: string;
    source: string;
    pincode: string;
    region: string;
    city: string;
    parentName: string;
    parentPhone: string;
  }>({
    name: '',
    email: '',
    phone: '',
    course: '',
    source: '',
    pincode: '',
    region: '',
    city: '',
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
      pincode: '',
      region: '',
      city: '',
      parentName: '',
      parentPhone: '',
    });
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    void api
      .getCourseOptions()
      .then((response) => {
        setCourseOptions(response.courseOptions.length > 0 ? response.courseOptions : COURSES);
      })
      .catch(() => {
        setCourseOptions(COURSES);
      });
  }, [open]);

  const cityOptions = formData.region ? (CITIES_BY_STATE[formData.region] ?? []) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 bg-white overflow-visible">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              Add New Lead
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              Quickly add a new student lead to your pipeline (Updated form)
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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
                <select
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  disabled={isLoading}
                  required
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    Select course (dropdown)
                  </option>
                  {courseOptions.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Source *</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  disabled={isLoading}
                  required
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    Select source (dropdown)
                  </option>
                  {SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Pincode</label>
                <Input
                  type="text"
                  placeholder="431122"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="rounded-lg border-slate-200"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">State</label>
                <select
                  value={formData.region}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      region: e.target.value,
                      city: e.target.value === current.region ? current.city : '',
                    }))
                  }
                  disabled={isLoading}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select state</option>
                  {INDIA_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">City</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={isLoading || !formData.region}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{formData.region ? 'Select city' : 'Select state first'}</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
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
