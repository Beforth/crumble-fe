"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOutlet } from '@/contexts/OutletContext';
import api from '@/lib/api';
import { Plus, Trash2, Calendar, Search, ChevronDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Pagination } from '@/components/ui/Pagination';

interface PurchaseItem {
  raw_material_id: number;
  raw_material_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export default function PurchasePage() {
  const { selectedOutlet } = useOutlet();
  const [supplier, setSupplier] = useState('');
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<any>(null);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productDropdownRect, setProductDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const productTriggerRef = useRef<HTMLButtonElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 10;
  const [historyPage, setHistoryPage] = useState(1);
  const [historySortBy, setHistorySortBy] = useState<'date' | 'supplier' | 'total'>('date');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (selectedOutlet) {
      fetchData();
    }
  }, [selectedOutlet]);

  useEffect(() => {
    if (!productDropdownOpen) {
      setProductDropdownRect(null);
      return;
    }
    const el = productTriggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setProductDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width });
  }, [productDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!productDropdownOpen) return;
      if (productTriggerRef.current?.contains(target)) return;
      if (productDropdownRef.current?.contains(target)) return;
      setProductDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [productDropdownOpen]);

  const filteredProductsForDropdown = rawMaterials.filter((m: any) =>
    (m.name || '').toLowerCase().includes(productSearch.toLowerCase())
  );
  const selectedProductLabel = selectedMaterial
    ? rawMaterials.find((m: any) => m.id === parseInt(selectedMaterial))?.name || 'Select product'
    : 'Select product';

  const isAllOutlet = selectedOutlet && (selectedOutlet.id === 0 || (selectedOutlet as any).outlet_type === 'all');

  const fetchData = async () => {
    const outletId = selectedOutlet?.id != null ? Number(selectedOutlet.id) : null;
    if (outletId == null && !isAllOutlet) return;
    const outletIdParam = isAllOutlet ? 0 : outletId;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('outlet_id', String(outletIdParam));
      params.set('limit', '1000');
      const rmRes = await api.get(`/raw-materials?${params}`);
      const allMaterials = Array.isArray(rmRes.data) ? rmRes.data : [];
      setRawMaterials(allMaterials);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setRawMaterials([]);
    }

    try {
      const historyParams = new URLSearchParams({ outlet_id: String(outletIdParam) });
      const historyRes = await api.get(`/raw-materials/purchase-history?${historyParams}`);
      const list = Array.isArray(historyRes.data) ? historyRes.data : [];
      // Exclude placeholder/generic entries (General, categories, zero-total)
      const excludeSupplierNames = ['main course', "extra's", 'extras', 'general'];
      const isRealSupplier = (name: string) => {
        const n = (name || '').trim().toLowerCase();
        return n && !excludeSupplierNames.includes(n);
      };
      const hasValidTotal = (p: any) => (p.total ?? 0) > 0;
      const filteredList = list.filter(
        (p: any) => isRealSupplier(p.supplier) && hasValidTotal(p)
      );
      setPurchaseHistory(filteredList);
      const supplierSet = new Set<string>();
      filteredList.forEach((p: any) => {
        if (p.supplier && isRealSupplier(p.supplier)) supplierSet.add(p.supplier);
      });
      setSuppliers(Array.from(supplierSet).sort());
    } catch (err) {
      console.error('Failed to fetch purchase history:', err);
      setPurchaseHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedMaterial || !quantity || !unitPrice) return;

    const material = rawMaterials.find(m => m.id === parseInt(selectedMaterial));
    if (!material) return;

    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    const subtotal = qty * price;

    const newItem: PurchaseItem = {
      raw_material_id: material.id,
      raw_material_name: material.name,
      quantity: qty,
      unit_price: price,
      subtotal: subtotal
    };

    setItems([...items, newItem]);
    setSelectedMaterial('');
    setQuantity('');
    setUnitPrice('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  const handleClear = () => {
    setSupplier('');
    setInvoiceNumber('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setItems([]);
    setSelectedMaterial('');
    setQuantity('');
    setUnitPrice('');
  };

  const handleSubmit = async () => {
    if (!selectedOutlet || items.length === 0 || !supplier || !invoiceNumber) {
      alert('Please fill all required fields and add at least one item');
      return;
    }

    setSubmitting(true);
    try {
      // Create purchase transactions
      for (const item of items) {
        await api.post('/raw-materials/transactions', {
          type: 'inward',
          inward_type: 'purchase',
          raw_material_id: item.raw_material_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          supplier_name: supplier,
          invoice_number: invoiceNumber,
          outlet_id: selectedOutlet.id,
          transaction_date: purchaseDate,
          notes: `Purchase from ${supplier}`
        });
      }

      handleClear();
      await fetchData();
      setSuccessMessage('Purchase recorded successfully!');
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Failed to record purchase:', err);
      alert(err.response?.data?.detail || 'Failed to record purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSupplier = () => {
    if (!newSupplierName.trim()) {
      alert('Please enter supplier name');
      return;
    }

    // Add to suppliers list
    if (!suppliers.includes(newSupplierName.trim())) {
      setSuppliers([...suppliers, newSupplierName.trim()]);
    }
    
    // Set as selected supplier
    setSupplier(newSupplierName.trim());
    setShowAddSupplierModal(false);
    setNewSupplierName('');
    setNewSupplierPhone('');
    setNewSupplierEmail('');
    
    // Show success modal
    setSuccessMessage('Supplier added successfully!');
    setShowSuccessModal(true);
  };

  const handleDeleteClick = (purchase: any) => {
    setPurchaseToDelete(purchase);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!purchaseToDelete) return;

    try {
      await api.delete(`/raw-materials/purchase-history/${purchaseToDelete.id}`);
      setShowDeleteConfirm(false);
      setPurchaseToDelete(null);
      await fetchData();
      setSuccessMessage('Purchase deleted successfully!');
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Failed to delete purchase:', err);
      alert(err.response?.data?.detail || 'Failed to delete purchase');
    }
  };

  const filteredHistory = purchaseHistory.filter(p =>
    p.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    const mul = historySortOrder === 'asc' ? 1 : -1;
    if (historySortBy === 'date') {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return mul * (da - db);
    }
    if (historySortBy === 'supplier') {
      const sa = (a.supplier || '').toLowerCase();
      const sb = (b.supplier || '').toLowerCase();
      return mul * sa.localeCompare(sb);
    }
    const ta = Number(a.total) || 0;
    const tb = Number(b.total) || 0;
    return mul * (ta - tb);
  });
  const totalHistoryPages = Math.max(1, Math.ceil(sortedHistory.length / ITEMS_PER_PAGE));
  const paginatedHistory = sortedHistory.slice(
    (historyPage - 1) * ITEMS_PER_PAGE,
    historyPage * ITEMS_PER_PAGE
  );

  return (
    <div className="h-screen flex animate-in fade-in duration-500">
      {/* Purchase History Section */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Purchase History</h1>
            <p className="text-sm text-text-secondary">View all purchase transactions</p>
          </div>
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium shadow-lg"
          >
            <Plus size={18} />
            Add Supplier
          </button>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by invoice or supplier..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setHistoryPage(1); }}
              className="w-full px-4 py-3 pl-10 bg-surface border border-border rounded-lg text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
            <svg className="w-5 h-5 absolute left-3 top-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-secondary">Sort by:</span>
            <select
              value={`${historySortBy}-${historySortOrder}`}
              onChange={(e) => {
                const [by, ord] = e.target.value.split('-') as ['date' | 'supplier' | 'total', 'asc' | 'desc'];
                setHistorySortBy(by);
                setHistorySortOrder(ord);
                setHistoryPage(1);
              }}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="date-desc">Date (newest)</option>
              <option value="date-asc">Date (oldest)</option>
              <option value="supplier-asc">Supplier A–Z</option>
              <option value="supplier-desc">Supplier Z–A</option>
              <option value="total-desc">Total (high–low)</option>
              <option value="total-asc">Total (low–high)</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="flex-1 overflow-y-auto">
          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Invoice No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Supplier
                  </th>
                  {isAllOutlet && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Outlet
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={isAllOutlet ? 7 : 6} className="px-6 py-8 text-center text-text-secondary">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={isAllOutlet ? 7 : 6} className="px-6 py-8 text-center text-text-secondary">
                      No purchase history found
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((purchase) => (
                    <tr key={`${purchase.id}-${purchase.outlet_id ?? 0}`} className="hover:bg-surface-2 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-primary font-bold">
                        {purchase.invoice_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary">
                        {purchase.supplier}
                      </td>
                      {isAllOutlet && (
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {(purchase as any).outlet_name ?? '—'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {formatDate(purchase.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-text-primary">
                        {purchase.items}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-mono text-primary font-bold">
                        {formatCurrency(purchase.total)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleDeleteClick(purchase)}
                          className="p-2 text-danger hover:bg-danger/10 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={historyPage}
              totalPages={totalHistoryPages}
              onPageChange={setHistoryPage}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={sortedHistory.length}
            />
          </div>
        </div>
      </div>

      {/* New Purchase Section */}
      <div className="w-96 flex flex-col bg-surface border-l border-border shrink-0">
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">New Purchase</h2>
          <button
            onClick={handleClear}
            disabled={items.length === 0}
            className="text-xs text-danger hover:text-danger/80 font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Supplier */}
          <div>
            <label className="text-xs font-bold text-text-primary mb-2 block">Supplier *</label>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            >
              <option value="">Select supplier</option>
              {suppliers.map((sup, index) => (
                <option key={index} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Number */}
          <div>
            <label className="text-xs font-bold text-text-primary mb-2 block">Invoice Number *</label>
            <input
              type="text"
              placeholder="Invoice number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Purchase Date */}
          <div>
            <label className="text-xs font-bold text-text-primary mb-2 block">Purchase Date *</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Add Item Section */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs font-bold text-text-primary mb-3">Add Item</p>
            
            <div className="space-y-3">
              <div className="relative">
                <label className="text-xs text-text-secondary mb-1 block">Product *</label>
                <button
                  ref={productTriggerRef}
                  type="button"
                  onClick={() => setProductDropdownOpen((o) => !o)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors flex items-center justify-between gap-2 text-left"
                >
                  <span className={selectedMaterial ? 'font-medium' : 'text-text-muted'}>{selectedProductLabel}</span>
                  <ChevronDown size={16} className="shrink-0 text-text-muted" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Quantity *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Price (₹) *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleAddItem}
                disabled={!selectedMaterial || !quantity || !unitPrice}
                className="w-full py-2 bg-surface-2 border border-border text-text-primary text-sm font-medium rounded-lg hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Item
              </button>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-bold text-text-primary mb-3">Items ({items.length})</p>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-surface-2 rounded-lg border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{item.raw_material_name}</p>
                      <p className="text-xs text-text-secondary">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">{formatCurrency(item.subtotal)}</span>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 text-danger hover:bg-danger/10 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Total and Submit */}
        <div className="p-6 border-t border-border space-y-4">
          <div className="flex justify-between text-lg font-bold text-text-primary">
            <span>Total Amount</span>
            <span className="text-primary font-mono">{formatCurrency(totalAmount)}</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={items.length === 0 || !supplier || !invoiceNumber || submitting}
            className="w-full py-3 bg-primary text-white text-sm font-medium rounded-lg shadow-md shadow-primary-muted hover:bg-primary-hover disabled:grayscale disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {submitting ? 'Saving...' : 'Save Purchase'}
          </button>
        </div>
      </div>

      {/* Product dropdown - portaled so it renders outside the sidebar */}
      {typeof document !== 'undefined' &&
        productDropdownOpen &&
        productDropdownRect &&
        createPortal(
          <div
            ref={productDropdownRef}
            className="fixed z-[100] rounded-lg bg-surface border border-border shadow-lg overflow-hidden"
            style={{
              top: productDropdownRect.top + 4,
              left: productDropdownRect.left,
              width: productDropdownRect.width,
            }}
          >
            <div className="p-2 border-b border-border bg-surface-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input
                  type="text"
                  placeholder="Search product..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredProductsForDropdown.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-text-muted">No products match</div>
              ) : (
                filteredProductsForDropdown.map((material: any) => (
                  <button
                    key={material.id}
                    type="button"
                    onClick={() => {
                      setSelectedMaterial(String(material.id));
                      setProductSearch('');
                      setProductDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-primary/10 focus:bg-primary/10 focus:outline-none border-b border-border last:border-b-0"
                  >
                    <span className="font-medium">{material.name}</span>
                    {material.for_direct_sale && (
                      <span className="ml-2 text-[10px] text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">Ready</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-xl font-bold text-text-primary">Add New Supplier</h2>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="Enter supplier name"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-primary focus:border-primary focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-primary focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={newSupplierEmail}
                  onChange={(e) => setNewSupplierEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-primary focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-surface-2 border-t border-border flex gap-3">
              <button
                onClick={() => {
                  setShowAddSupplierModal(false);
                  setNewSupplierName('');
                  setNewSupplierPhone('');
                  setNewSupplierEmail('');
                }}
                className="flex-1 py-3 bg-background border border-border text-text-primary font-medium rounded-lg hover:bg-surface-2 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleAddSupplier}
                disabled={!newSupplierName.trim()}
                className="flex-1 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Purchase recorded"
        message={successMessage}
        autoClose={false}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPurchaseToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Purchase"
        message={`Are you sure you want to delete this purchase? Invoice: ${purchaseToDelete?.invoice_number || 'N/A'}, Supplier: ${purchaseToDelete?.supplier || 'N/A'}. This action cannot be undone.`}
        confirmText="DELETE"
        cancelText="CANCEL"
      />
    </div>
  );
}
