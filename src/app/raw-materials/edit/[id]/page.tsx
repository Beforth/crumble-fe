"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useOutlet } from '@/contexts/OutletContext';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

export default function EditMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { outlets } = useOutlet();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    outlet_id: '',
    current_stock: '',
    reorder_level: '',
    max_capacity: '100'
  });

  // Load existing material data
  useEffect(() => {
    const loadMaterial = async () => {
      try {
        const response = await api.get(`/raw-materials/${id}`);
        const material = response.data;
        
        setFormData({
          name: material.name || '',
          unit: material.unit || '',
          outlet_id: material.outlet_id?.toString() || '',
          current_stock: material.current_stock?.toString() || '0',
          reorder_level: material.min_stock_level?.toString() || '0',
          max_capacity: '100' // Default value as it's not stored
        });
      } catch (err) {
        console.error('Error loading material:', err);
        alert('Failed to load material data');
      } finally {
        setLoadingData(false);
      }
    };

    if (id) {
      loadMaterial();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.outlet_id) {
      alert('Please select an outlet for this material.');
      return;
    }
    
    if (!formData.name.trim()) {
      alert('Material name is required');
      return;
    }
    
    setLoading(true);
    
    try {
      // Update the raw material using FormData
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('unit', formData.unit);
      formDataToSend.append('cost_price', '0');
      formDataToSend.append('selling_price', '0');
      formDataToSend.append('supplier_name', 'General');
      formDataToSend.append('min_stock_level', formData.reorder_level);
      formDataToSend.append('for_direct_sale', 'false');
      formDataToSend.append('is_active', 'true');
      formDataToSend.append('outlet_id', formData.outlet_id);

      await api.put(`/raw-materials/${id}`, formDataToSend);
      setShowSuccessModal(true);

    } catch (err: any) {
      console.error('Error updating material:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to update material';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/raw-materials')}
            className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Edit Material</h1>
            <p className="text-text-secondary text-sm mt-1">Loading material data...</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-surface-2 rounded w-1/4"></div>
            <div className="h-10 bg-surface-2 rounded"></div>
            <div className="h-4 bg-surface-2 rounded w-1/3"></div>
            <div className="h-10 bg-surface-2 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/raw-materials')}
          className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Edit Material</h1>
          <p className="text-text-secondary text-sm mt-1">Update material information</p>
        </div>
      </div>

      {/* Form */}
      <div className="w-full">
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-6 space-y-6">
          {/* Material Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Material Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="Enter material name"
            />
          </div>

          {/* Outlet Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Outlet <span className="text-danger">*</span>
            </label>
            <select
              required
              value={formData.outlet_id}
              onChange={(e) => setFormData({ ...formData, outlet_id: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
            >
              <option value="">Select outlet</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name} - {outlet.outlet_type === 'outlet' ? 'Outlet' : 'Warehouse'}
                </option>
              ))}
            </select>
          </div>

          {/* Base Unit */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Base Unit <span className="text-danger">*</span>
            </label>
            <select
              required
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
            >
              <option value="">Select base unit</option>
              <option value="kg">Kilogram (kg)</option>
              <option value="g">Gram (g)</option>
              <option value="l">Liter (l)</option>
              <option value="ml">Milliliter (ml)</option>
              <option value="piece">Piece</option>
              <option value="dozen">Dozen</option>
              <option value="packet">Packet</option>
            </select>
          </div>

          {/* Current Stock (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Current Stock <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.current_stock}
              readOnly
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-text-secondary cursor-not-allowed"
              placeholder="0"
            />
            <p className="text-xs text-text-muted">Stock quantity is managed through inventory transactions</p>
          </div>

          {/* Reorder Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Reorder Level <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.reorder_level}
              onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="0"
            />
          </div>

          {/* Max Capacity */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Max Capacity (Target Stock) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.max_capacity}
              onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="100"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push('/raw-materials')}
              className="flex-1 px-6 py-2.5 bg-surface-2 border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-success/10 text-success">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-success">Success!</h2>
              <p className="text-text-primary font-medium">Material updated successfully</p>
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/raw-materials');
              }}
              className="w-full py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] bg-success text-white hover:bg-success/90 shadow-success/20"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
