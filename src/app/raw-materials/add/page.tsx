"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useOutlet } from '@/contexts/OutletContext';
import { ArrowLeft, Search, ChevronDown } from 'lucide-react';
import api from '@/lib/api';

const BASE_UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'l', label: 'Liter (l)' },
  { value: 'piece', label: 'Piece' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'packet', label: 'Packet' },
];

export default function AddMaterialPage() {
  const router = useRouter();
  const { outlets, selectedOutlet } = useOutlet();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedOutletForMaterial, setSelectedOutletForMaterial] = useState<number | null>(null);
  const [outletDropdownOpen, setOutletDropdownOpen] = useState(false);
  const [outletSearch, setOutletSearch] = useState('');
  const [outletDropdownRect, setOutletDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const outletTriggerRef = useRef<HTMLButtonElement>(null);
  const outletDropdownRef = useRef<HTMLDivElement>(null);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitDropdownRect, setUnitDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const unitTriggerRef = useRef<HTMLButtonElement>(null);
  const unitDropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    current_stock: '',
    reorder_level: '',
    max_capacity: '100'
  });

  useEffect(() => {
    if (!outletDropdownOpen) { setOutletDropdownRect(null); return; }
    const el = outletTriggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setOutletDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width });
  }, [outletDropdownOpen]);
  useEffect(() => {
    if (!unitDropdownOpen) { setUnitDropdownRect(null); return; }
    const el = unitTriggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setUnitDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width });
  }, [unitDropdownOpen]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (outletDropdownOpen && !outletTriggerRef.current?.contains(target) && !outletDropdownRef.current?.contains(target))
        setOutletDropdownOpen(false);
      if (unitDropdownOpen && !unitTriggerRef.current?.contains(target) && !unitDropdownRef.current?.contains(target))
        setUnitDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [outletDropdownOpen, unitDropdownOpen]);

  const filteredOutlets = outlets.filter((o: any) =>
    (o.name || '').toLowerCase().includes(outletSearch.toLowerCase().trim())
  );
  const selectedOutletLabel = selectedOutletForMaterial
    ? (() => {
        const o = outlets.find((x: any) => x.id === selectedOutletForMaterial);
        return o ? `${o.name} - ${o.outlet_type === 'outlet' ? 'Outlet' : 'Warehouse'}` : 'Select outlet';
      })()
    : 'Select outlet';
  const filteredUnits = BASE_UNIT_OPTIONS.filter(
    (u) => u.label.toLowerCase().includes(unitSearch.toLowerCase().trim())
  );
  const selectedUnitLabel = formData.unit
    ? BASE_UNIT_OPTIONS.find((u) => u.value === formData.unit)?.label ?? formData.unit
    : 'Select base unit';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const outletToUse = selectedOutletForMaterial || selectedOutlet?.id;
    
    if (!outletToUse) {
      alert('Please select an outlet for this material.');
      return;
    }
    
    if (!formData.name.trim()) {
      alert('Material name is required');
      return;
    }

    if (!formData.unit) {
      alert('Please select a base unit.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create the raw material using FormData
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('unit', formData.unit);
      formDataToSend.append('cost_price', '0');
      formDataToSend.append('selling_price', '0');
      formDataToSend.append('supplier_name', 'General');
      formDataToSend.append('min_stock_level', formData.reorder_level || '0');
      formDataToSend.append('initial_stock', formData.current_stock || '0');
      formDataToSend.append('for_direct_sale', 'false');
      formDataToSend.append('is_active', 'true');
      formDataToSend.append('outlet_id', outletToUse.toString());

      await api.post('/raw-materials', formDataToSend);
      setShowSuccessModal(true);

    } catch (err: any) {
      console.error('Error adding material:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to add material';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-text-primary">Add New Material</h1>
          <p className="text-text-secondary text-sm mt-1">Create a new material for inventory</p>
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
            <button
              ref={outletTriggerRef}
              type="button"
              onClick={() => setOutletDropdownOpen((o) => !o)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-left text-sm text-text-primary focus:border-primary focus:outline-none transition-colors flex items-center justify-between gap-2"
            >
              <span className={selectedOutletForMaterial ? '' : 'text-text-muted'}>{selectedOutletLabel}</span>
              <ChevronDown size={16} className="shrink-0 text-text-muted" />
            </button>
          </div>

          {/* Base Unit */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Base Unit <span className="text-danger">*</span>
            </label>
            <button
              ref={unitTriggerRef}
              type="button"
              onClick={() => setUnitDropdownOpen((o) => !o)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-left text-sm text-text-primary focus:border-primary focus:outline-none transition-colors flex items-center justify-between gap-2"
            >
              <span className={formData.unit ? '' : 'text-text-muted'}>{selectedUnitLabel}</span>
              <ChevronDown size={16} className="shrink-0 text-text-muted" />
            </button>
          </div>

          {/* Current Stock */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Current Stock <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.current_stock}
              onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
              placeholder="0"
            />
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
                      setSelectedOutletForMaterial(outlet.id);
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

      {/* Base Unit dropdown - portaled with search (Gram and Milliliter removed) */}
      {typeof document !== 'undefined' &&
        unitDropdownOpen &&
        unitDropdownRect &&
        createPortal(
          <div
            ref={unitDropdownRef}
            className="fixed z-[100] rounded-lg bg-surface border border-border shadow-lg overflow-hidden"
            style={{
              top: unitDropdownRect.top + 4,
              left: unitDropdownRect.left,
              width: unitDropdownRect.width,
            }}
          >
            <div className="p-2 border-b border-border bg-surface-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input
                  type="text"
                  placeholder="Search base unit..."
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredUnits.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-text-muted">No units match</div>
              ) : (
                filteredUnits.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, unit: u.value }));
                      setUnitSearch('');
                      setUnitDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-primary/10 focus:bg-primary/10 focus:outline-none border-b border-border last:border-b-0"
                  >
                    {u.label}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}

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
              <p className="text-text-primary font-medium">Material added successfully</p>
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
