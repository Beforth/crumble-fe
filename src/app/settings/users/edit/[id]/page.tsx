"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, X, Save } from 'lucide-react';
import api from '@/lib/api';
import { SuccessModal } from '@/components/ui/SuccessModal';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id;

  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    outlet_ids: [] as number[],
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [userRes, outletsRes] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get('/users/settings/outlets')
      ]);
      
      const user = userRes.data;
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        outlet_ids: user.outlets ? user.outlets.map((o: any) => o.id) : [],
        is_active: user.is_active
      });
      setOutlets(outletsRes.data);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching user:', error);
      alert(error.response?.data?.detail || 'Failed to load user data');
      router.push('/settings/users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/users/${userId}`, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        outlet_ids: formData.outlet_ids,
        is_active: formData.is_active
      });
      setSuccessMessage(`User "${formData.name}" has been updated successfully!`);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.response?.data?.detail || 'Failed to update user');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-text-secondary">Loading user data...</div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-text-primary mb-2">Edit Staff Member</h1>
        <p className="text-text-secondary text-sm">Update staff member information</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="space-y-6">
            {/* Row 1: Full Name */}
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

            {/* Row 2: Email */}
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

            {/* Row 5: Status */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Status <span className="text-danger">*</span>
              </label>
              <select
                required
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
              <Save size={18} />
              {submitting ? 'Updating...' : 'Update Staff Member'}
            </button>
          </div>
        </div>
      </form>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="Staff Member Updated!"
        message={successMessage}
        autoClose={false}
      />
    </div>
  );
}
