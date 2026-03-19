"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { SuccessModal } from '../../../../components/ui/SuccessModal';
import { ErrorModal } from '../../../../components/ui/ErrorModal';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    item_type: 'veg',
    category: '',
    otherCategory: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '',
    low_stock_threshold: '10',
    fulfillment_type: 'ready_made',
    description: '',
    image: null as File | null,
    current_image_url: '' // To store existing image URL
  });

  // Load existing product data
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await api.get(`/raw-materials/${params.id}`);
        const product = response.data;
        
        setFormData({
          name: product.name || '',
          item_type: product.item_type || 'veg',
          category: product.supplier_name || '',
          otherCategory: '',
          cost_price: product.cost_price?.toString() || '',
          selling_price: product.selling_price?.toString() || '',
          stock_quantity: Math.max(0, Number(product.current_stock) || 0).toString(),
          low_stock_threshold: product.min_stock_level?.toString() || '10',
          fulfillment_type: 'ready_made', // Default since we don't store this
          description: product.description || '',
          image: null,
          current_image_url: product.image_url || ''
        });
      } catch (err) {
        console.error('Error loading product:', err);
        setErrorTitle('Error');
        setErrorMessage('Failed to load product data.');
        setShowErrorModal(true);
      } finally {
        setLoadingData(false);
      }
    };

    if (params.id) {
      loadProduct();
    }
  }, [params.id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setErrorTitle('Invalid File Type');
        setErrorMessage('Please select a JPEG, PNG, or WebP image.');
        setShowErrorModal(true);
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setErrorTitle('File Too Large');
        setErrorMessage('Please select an image smaller than 5MB.');
        setShowErrorModal(true);
        return;
      }
      
      setFormData({ ...formData, image: file });
    }
  };

  const handleBrowseClick = () => {
    const fileInput = document.getElementById('image-input') as HTMLInputElement;
    fileInput?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setErrorTitle('Validation Error');
      setErrorMessage('Product name is required.');
      setShowErrorModal(true);
      return;
    }
    
    if (!formData.category) {
      setErrorTitle('Validation Error');
      setErrorMessage('Please select a category.');
      setShowErrorModal(true);
      return;
    }
    
    if (formData.category === 'Other' && !formData.otherCategory.trim()) {
      setErrorTitle('Validation Error');
      setErrorMessage('Please enter the category name.');
      setShowErrorModal(true);
      return;
    }
    
    if (!formData.cost_price || parseFloat(formData.cost_price) <= 0) {
      setErrorTitle('Validation Error');
      setErrorMessage('Please enter a valid cost price.');
      setShowErrorModal(true);
      return;
    }
    
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
      setErrorTitle('Validation Error');
      setErrorMessage('Please enter a valid selling price.');
      setShowErrorModal(true);
      return;
    }
    
    setLoading(true);
    
    try {
      // Use otherCategory if "Other" is selected, otherwise use the selected category
      const categoryValue = formData.category === 'Other' ? formData.otherCategory : formData.category;
      
      // Prepare the raw material data as FormData
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('unit', 'piece');
      formDataToSend.append('cost_price', formData.cost_price);
      formDataToSend.append('selling_price', formData.selling_price);
      formDataToSend.append('supplier_name', categoryValue);
      formDataToSend.append('min_stock_level', formData.low_stock_threshold);
      formDataToSend.append('for_direct_sale', 'true');
      formDataToSend.append('description', formData.description || `${formData.item_type} item - ${formData.fulfillment_type}`);
      formDataToSend.append('item_type', formData.item_type);
      formDataToSend.append('is_active', 'true');
      
      // Add image if selected
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      // Update the raw material
      await api.put(`/raw-materials/${params.id}`, formDataToSend);

      // Show centered success modal
      setSuccessMessage(`${formData.name} has been updated successfully.`);
      setShowSuccessModal(true);

    } catch (err: any) {
      console.error('Error updating product:', err);
      
      // Show error message
      const errorMsg = err.response?.data?.detail || 'Failed to update product. Please try again.';
      setErrorTitle('Error Updating Product');
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    router.push('/inventory');
  };

  if (loadingData) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Link href="/inventory" className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Edit Menu Item</h1>
            <p className="text-text-secondary text-sm mt-1">Loading product data...</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-8 shadow-xl">
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
    <>
      <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/inventory" className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Edit Menu Item</h1>
            <p className="text-text-secondary text-sm mt-1">Update product information.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-8 shadow-xl space-y-6">
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
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="Enter item name"
            />
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
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
            >
              <option value="">Select category</option>
              <option value="Main Course">Main Course</option>
              <option value="Starters">Starters</option>
              <option value="Beverages">Beverages</option>
              <option value="Desserts">Desserts</option>
              <option value="Fast Food">Fast Food</option>
              <option value="Chinese">Chinese</option>
              <option value="Continental">Continental</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Cost Price and Sell Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
                placeholder="0"
              />
            </div>
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
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          {/* Current Stock (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Current Stock
            </label>
            <input
              type="number"
              value={formData.stock_quantity}
              readOnly
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-secondary cursor-not-allowed"
              placeholder="0"
            />
            <p className="text-xs text-text-muted">Stock quantity is managed through inventory transactions</p>
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
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="10"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors resize-none"
              placeholder="Optional product description..."
              rows={3}
            />
          </div>

          {/* Item Image */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Item Image
            </label>
            <div className="flex items-center gap-4">
              <input
                id="image-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleBrowseClick}
                className="px-6 py-2 bg-surface-2 border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface transition-colors"
              >
                BROWSE
              </button>
              <span className="text-sm text-text-muted">
                {formData.image ? formData.image.name : 'No new image selected'}
              </span>
              {formData.image && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image: null })}
                  className="text-sm text-danger hover:text-danger/80 font-medium"
                >
                  Remove
                </button>
              )}
            </div>
            
            {/* Current Image Preview */}
            {(formData.current_image_url || formData.image) && (
              <div className="mt-3">
                <p className="text-xs text-text-muted mb-2">
                  {formData.image ? 'New image preview:' : 'Current image:'}
                </p>
                <img
                  src={formData.image ? URL.createObjectURL(formData.image) : `http://localhost:8000${formData.current_image_url}`}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg border border-border"
                  onError={(e) => {
                    e.currentTarget.src = '/images/default_product.png';
                  }}
                />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-end gap-4">
            <div className="flex gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => router.push('/inventory')}
                className="flex-1 md:flex-none px-8 py-3 bg-surface-2 border border-border text-text-primary font-medium rounded-lg hover:bg-surface transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 md:flex-none px-8 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {loading ? 'UPDATING...' : 'UPDATE'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="Product Updated Successfully!"
        message={successMessage}
        autoClose={false}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorTitle}
        message={errorMessage}
        autoClose={false}
      />
    </>
  );
}