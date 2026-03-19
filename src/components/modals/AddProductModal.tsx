"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    item_type: 'veg',
    category: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '',
    low_stock_threshold: '10',
    fulfillment_type: 'ready_made',
    image: null as File | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create FormData for file upload
      const data = new FormData();
      data.append('name', formData.name);
      data.append('unit', 'piece');
      data.append('cost_price', formData.cost_price);
      data.append('selling_price', formData.selling_price);
      data.append('supplier_name', formData.category);
      data.append('min_stock_level', formData.low_stock_threshold);
      data.append('for_direct_sale', 'true');
      
      await api.post('/raw-materials', data);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        item_type: 'veg',
        category: '',
        cost_price: '',
        selling_price: '',
        stock_quantity: '',
        low_stock_threshold: '10',
        fulfillment_type: 'ready_made',
        image: null
      });
    } catch (err) {
      console.error(err);
      alert('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-primary text-white px-6 py-4 flex items-center justify-between sticky top-0">
          <h2 className="text-lg font-bold">Add New Menu Item</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/10 rounded p-1 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Item Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="Enter item name"
            />
          </div>

          {/* Item Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Item Type <span className="text-danger">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="item_type"
                  value="veg"
                  checked={formData.item_type === 'veg'}
                  onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-text-primary">Veg</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="item_type"
                  value="non_veg"
                  checked={formData.item_type === 'non_veg'}
                  onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-text-primary">Non-Veg</span>
              </label>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Category <span className="text-danger">*</span>
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            >
              <option value="">Select category</option>
              <option value="Main Course">Main Course</option>
              <option value="Beverages">Beverages</option>
              <option value="Desserts">Desserts</option>
              <option value="Appetizers">Appetizers</option>
              <option value="Breads">Breads</option>
            </select>
          </div>

          {/* Cost Price */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Cost Price (₹) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.cost_price}
              onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="0"
            />
          </div>

          {/* Sell Price */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Sell Price (₹) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.selling_price}
              onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="0"
            />
          </div>

          {/* Stock Quantity */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Stock Quantity <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              required
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="0"
            />
          </div>

          {/* Fulfillment Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Fulfillment Type <span className="text-danger">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fulfillment_type"
                  value="ready_made"
                  checked={formData.fulfillment_type === 'ready_made'}
                  onChange={(e) => setFormData({ ...formData, fulfillment_type: e.target.value })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-text-primary">Ready-made (Direct Stock)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fulfillment_type"
                  value="prepared"
                  checked={formData.fulfillment_type === 'prepared'}
                  onChange={(e) => setFormData({ ...formData, fulfillment_type: e.target.value })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-text-primary">Prepared (Recipe-based)</span>
              </label>
            </div>
          </div>

          {/* Low Stock Threshold */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Low Stock Threshold
            </label>
            <input
              type="number"
              value={formData.low_stock_threshold}
              onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="10"
            />
          </div>

          {/* Item Image */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Item Image
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 bg-surface-2 border border-border text-text-primary text-sm rounded hover:bg-surface transition-colors"
              >
                BROWSE
              </button>
              <span className="text-xs text-text-muted">
                {formData.image ? formData.image.name : 'No Image'}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-surface-2 border border-border text-text-primary font-medium rounded hover:bg-surface transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-white font-medium rounded hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
