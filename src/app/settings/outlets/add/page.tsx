"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X, Plus } from 'lucide-react';
import api from '@/lib/api';
import { SuccessModal } from '@/components/ui/SuccessModal';

export default function AddOutletPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    manager: '',
    outlet_type: '',
    status: 'active'
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.post('/outlets', {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        manager: formData.manager,
        outlet_type: formData.outlet_type,
        is_active: formData.status === 'active'
      });

      // Show success modal
      setSuccessMessage(`Outlet "${formData.name}" has been created successfully!`);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error creating outlet:', error);
      alert(error.response?.data?.detail || 'Failed to create outlet');
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Navigate back to settings outlets tab
    router.push('/settings?tab=outlets');
  };

  const handleBack = () => {
    router.push('/settings?tab=outlets');
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
          <span className="text-sm font-medium">Back to Outlet Management</span>
        </button>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Add New Outlet</h1>
        <p className="text-text-secondary text-sm">Create a new outlet location for your business</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="space-y-6">
            {/* Row 1: Outlet Name (full width) */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Outlet Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                placeholder="Main Store"
              />
            </div>

            {/* Row 2: Address and Phone Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Address <span className="text-danger">*</span>
                </label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors resize-none"
                  rows={3}
                  placeholder="123 Baker Street, City, State, ZIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Phone Number <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {/* Row 3: Email, Manager Name, Type, and Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                  placeholder="outlet@bakery.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Manager Name
                </label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Type <span className="text-danger">*</span>
                </label>
                <select
                  required
                  value={formData.outlet_type}
                  onChange={(e) => setFormData({ ...formData, outlet_type: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Select Type</option>
                  <option value="outlet">Outlet</option>
                  <option value="warehouse">Warehouse</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Status <span className="text-danger">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary-muted"
            >
              <Plus size={18} />
              Add Outlet
            </button>
          </div>
        </div>
      </form>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="Outlet Added Successfully!"
        message={successMessage}
        autoClose={false}
      />
    </div>
  );
}
