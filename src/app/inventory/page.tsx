"use client";

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOutlet } from '@/contexts/OutletContext';
import api from '@/lib/api';
import DataTable from '@/components/tables/DataTable';
import { formatCurrency, formatQty, cn } from '@/lib/utils';

function formatCreatedDate(createdAt: string | null | undefined): string {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

import { Plus, Search, Package, Edit, Trash2, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ErrorModal } from '@/components/ui/ErrorModal';
import { Pagination } from '@/components/ui/Pagination';

export default function InventoryPage() {
  const { selectedOutlet, loading: outletLoading } = useOutlet();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{id: number, name: string} | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('Success');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Error');
  const [errorMessage, setErrorMessage] = useState('');
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockShowForm, setAddStockShowForm] = useState(false); // Item + Qty only after user clicks "Add stock" in popup
  const [addStockLines, setAddStockLines] = useState<{ itemId: string; quantity: string }[]>([]); // editable rows
  const [addStockSaving, setAddStockSaving] = useState(false);
  const [addStockItems, setAddStockItems] = useState<any[]>([]);
  const [addStockLoadingItems, setAddStockLoadingItems] = useState(false);
  const [addStockDropdownOpenIndex, setAddStockDropdownOpenIndex] = useState<number | null>(null);
  const [addStockItemSearch, setAddStockItemSearch] = useState('');
  const [addStockDropdownRect, setAddStockDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const addStockTriggerRef = useRef<HTMLButtonElement>(null);
  const addStockDropdownRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const isAllOutlet = selectedOutlet && (selectedOutlet.id === 0 || (selectedOutlet as any).outlet_type === 'all');

  useEffect(() => {
    if (addStockDropdownOpenIndex === null) {
      setAddStockDropdownRect(null);
      return;
    }
    const el = addStockTriggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setAddStockDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width });
  }, [addStockDropdownOpenIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (addStockDropdownOpenIndex === null) return;
      if (addStockTriggerRef.current?.contains(target)) return;
      if (addStockDropdownRef.current?.contains(target)) return;
      setAddStockDropdownOpenIndex(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addStockDropdownOpenIndex]);

  const fetchMaterials = async () => {
    if (!selectedOutlet) return;
    
    const outletIdParam = isAllOutlet ? '0' : selectedOutlet.id.toString();
    console.log('Fetching materials for outlet:', selectedOutlet.id, selectedOutlet.name);
    console.time('Fetch materials');
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: search,
        low_stock_only: lowStockOnly.toString(),
        outlet_id: outletIdParam,
        for_direct_sale: 'true',
        sort_by: sortBy,
        order: sortOrder,
      });
      
      console.log('API URL:', `/raw-materials?${params}`);
      console.time('API calls');
      const [materialsRes, countRes] = await Promise.all([
        api.get(`/raw-materials?${params}`),
        api.get(`/raw-materials/count?search=${search}&low_stock_only=${lowStockOnly}&outlet_id=${outletIdParam}&for_direct_sale=true`)
      ]);
      console.timeEnd('API calls');
      
      console.log('Materials received:', materialsRes.data.length);
      
      // Ensure stock is never negative - display 0 instead
      const materialsWithValidStock = materialsRes.data.map((m: any) => ({
        ...m,
        current_stock: Math.max(0, m.current_stock || 0)
      }));
      
      setMaterials(materialsWithValidStock);
      setTotalItems(countRes.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      console.timeEnd('Fetch materials');
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [currentPage, search, lowStockOnly, selectedOutlet, sortBy, sortOrder]);

  // Reset to first page when search or filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [search, lowStockOnly]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const openAddStockModal = () => {
    setAddStockShowForm(false);
    setAddStockLines([]);
    setShowAddStockModal(true);
    if (selectedOutlet) {
      setAddStockLoadingItems(true);
      api
        .get('/raw-materials', {
          params: { for_direct_sale: true, outlet_id: selectedOutlet.id, limit: 500 },
        })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : [];
          setAddStockItems(list.map((m: any) => ({ ...m, current_stock: Math.max(0, m.current_stock || 0) })));
        })
        .catch(() => setAddStockItems([]))
        .finally(() => setAddStockLoadingItems(false));
    } else {
      setAddStockItems([]);
    }
  };

  const closeAddStockModal = () => {
    setShowAddStockModal(false);
    setAddStockShowForm(false);
    setAddStockLines([]);
    setAddStockDropdownOpenIndex(null);
    setAddStockItemSearch('');
  };

  const startAddStockForm = () => {
    setAddStockShowForm(true);
    setAddStockLines([{ itemId: '', quantity: '' }]);
  };

  const updateAddStockLine = (index: number, field: 'itemId' | 'quantity', value: string) => {
    setAddStockLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  const addEmptyStockRow = () => {
    setAddStockLines((prev) => [...prev, { itemId: '', quantity: '' }]);
  };

  const removeAddStockLine = (index: number) => {
    setAddStockLines((prev) => prev.filter((_, i) => i !== index));
  };

  const getValidLinesForSave = (): { raw_material_id: number; quantity: number }[] => {
    return addStockLines
      .filter((line) => line.itemId && line.quantity && parseFloat(line.quantity) > 0)
      .map((line) => ({
        raw_material_id: parseInt(line.itemId, 10),
        quantity: parseFloat(line.quantity),
      }));
  };

  const getAddStockItemLabel = (itemId: string) => {
    if (!itemId) return 'Select item';
    const m = addStockItems.find((x: any) => x.id === parseInt(itemId, 10));
    if (!m) return 'Select item';
    const stock = Number(m.current_stock ?? 0);
    const stockStr = stock % 1 === 0 ? String(Math.round(stock)) : stock.toFixed(3).replace(/\.?0+$/, '');
    return `${m.name} — ${stockStr}`;
  };

  const filteredAddStockItems = addStockItems.filter((m: any) =>
    (m.name || '').toLowerCase().includes(addStockItemSearch.toLowerCase().trim())
  );

  const handleSaveAllStock = async () => {
    const valid = getValidLinesForSave();
    if (!selectedOutlet || valid.length === 0) {
      setErrorTitle('Cannot add stock');
      setErrorMessage('Please add at least one item with a valid quantity.');
      setShowErrorModal(true);
      return;
    }
    setAddStockSaving(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      await Promise.all(
        valid.map((line) =>
          api.post('/raw-materials/inward', {
            raw_material_id: line.raw_material_id,
            quantity: line.quantity,
            outlet_id: selectedOutlet.id,
            transaction_date: dateStr,
          })
        )
      );
      closeAddStockModal();
      setSuccessTitle('Stock Added');
      setSuccessMessage(
        valid.length === 1 ? 'Stock added successfully.' : `${valid.length} items added successfully.`
      );
      setShowSuccessModal(true);
      fetchMaterials();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorTitle('Cannot add stock');
      setErrorMessage(typeof detail === 'string' ? detail : 'Failed to add stock. Please try again.');
      setShowErrorModal(true);
    } finally {
      setAddStockSaving(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteItem({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    
    try {
      await api.delete(`/raw-materials/${deleteItem.id}`);
      await fetchMaterials(); // Refresh the list
      
      // Show success modal
      setSuccessTitle('Product Deleted');
      setSuccessMessage(`"${deleteItem.name}" has been deleted successfully.`);
      setShowSuccessModal(true);
      setDeleteItem(null);
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product. Please try again.');
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
    setSuccessTitle('Success');
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Inventory Management</h1>
          <p className="text-text-secondary text-sm mt-1">Manage your products and stock levels.</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={openAddStockModal}
            disabled={!selectedOutlet}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Package size={18} />
            ADD STOCK
          </button>
          <Link
            href="/inventory/add"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary-muted transition-colors"
          >
            <Plus size={18} />
            ADD PRODUCT
          </Link>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          Low Stock Only
        </label>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-secondary">Sort by:</span>
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [by, ord] = e.target.value.split('-') as ['name' | 'created_at', 'asc' | 'desc'];
            setSortBy(by);
            setSortOrder(ord);
            setCurrentPage(1);
          }}
          className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-primary focus:outline-none"
        >
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="created_at-desc">Newest first</option>
          <option value="created_at-asc">Oldest first</option>
        </select>
      </div>

      {/* Table Section */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <DataTable
          columns={['Item', 'Item Name', ...(isAllOutlet ? ['Outlet'] : []), 'Category', 'Type', 'Stock', 'Price', 'Created', 'Age', 'Actions']}
          data={materials}
          loading={loading}
          renderRow={(m) => (
            <>
              <td className="px-6 py-4">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-surface-2">
                  <img
                    src={m.image_url ? `http://localhost:8000${m.image_url}` : '/images/default_product.png'}
                    alt={m.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/images/default_product.png';
                    }}
                  />
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-medium text-text-primary">{m.name}</span>
              </td>
              {isAllOutlet && (
                <td className="px-6 py-4">
                  <span className="text-sm text-text-secondary">{m.outlet_name ?? '—'}</span>
                </td>
              )}
              <td className="px-6 py-4">
                <span className="text-sm text-text-secondary">{m.supplier_name || 'General'}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${m.item_type === 'non_veg' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <span className="text-sm text-text-primary">{m.item_type === 'non_veg' ? 'Non-Veg' : 'Veg'}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={cn(
                  "text-sm font-bold",
                  m.is_low_stock ? "text-danger" : "text-text-primary"
                )}>
                  {formatQty(m.current_stock, '')}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-medium text-success">{formatCurrency(m.selling_price || m.cost_price)}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-text-secondary">{formatCreatedDate(m.created_at)}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-text-secondary">{formatCreatedDate(m.created_at)}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Link 
                    href={`/inventory/edit/${m.id}`}
                    className="text-primary hover:text-primary-hover transition-colors p-1"
                    title="Edit Product"
                  >
                    <Edit size={16} />
                  </Link>
                  <button 
                    onClick={() => handleDelete(m.id, m.name)}
                    className="text-danger hover:text-danger/80 transition-colors p-1"
                    title="Delete Product"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </>
          )}
        />
        
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
        />
      </div>

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-text-primary">Add Stock</h2>
              <button
                type="button"
                onClick={closeAddStockModal}
                className="p-2 rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!addStockShowForm ? (
                <>
                  <p className="text-sm text-text-secondary">Click below to add one or more items to stock.</p>
                  <button
                    type="button"
                    onClick={startAddStockForm}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    <Plus size={18} />
                    Add stock
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    {addStockLines.map((line, idx) => (
                      <div key={idx} className="flex gap-3 items-end">
                        <div className="flex-1 min-w-0 relative">
                          <label className="block text-sm font-medium text-text-primary mb-2">Item</label>
                          <button
                            ref={addStockDropdownOpenIndex === idx ? addStockTriggerRef : null}
                            type="button"
                            onClick={() => {
                              setAddStockDropdownOpenIndex((prev) => (prev === idx ? null : idx));
                              if (addStockDropdownOpenIndex !== idx) setAddStockItemSearch('');
                            }}
                            disabled={addStockLoadingItems}
                            className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-lg text-left text-sm text-text-primary focus:border-primary focus:outline-none transition-colors flex items-center justify-between gap-2"
                          >
                            <span className={line.itemId ? '' : 'text-text-muted'}>
                              {addStockLoadingItems ? 'Loading...' : getAddStockItemLabel(line.itemId)}
                            </span>
                            <ChevronDown size={16} className="shrink-0 text-text-muted" />
                          </button>
                        </div>
                        <div className="w-28 shrink-0">
                          <label className="block text-sm font-medium text-text-primary mb-2">Quantity to add</label>
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            placeholder="0"
                            value={line.quantity}
                            onChange={(e) => updateAddStockLine(idx, 'quantity', e.target.value)}
                            className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAddStockLine(idx)}
                          disabled={addStockLines.length === 1}
                          className="shrink-0 p-2.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          aria-label="Remove row"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addEmptyStockRow}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-2 border border-border text-text-primary font-medium rounded-lg hover:bg-surface-2/80 transition-colors"
                  >
                    <Plus size={16} />
                    Add more
                  </button>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setAddStockShowForm(false)}
                      className="flex-1 px-4 py-2.5 bg-surface-2 border border-border text-text-primary font-medium rounded-lg hover:bg-surface-2/80 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAllStock}
                      disabled={addStockSaving || getValidLinesForSave().length === 0}
                      className="flex-1 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {addStockSaving ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        `Save all ${getValidLinesForSave().length > 0 ? `(${getValidLinesForSave().length})` : ''}`
                      )}
                    </button>
                  </div>
                </>
              )}
              {addStockShowForm && (
                <div className="pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={closeAddStockModal}
                    className="w-full px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Stock item dropdown - portaled so it renders outside the modal */}
      {typeof document !== 'undefined' &&
        showAddStockModal &&
        addStockDropdownOpenIndex !== null &&
        addStockDropdownRect &&
        !addStockLoadingItems &&
        createPortal(
          <div
            ref={addStockDropdownRef}
            className="fixed z-[100] rounded-lg bg-surface border border-border shadow-lg overflow-hidden"
            style={{
              top: addStockDropdownRect.top + 4,
              left: addStockDropdownRect.left,
              width: addStockDropdownRect.width,
            }}
          >
            <div className="p-2 border-b border-border bg-surface-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input
                  type="text"
                  placeholder="Search item..."
                  value={addStockItemSearch}
                  onChange={(e) => setAddStockItemSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredAddStockItems.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-text-muted">No items match</div>
              ) : (
                filteredAddStockItems.map((m: any) => {
                  const stock = Number(m.current_stock ?? 0);
                  const stockStr = stock % 1 === 0 ? String(Math.round(stock)) : stock.toFixed(3).replace(/\.?0+$/, '');
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        updateAddStockLine(addStockDropdownOpenIndex, 'itemId', String(m.id));
                        setAddStockItemSearch('');
                        setAddStockDropdownOpenIndex(null);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-primary/10 focus:bg-primary/10 focus:outline-none border-b border-border last:border-b-0"
                    >
                      {m.name} — {stockStr}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title={successTitle}
        message={successMessage}
        autoClose={false}
      />

      {/* Error Modal (e.g. insufficient materials when adding stock) */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorTitle}
        message={errorMessage}
      />
    </div>
  );
}