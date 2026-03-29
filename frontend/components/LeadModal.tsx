"use client";

import { useCallback, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { Lead, Priority } from "@/lib/types";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: Lead) => void;
  counselors?: Array<{ id: number; name: string }>;
  userRole?: "ADMIN" | "COUNSELOR";
}

const PRIORITY_OPTIONS: Priority[] = ["COLD", "WARM", "HOT"];

export function LeadModal({
  isOpen,
  onClose,
  onSuccess,
  counselors = [],
  userRole = "COUNSELOR"
}: LeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Lead>>({
    name: "",
    phone: "",
    email: "",
    address: "",
    course: "",
    source: "",
    priority: "COLD",
    assignedTo: undefined
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: name === "assignedTo" ? (value ? parseInt(value) : null) : value
      }));
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name || !formData.phone) {
        setError("Name and phone are required");
        return;
      }

      const response = await api.createLead({
        ...formData,
        assignedTo: userRole === "ADMIN" ? formData.assignedTo : undefined
      });

      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        course: "",
        source: "",
        priority: "COLD",
        assignedTo: undefined
      });
      onSuccess(response);
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to create lead";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Add New Lead</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name || ""}
              onChange={handleChange}
              placeholder="Full name"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone || ""}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ""}
              onChange={handleChange}
              placeholder="email@example.com"
            />
          </div>

          {/* Course */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Course
            </label>
            <input
              type="text"
              name="course"
              value={formData.course || ""}
              onChange={handleChange}
              placeholder="e.g., B.Tech, MBA"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority || "COLD"}
              onChange={handleChange}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Lead Source
            </label>
            <input
              type="text"
              name="source"
              value={formData.source || ""}
              onChange={handleChange}
              placeholder="e.g., Website, Referral"
            />
          </div>

          {/* Assigned To (Admin only) */}
          {userRole === "ADMIN" && counselors.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Assign To
              </label>
              <select
                name="assignedTo"
                value={formData.assignedTo || ""}
                onChange={handleChange}
              >
                <option value="">-- Unassigned --</option>
                {counselors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address || ""}
              onChange={handleChange}
              placeholder="Street, City, State"
              rows={2}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
