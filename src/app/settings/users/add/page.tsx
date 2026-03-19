"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X, Plus } from 'lucide-react';
import api from '@/lib/api';
import { SuccessModal } from '@/components/ui/SuccessModal';

export default function AddStaffPage() {
  const router = useRouter();
  const [outlets, setOutlets] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    outlet_ids: [] as number[],
    is_active: true
  });

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      const response = await api.get('/users/settings/outlets');
      setOutlets(response.data);
    } catch (error) {
      console.error('Error fetching outlets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/users', formData);
      setSuccessMessage(`Staff member "${formData.name}" has been created successfully!`);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error creating staff:', error);
      alert(error.response?.data?.detail || 'Failed to create staff member');
      setSubmitting(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    router.push('/settings/users');
  };

  const handleBack = () => {
    router.push('/settings/users');
  };

  const handleOutletToggle = (id: number) => {
    setFormData(prev => ({
      ...prev,
      outlet_ids: prev.outlet_ids.includes(id)
        ? prev.outlet_ids.filter(oid => oid !== id)
        : [...prev.outlet_ids, id]
    }));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Staff Management</span>
        </button>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Add New Staff</h1>
        <p className="text-text-secondary text-sm">Create a new staff member account</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="space-y-6">
            {/* Row 1: Full Name (full width) */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                placeholder="John Doe"
              />
            </div>

            {/* Row 2: Email and Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Password <span className="text-danger">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                  placeholder="Enter password"
                />
              </div>
            </div>

            {/* Row 3: Role */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Role <span className="text-danger">*</span>
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="cashier">Cashier</option>
                <option value="production_manager">Production Manager</option>
                <option value="inventory_manager">Inventory Manager</option>
              </select>
            </div>

            {/* Row 4: Assigned Outlets */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Assigned Outlets <span className="text-danger">*</span>
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 bg-background border border-border rounded-lg p-4">
                {outlets.map((outlet: any) => (
                  <label
                    key={outlet.id}
                    className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-border cursor-pointer hover:border-primary transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.outlet_ids.includes(outlet.id)}
                      onChange={() => handleOutletToggle(outlet.id)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-text-primary">{outlet.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-2.5 bg-surface border border-border text-text-primary font-medium rounded-lg hover:bg-surface-2 transition-colors"
            >
              <X size={18} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary-muted disabled:opacity-50"
            >
              <Plus size={18} />
              {submitting ? 'Creating...' : 'Create Staff Member'}
            </button>
          </div>
        </div>
      </form>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="Staff Member Created!"
        message={successMessage}
        autoClose={false}
      />
    </div>
  );
}
