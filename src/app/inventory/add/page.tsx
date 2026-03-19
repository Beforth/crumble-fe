"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useOutlet } from '@/contexts/OutletContext';
import { ArrowLeft, Plus, X, Search, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { SuccessModal } from '../../../components/ui/SuccessModal';
import { ErrorModal } from '../../../components/ui/ErrorModal';

export default function AddProductPage() {
  const router = useRouter();
  const { outlets, selectedOutlet } = useOutlet();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedOutletForProduct, setSelectedOutletForProduct] = useState<number | null>(null);
  const [outletDropdownOpen, setOutletDropdownOpen] = useState(false);
  const [outletSearch, setOutletSearch] = useState('');
  const [outletDropdownRect, setOutletDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const outletTriggerRef = useRef<HTMLButtonElement>(null);
  const outletDropdownRef = useRef<HTMLDivElement>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryDropdownRect, setCategoryDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const categoryTriggerRef = useRef<HTMLButtonElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const CATEGORY_OPTIONS = ['Main Course', 'Starters', 'Beverages', 'Desserts', 'Fast Food', 'Chinese', 'Continental', 'Other'];
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
    image: null as File | null
  });
  type RecipeRow = { raw_material_id: string; quantity: string; unit: string };
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeRow[]>([]);
  const [ingredientMaterials, setIngredientMaterials] = useState<any[]>([]);

  const outletId = selectedOutletForProduct || selectedOutlet?.id;

  useEffect(() => {
    if (!outletDropdownOpen) { setOutletDropdownRect(null); return; }
    const el = outletTriggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setOutletDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width });
  }, [outletDropdownOpen]);
  useEffect(() => {
    if (!categoryDropdownOpen) { setCategoryDropdownRect(null); return; }
    const el = categoryTriggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCategoryDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width });
  }, [categoryDropdownOpen]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (outletDropdownOpen && !outletTriggerRef.current?.contains(target) && !outletDropdownRef.current?.contains(target))
        setOutletDropdownOpen(false);
      if (categoryDropdownOpen && !categoryTriggerRef.current?.contains(target) && !categoryDropdownRef.current?.contains(target))
        setCategoryDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [outletDropdownOpen, categoryDropdownOpen]);

  const filteredOutlets = outlets.filter((o: any) =>
    (o.name || '').toLowerCase().includes(outletSearch.toLowerCase().trim())
  );
  const selectedOutletLabel = selectedOutletForProduct
    ? (() => {
        const o = outlets.find((x: any) => x.id === selectedOutletForProduct);
        return o ? `${o.name} - ${o.outlet_type === 'outlet' ? 'Outlet' : 'Warehouse'}` : 'Select outlet';
      })()
    : 'Select outlet';
  const filteredCategories = CATEGORY_OPTIONS.filter((c) =>
    c.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );
  const selectedCategoryLabel = formData.category || 'Select category';

  useEffect(() => {
    if (!outletId || formData.fulfillment_type !== 'prepared') return;
    // Only materials (ingredients), not products for direct sale
    api.get(`/raw-materials?outlet_id=${outletId}&limit=500&for_direct_sale=false`)
      .then((res) => setIngredientMaterials(res.data || []))
      .catch(() => setIngredientMaterials([]));
  }, [outletId, formData.fulfillment_type]);

  const addRecipeIngredient = () => {
    setRecipeIngredients((prev) => [...prev, { raw_material_id: '', quantity: '1', unit: '' }]);
  };
  const removeRecipeIngredient = (index: number) => {
    setRecipeIngredients((prev) => prev.filter((_, i) => i !== index));
  };
  const updateRecipeIngredient = (index: number, field: keyof RecipeRow, value: string) => {
    setRecipeIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'raw_material_id') {
        const mat = ingredientMaterials.find((m) => m.id === parseInt(value, 10));
        // Default unit to the selected material's unit
        next[index].unit = mat?.unit ?? next[index].unit ?? '';
      }
      return next;
    });
  };

  // Same base units as Materials (raw-materials add) for consistency
  const MATERIALS_BASE_UNITS: { value: string; label: string }[] = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'l', label: 'Liter (l)' },
    { value: 'ml', label: 'Milliliter (ml)' },
    { value: 'piece', label: 'Piece' },
    { value: 'dozen', label: 'Dozen' },
    { value: 'packet', label: 'Packet' },
  ];
  const unitsFromMaterials = [...new Set((ingredientMaterials || [])
    .map((m: any) => m.unit)
    .filter((u: string) => u != null && String(u).trim() !== ''))] as string[];
  const baseValues = new Set(MATERIALS_BASE_UNITS.map((o) => o.value));
  const extraUnits = unitsFromMaterials.filter((u) => !baseValues.has(u));
  const UNIT_OPTIONS = [
    ...MATERIALS_BASE_UNITS,
    ...extraUnits.map((value) => ({ value, label: value })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const outletToUse = selectedOutletForProduct || selectedOutlet?.id;
    
    if (!outletToUse) {
      setErrorTitle('Error');
      setErrorMessage('Please select an outlet for this product.');
      setShowErrorModal(true);
      return;
    }
    
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
      
      console.log('Selected outlet:', selectedOutlet);
      console.log('Outlet ID:', selectedOutlet?.id);
      
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
      formDataToSend.append('outlet_id', outletToUse.toString());  // Use selected outlet
      
      console.log('FormData outlet_id:', formDataToSend.get('outlet_id'));
      
      // Add image if selected
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      // Create the raw material
      const response = await api.post('/raw-materials', formDataToSend);
      const createdMaterial = response.data;
      let stockAdded = false;

      let recipeSaveFailed = false;
      try {
        // If prepared (recipe-based), save recipe ingredients (don't roll back product if this fails)
        if (formData.fulfillment_type === 'prepared' && recipeIngredients.length > 0) {
          const recipePayload = recipeIngredients
            .filter((r) => r.raw_material_id && r.quantity && r.unit)
            .map((r) => ({
              ingredient_raw_material_id: parseInt(r.raw_material_id, 10),
              quantity_per_unit: parseFloat(r.quantity) || 0,
              unit: r.unit,
            }));
          if (recipePayload.length > 0) {
            try {
              await api.post(`/raw-materials/${createdMaterial.id}/recipe`, recipePayload);
            } catch (recipeErr: any) {
              console.error('Recipe save failed:', recipeErr);
              recipeSaveFailed = true;
            }
          }
        }

        // If there's initial stock quantity, add it as an inward transaction (ready-made only)
        if (formData.stock_quantity && Number(formData.stock_quantity) > 0) {
          const stockQuantity = Number(formData.stock_quantity);
          const costPrice = Number(formData.cost_price) || 0;
          
          const stockData = {
            raw_material_id: createdMaterial.id,
            quantity: stockQuantity,
            rate: costPrice,
            total_amount: stockQuantity * costPrice,
            supplier: categoryValue || 'Initial Stock',
            reason: 'Initial stock entry',
            transaction_date: new Date().toISOString().split('T')[0],
            outlet_id: outletToUse  // Use the same outlet as the product
          };

          await api.post('/raw-materials/inward', stockData);
          stockAdded = true;
        }

        // Show centered success modal
        const stockText = formData.stock_quantity && stockAdded ? ` with ${formData.stock_quantity} units in stock` : '';
        const recipeWarn = recipeSaveFailed ? ' Recipe could not be saved; you can add it when editing the item.' : '';
        setSuccessMessage(`${formData.name} has been added to your inventory${stockText}.${recipeWarn}`);
        setShowSuccessModal(true);

        // Reset form
        setFormData({
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
          image: null
        });
        setRecipeIngredients([]);

      } catch (stockErr: any) {
        console.error('Error after creating product:', stockErr);
        
        // Only roll back when initial stock (inward) failed - not when recipe already failed
        try {
          await api.delete(`/raw-materials/${createdMaterial.id}`);
          setErrorTitle('Error Adding Stock');
          setErrorMessage('Failed to add initial stock. Product creation rolled back.');
          setShowErrorModal(true);
        } catch (deleteErr) {
          setErrorTitle('Partial Success');
          setErrorMessage(`Product "${formData.name}" was created but initial stock could not be added. Please add stock manually.`);
          setShowErrorModal(true);
        }
        return;
      }

    } catch (err: any) {
      console.error('Error adding product:', err);
      
      // Show error message
      const errorMsg = err.response?.data?.detail || 'Failed to add product. Please try again.';
      setErrorTitle('Error Adding Product');
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    router.push('/inventory');
  };

  return (
    <>
      <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/inventory" className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Add New Menu Item</h1>
          <p className="text-text-secondary text-sm mt-1">Create a new product for your inventory.</p>
        </div>
      </div>

      {/* Form */}
      <div className="w-full">
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-6 space-y-6">
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

        {/* Item Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            Item Type <span className="text-danger">*</span>
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="item_type"
                  value="veg"
                  checked={formData.item_type === 'veg'}
                  onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  formData.item_type === 'veg' 
                    ? 'border-primary bg-primary' 
                    : 'border-border bg-surface-2'
                }`}>
                  {formData.item_type === 'veg' && (
                    <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  )}
                </div>
              </div>
              <span className="text-sm text-text-primary">Veg</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="item_type"
                  value="non_veg"
                  checked={formData.item_type === 'non_veg'}
                  onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  formData.item_type === 'non_veg' 
                    ? 'border-primary bg-primary' 
                    : 'border-border bg-surface-2'
                }`}>
                  {formData.item_type === 'non_veg' && (
                    <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  )}
                </div>
              </div>
              <span className="text-sm text-text-primary">Non-Veg</span>
            </label>
          </div>
        </div>

        {/* Outlet Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            Outlet <span className="text-danger">*</span>
          </label>
          <button
            ref={outletTriggerRef}
            type="button"
            onClick={() => setOutletDropdownOpen((o) => !o)}
            className="w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-left text-sm text-text-primary focus:border-primary focus:outline-none transition-colors flex items-center justify-between gap-2"
          >
            <span className={selectedOutletForProduct ? '' : 'text-text-muted'}>{selectedOutletLabel}</span>
            <ChevronDown size={16} className="shrink-0 text-text-muted" />
          </button>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            Category <span className="text-danger">*</span>
          </label>
          <button
            ref={categoryTriggerRef}
            type="button"
            onClick={() => setCategoryDropdownOpen((o) => !o)}
            className="w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-left text-sm text-text-primary focus:border-primary focus:outline-none transition-colors flex items-center justify-between gap-2"
          >
            <span className={formData.category ? '' : 'text-text-muted'}>{selectedCategoryLabel}</span>
            <ChevronDown size={16} className="shrink-0 text-text-muted" />
          </button>
          
          {/* Other Category Input */}
          {formData.category === 'Other' && (
            <div className="space-y-2 mt-3">
              <label className="text-sm font-medium text-text-primary">
                Other Category Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter category name"
                value={formData.otherCategory || ''}
                onChange={(e) => setFormData({ ...formData, otherCategory: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
                required
              />
            </div>
          )}
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

        {/* Stock Quantity – hidden for Prepared (Recipe-based) */}
        {formData.fulfillment_type !== 'prepared' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Stock Quantity <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              step="1"
              value={formData.stock_quantity}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({ ...formData, stock_quantity: value });
              }}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="0"
            />
          </div>
        )}

        {/* Fulfillment Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            Fulfillment Type <span className="text-danger">*</span>
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="fulfillment_type"
                  value="ready_made"
                  checked={formData.fulfillment_type === 'ready_made'}
                  onChange={(e) => setFormData({ ...formData, fulfillment_type: e.target.value })}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  formData.fulfillment_type === 'ready_made' 
                    ? 'border-primary bg-primary' 
                    : 'border-border bg-surface-2'
                }`}>
                  {formData.fulfillment_type === 'ready_made' && (
                    <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  )}
                </div>
              </div>
              <span className="text-sm text-text-primary">Ready-made (Direct Stock)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="fulfillment_type"
                  value="prepared"
                  checked={formData.fulfillment_type === 'prepared'}
                  onChange={(e) => setFormData({ ...formData, fulfillment_type: e.target.value, stock_quantity: e.target.value === 'prepared' ? '' : formData.stock_quantity })}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  formData.fulfillment_type === 'prepared' 
                    ? 'border-primary bg-primary' 
                    : 'border-border bg-surface-2'
                }`}>
                  {formData.fulfillment_type === 'prepared' && (
                    <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  )}
                </div>
              </div>
              <span className="text-sm text-text-primary">Prepared (Recipe-based)</span>
            </label>
          </div>
        </div>

        {/* Recipe Ingredients – only when Prepared (Recipe-based); Add button first, then rows */}
        {formData.fulfillment_type === 'prepared' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">Recipe Ingredients</label>
              <button
                type="button"
                onClick={addRecipeIngredient}
                className="flex items-center gap-2 px-4 py-2 bg-success text-white text-sm font-medium rounded-lg hover:bg-success/90 transition-colors shadow-sm"
              >
                <Plus size={16} /> Add Ingredient
              </button>
            </div>
            <div className="space-y-3">
              {recipeIngredients.map((row, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-end gap-3 p-3 rounded-xl border border-border bg-surface-2"
                >
                  <div className="w-[675px] space-y-1 shrink-0">
                    <span className="text-xs font-medium text-text-muted">Ingredient</span>
                    <select
                      value={row.raw_material_id}
                      onChange={(e) => updateRecipeIngredient(idx, 'raw_material_id', e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                      <option value="">Select ingredient</option>
                      {ingredientMaterials.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 space-y-1">
                    <span className="text-xs font-medium text-text-muted">Quantity</span>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={row.quantity}
                      onChange={(e) => updateRecipeIngredient(idx, 'quantity', e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="w-40 space-y-1">
                    <span className="text-xs font-medium text-text-muted">Unit</span>
                    <select
                      value={row.unit}
                      disabled
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary cursor-not-allowed opacity-90"
                      title="Unit is set automatically from the selected material"
                    >
                      <option value="">
                        {row.raw_material_id ? '—' : 'Select Unit'}
                      </option>
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRecipeIngredient(idx)}
                    className="p-2.5 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    title="Remove ingredient"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
              {formData.image ? formData.image.name : 'No Image'}
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
          {formData.image && (
            <div className="mt-3">
              <img
                src={URL.createObjectURL(formData.image)}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-border"
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
              {loading ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>

    {/* Outlet dropdown - portaled with search */}
    {typeof document !== 'undefined' &&
      outletDropdownOpen &&
      outletDropdownRect &&
      createPortal(
        <div
          ref={outletDropdownRef}
          className="fixed z-[100] rounded-lg bg-surface border border-border shadow-lg overflow-hidden"
          style={{
            top: outletDropdownRect.top + 4,
            left: outletDropdownRect.left,
            width: outletDropdownRect.width,
          }}
        >
          <div className="p-2 border-b border-border bg-surface-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="text"
                placeholder="Search outlet..."
                value={outletSearch}
                onChange={(e) => setOutletSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOutlets.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-text-muted">No outlets match</div>
            ) : (
              filteredOutlets.map((outlet: any) => (
                <button
                  key={outlet.id}
                  type="button"
                  onClick={() => {
                    setSelectedOutletForProduct(outlet.id);
                    setOutletSearch('');
                    setOutletDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-primary/10 focus:bg-primary/10 focus:outline-none border-b border-border last:border-b-0"
                >
                  {outlet.name} — {outlet.outlet_type === 'outlet' ? 'Outlet' : 'Warehouse'}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

    {/* Category dropdown - portaled with search */}
    {typeof document !== 'undefined' &&
      categoryDropdownOpen &&
      categoryDropdownRect &&
      createPortal(
        <div
          ref={categoryDropdownRef}
          className="fixed z-[100] rounded-lg bg-surface border border-border shadow-lg overflow-hidden"
          style={{
            top: categoryDropdownRect.top + 4,
            left: categoryDropdownRect.left,
            width: categoryDropdownRect.width,
          }}
        >
          <div className="p-2 border-b border-border bg-surface-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="text"
                placeholder="Search category..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredCategories.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-text-muted">No categories match</div>
            ) : (
              filteredCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, category: cat }));
                    setCategorySearch('');
                    setCategoryDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-primary/10 focus:bg-primary/10 focus:outline-none border-b border-border last:border-b-0"
                >
                  {cat}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

    {/* Success Modal */}
    <SuccessModal
      isOpen={showSuccessModal}
      onClose={handleSuccessModalClose}
      title="Product Added Successfully!"
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