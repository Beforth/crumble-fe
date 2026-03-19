"use client";

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useOutlet } from '@/contexts/OutletContext';
import api from '@/lib/api';
import { Plus, RefreshCw, Edit, Settings, Trash2, PackagePlus, X, Search, ChevronDown } from 'lucide-react';
import { getTodayDateString, formatQty } from '@/lib/utils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { Pagination } from '@/components/ui/Pagination';

const ITEMS_PER_PAGE = 10;

export default function MaterialsInventoryPage() {
  const router = useRouter();
  const { selectedOutlet, loading: outletLoading } = useOutlet();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<{ id: number; name: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('Success');
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockMaterial, setAddStockMaterial] = useState<{ id: number; name: string; unit: string } | null>(null);
  const [addStockQty, setAddStockQty] = useState('');
  const [addStockSaving, setAddStockSaving] = useState(false);

  // Pagination & sort
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  // Bulk Add Stock modal (like Inventory)
  const [showBulkAddStockModal, setShowBulkAddStockModal] = useState(false);
  const [bulkAddStockShowForm, setBulkAddStockShowForm] = useState(false);
  const [bulkAddStockLines, setBulkAddStockLines] = useState<{ itemId: string; quantity: string }[]>([]);
  const [bulkAddStockItems, setBulkAddStockItems] = useState<any[]>([]);
  const [bulkAddStockLoadingItems, setBulkAddStockLoadingItems] = useState(false);
  const [bulkAddStockSaving, setBulkAddStockSaving] = useState(false);
  const [bulkAddStockDropdownOpenIndex, setBulkAddStockDropdownOpenIndex] = useState<number | null>(null);
  const [bulkAddStockItemSearch, setBulkAddStockItemSearch] = useState('');
  const [bulkAddStockDropdownRect, setBulkAddStockDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const bulkAddStockTriggerRef = useRef<HTMLButtonElement>(null);
  const bulkAddStockDropdownRef = useRef<HTMLDivElement>(null);

  const isAllOutlet = selectedOutlet && (selectedOutlet.id === 0 || (selectedOutlet as any).outlet_type === 'all');

  useEffect(() => {
    if (selectedOutlet) {
      fetchMaterials();
    }
  }, [selectedOutlet, currentPage, searchTerm, lowStockOnly, sortBy, sortOrder]);

  useEffect(() => {
    if (bulkAddStockDropdownOpenIndex === null) {
      setBulkAddStockDropdownRect(null);
      return;
    }
    const el = bulkAddStockTriggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setBulkAddStockDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width });
  }, [bulkAddStockDropdownOpenIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (bulkAddStockDropdownOpenIndex === null) return;
      if (bulkAddStockTriggerRef.current?.contains(target)) return;
      if (bulkAddStockDropdownRef.current?.contains(target)) return;
      setBulkAddStockDropdownOpenIndex(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bulkAddStockDropdownOpenIndex]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [searchTerm, lowStockOnly]);

  const fetchMaterials = async () => {
    if (!selectedOutlet) return;
    const outletIdParam = isAllOutlet ? 0 : selectedOutlet.id;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        outlet_id: String(outletIdParam),
        for_direct_sale: 'false',
        search: searchTerm,
        low_stock_only: lowStockOnly.toString(),
        sort_by: sortBy,
        order: sortOrder,
      });
      const [res, countRes] = await Promise.all([
        api.get(`/raw-materials?${params}`),
        api.get(`/raw-materials/count?search=${searchTerm}&low_stock_only=${lowStockOnly}&outlet_id=${outletIdParam}&for_direct_sale=false`),
      ]);
      const materialsWithValidStock = (res.data || []).map((m: any) => ({
        ...m,
        current_stock: Math.max(0, m.current_stock || 0),
      }));
      setMaterials(materialsWithValidStock);
      setTotalItems(countRes.data?.total ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number, name: string) => {
    setMaterialToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const openAddStock = (material: { id: number; name: string; unit: string }) => {
    setAddStockMaterial(material);
    setAddStockQty('');
    setShowAddStockModal(true);
  };

  const submitAddStock = async () => {
    if (!addStockMaterial || !addStockQty || parseFloat(addStockQty) <= 0) return;
    if (!selectedOutlet?.id) {
      alert('Please select an outlet first.');
      return;
    }
    setAddStockSaving(true);
    try {
      const qty = parseFloat(addStockQty);
      await api.post('/raw-materials/inward', {
        raw_material_id: addStockMaterial.id,
        quantity: qty,
        rate: 0,
        total_amount: 0,
        supplier: 'Opening stock',
        transaction_date: getTodayDateString(),
        outlet_id: selectedOutlet.id,
      });
      setShowAddStockModal(false);
      setAddStockMaterial(null);
      setAddStockQty('');
      fetchMaterials();
    } catch (err) {
      console.error(err);
      alert('Failed to add stock. Please try again.');
    } finally {
      setAddStockSaving(false);
    }
  };

  const openBulkAddStockModal = () => {
    setBulkAddStockShowForm(false);
    setBulkAddStockLines([]);
    setShowBulkAddStockModal(true);
    if (selectedOutlet) {
      const outletIdParam = isAllOutlet ? 0 : selectedOutlet.id;
      setBulkAddStockLoadingItems(true);
      api
        .get('/raw-materials', {
          params: { for_direct_sale: false, outlet_id: outletIdParam, limit: 500 },
        })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : [];
          setBulkAddStockItems(list.map((m: any) => ({ ...m, current_stock: Math.max(0, m.current_stock || 0) })));
        })
        .catch(() => setBulkAddStockItems([]))
        .finally(() => setBulkAddStockLoadingItems(false));
    } else {
      setBulkAddStockItems([]);
    }
  };

  const closeBulkAddStockModal = () => {
    setShowBulkAddStockModal(false);
    setBulkAddStockShowForm(false);
    setBulkAddStockLines([]);
    setBulkAddStockDropdownOpenIndex(null);
    setBulkAddStockItemSearch('');
  };

  const startBulkAddStockForm = () => {
    setBulkAddStockShowForm(true);
    setBulkAddStockLines([{ itemId: '', quantity: '' }]);
  };

  const updateBulkAddStockLine = (index: number, field: 'itemId' | 'quantity', value: string) => {
    setBulkAddStockLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  const addEmptyBulkStockRow = () => {
    setBulkAddStockLines((prev) => [...prev, { itemId: '', quantity: '' }]);
  };

  const removeBulkAddStockLine = (index: number) => {
    setBulkAddStockLines((prev) => prev.filter((_, i) => i !== index));
  };

  const getBulkValidLinesForSave = (): { raw_material_id: number; quantity: number; outlet_id: number }[] => {
    return bulkAddStockLines
      .filter((line) => line.itemId && line.quantity && parseFloat(line.quantity) > 0)
      .map((line) => {
        const mid = parseInt(line.itemId, 10);
        const mat = bulkAddStockItems.find((m: any) => m.id === mid);
        const outletId = isAllOutlet && mat?.outlet_id != null ? mat.outlet_id : selectedOutlet?.id;
        return {
          raw_material_id: mid,
          quantity: parseFloat(line.quantity),
          outlet_id: outletId ?? selectedOutlet?.id ?? 0,
        };
      })
      .filter((l) => l.outlet_id > 0);
  };

  const getBulkAddStockItemLabel = (itemId: string) => {
    if (!itemId) return 'Select item';
    const m = bulkAddStockItems.find((x: any) => x.id === parseInt(itemId, 10));
    if (!m) return 'Select item';
    const stock = Number(m.current_stock ?? 0);
    const stockStr = stock % 1 === 0 ? String(Math.round(stock)) : stock.toFixed(3).replace(/\.?0+$/, '');
    const suffix = isAllOutlet && m.outlet_name ? ` (${m.outlet_name})` : '';
    return `${m.name} — ${stockStr}${suffix}`;
  };

  const filteredBulkAddStockItems = bulkAddStockItems.filter((m: any) =>
    (m.name || '').toLowerCase().includes(bulkAddStockItemSearch.toLowerCase().trim())
  );

  const handleBulkSaveAllStock = async () => {
    const valid = getBulkValidLinesForSave();
    if (!selectedOutlet || valid.length === 0) {
      alert('Please add at least one material with a valid quantity.');
      return;
    }
    setBulkAddStockSaving(true);
    try {
      const dateStr = getTodayDateString();
      await Promise.all(
        valid.map((line) =>
          api.post('/raw-materials/inward', {
            raw_material_id: line.raw_material_id,
            quantity: line.quantity,
            outlet_id: line.outlet_id,
            transaction_date: dateStr,
          })
        )
      );
      closeBulkAddStockModal();
      setSuccessTitle('Stock Added');
      setSuccessMessage(valid.length === 1 ? 'Stock added successfully.' : `${valid.length} materials added successfully.`);
      setShowSuccessModal(true);
      fetchMaterials();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'Failed to add stock. Please try again.');
    } finally {
      setBulkAddStockSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!materialToDelete) return;
    
    try {
      await api.delete(`/raw-materials/${materialToDelete.id}`);
      setShowDeleteModal(false);
      setSuccessTitle('Material Deleted');
      setSuccessMessage(`${materialToDelete.name} has been deleted successfully`);
      setShowSuccessModal(true);
      setMaterialToDelete(null);
      // Refresh the list
      await fetchMaterials();
    } catch (err: any) {
      console.error('Failed to delete material:', err);
      alert(err.response?.data?.detail || 'Failed to delete material');
      setShowDeleteModal(false);
      setMaterialToDelete(null);
    }
  };

  const totalMaterials = totalItems;
  const lowStockItems = materials.filter(m => m.is_low_stock).length;
  const outOfStock = materials.filter(m => parseFloat(m.current_stock || 0) <= 0).length;

  const getStockPercentage = (current: any, reorder: any) => {
    const currentNum = parseFloat(current) || 0;
    const reorderNum = parseFloat(reorder) || 0;
    if (reorderNum <= 0) return currentNum > 0 ? 100 : 0;
    return Math.min(100, Math.max(0, (currentNum / reorderNum) * 100));
  };

  const getStockColor = (percentage: number) => {
    if (percentage >= 50) return 'bg-success';
    if (percentage >= 25) return 'bg-warning';
    return 'bg-danger';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Materials Inventory</h1>
        <p className="text-text-secondary text-sm">Manage raw materials and stock levels</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-surface border border-border rounded-lg p-6">
          <p className="text-text-secondary text-sm mb-2">Total Materials</p>
          <p className="text-4xl font-bold text-primary">{totalMaterials}</p>
        </div>
        <div className="bg-surface border border-border rounded-lg p-6">
          <p className="text-text-secondary text-sm mb-2">Low Stock Items</p>
          <p className="text-4xl font-bold text-warning">{lowStockItems}</p>
        </div>
        <div className="bg-surface border border-border rounded-lg p-6">
          <p className="text-text-secondary text-sm mb-2">Out of Stock</p>
          <p className="text-4xl font-bold text-danger">{outOfStock}</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/raw-materials/add')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary-muted"
          >
            <Plus size={18} />
            ADD NEW MATERIAL
          </button>
          <button
            onClick={openBulkAddStockModal}
            disabled={!selectedOutlet}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PackagePlus size={18} />
            Add Stock
          </button>
        </div>
        <button
          onClick={fetchMaterials}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-2 transition-colors"
        >
          <RefreshCw size={18} />
          REFRESH
        </button>
      </div>

      {/* Search Bar with Filter */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search materials by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-10 bg-surface border border-border rounded-lg text-text-primary focus:border-primary focus:outline-none transition-colors"
          />
          <svg className="w-5 h-5 absolute left-3 top-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <label className="flex items-center gap-2 whitespace-nowrap">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-text-secondary">Low Stock Only</span>
        </label>
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
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="created_at-desc">Newest first</option>
            <option value="created_at-asc">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-2 border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Material Name
              </th>
              {isAllOutlet && (
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Outlet
                </th>
              )}
              <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                Stock Level %
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                Current Stock
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                Reorder Level
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
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
            ) : materials.length === 0 ? (
              <tr>
                <td colSpan={isAllOutlet ? 7 : 6} className="px-6 py-8 text-center text-text-secondary">
                  No materials found
                </td>
              </tr>
            ) : (
              materials.map((material) => {
                const stockPercentage = getStockPercentage(material.current_stock, material.min_stock_level);
                const stockColor = getStockColor(stockPercentage);
                
                return (
                  <tr key={material.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-text-primary">
                      {material.name}
                    </td>
                    {isAllOutlet && (
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {material.outlet_name ?? '—'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      {isAllOutlet ? (
                        <span className="text-sm font-medium text-text-primary">
                          {Math.round(stockPercentage)}%
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <div className="flex-1 max-w-xs h-6 bg-surface-2 rounded-full overflow-hidden border border-border">
                            <div
                              className={`h-full ${stockColor} transition-all duration-300`}
                              style={{ width: `${stockPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-text-primary min-w-[45px] text-right">
                            {Math.round(stockPercentage)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-mono text-text-primary">
                      {parseFloat(material.current_stock || 0).toFixed(2)} <span className="text-text-muted text-xs">{material.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-mono text-text-secondary">
                      {parseFloat(material.min_stock_level || 0).toFixed(2)} <span className="text-text-muted text-xs">{material.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        material.is_low_stock 
                          ? 'bg-danger/10 text-danger' 
                          : 'bg-success/10 text-success'
                      } ${isAllOutlet ? 'whitespace-nowrap inline-block min-w-[4.5rem]' : ''}`}>
                        {material.is_low_stock ? 'Low Stock' : 'Healthy'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => openAddStock({ id: material.id, name: material.name, unit: material.unit })}
                          className="text-success hover:text-success/80 transition-colors p-1"
                          title="Add stock"
                        >
                          <PackagePlus size={16} />
                        </button>
                        <button
                          onClick={() => router.push(`/raw-materials/edit/${material.id}`)}
                          className="text-primary hover:text-primary-hover transition-colors p-1"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push('/raw-materials/outward')}
                          className="text-warning hover:text-warning/80 transition-colors p-1"
                          title="Adjust"
                        >
                          <Settings size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(material.id, material.name)}
                          className="text-danger hover:text-danger/80 transition-colors p-1"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={totalItems}
        />
      </div>

      {/* Bulk Add Stock Modal (like Inventory) */}
      {showBulkAddStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-text-primary">Add Stock</h2>
              <button
                type="button"
                onClick={closeBulkAddStockModal}
                className="p-2 rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!bulkAddStockShowForm ? (
                <>
                  <p className="text-sm text-text-secondary">Click below to add one or more materials to stock.</p>
                  <button
                    type="button"
                    onClick={startBulkAddStockForm}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    <Plus size={18} />
                    Add stock
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    {bulkAddStockLines.map((line, idx) => (
                      <div key={idx} className="flex gap-3 items-end">
                        <div className="flex-1 min-w-0 relative">
                          <label className="block text-sm font-medium text-text-primary mb-2">Item</label>
                          <button
                            ref={bulkAddStockDropdownOpenIndex === idx ? bulkAddStockTriggerRef : null}
                            type="button"
                            onClick={() => {
                              setBulkAddStockDropdownOpenIndex((prev) => (prev === idx ? null : idx));
                              if (bulkAddStockDropdownOpenIndex !== idx) setBulkAddStockItemSearch('');
                            }}
                            disabled={bulkAddStockLoadingItems}
                            className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-lg text-left text-sm text-text-primary focus:border-primary focus:outline-none transition-colors flex items-center justify-between gap-2"
                          >
                            <span className={line.itemId ? '' : 'text-text-muted'}>
                              {bulkAddStockLoadingItems ? 'Loading...' : getBulkAddStockItemLabel(line.itemId)}
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
                            onChange={(e) => updateBulkAddStockLine(idx, 'quantity', e.target.value)}
                            className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBulkAddStockLine(idx)}
                          disabled={bulkAddStockLines.length === 1}
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
                    onClick={addEmptyBulkStockRow}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-2 border border-border text-text-primary font-medium rounded-lg hover:bg-surface-2/80 transition-colors"
                  >
                    <Plus size={16} />
                    Add more
                  </button>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setBulkAddStockShowForm(false)}
                      className="flex-1 px-4 py-2.5 bg-surface-2 border border-border text-text-primary font-medium rounded-lg hover:bg-surface-2/80 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkSaveAllStock}
                      disabled={bulkAddStockSaving || getBulkValidLinesForSave().length === 0}
                      className="flex-1 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {bulkAddStockSaving ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        `Save all ${getBulkValidLinesForSave().length > 0 ? `(${getBulkValidLinesForSave().length})` : ''}`
                      )}
                    </button>
                  </div>
                </>
              )}
              {bulkAddStockShowForm && (
                <div className="pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={closeBulkAddStockModal}
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

      {/* Bulk Add Stock item dropdown - portaled outside modal */}
      {typeof document !== 'undefined' &&
        showBulkAddStockModal &&
        bulkAddStockDropdownOpenIndex !== null &&
        bulkAddStockDropdownRect &&
        !bulkAddStockLoadingItems &&
        createPortal(
          <div
            ref={bulkAddStockDropdownRef}
            className="fixed z-[100] rounded-lg bg-surface border border-border shadow-lg overflow-hidden"
            style={{
              top: bulkAddStockDropdownRect.top + 4,
              left: bulkAddStockDropdownRect.left,
              width: bulkAddStockDropdownRect.width,
            }}
          >
            <div className="p-2 border-b border-border bg-surface-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input
                  type="text"
                  placeholder="Search item..."
                  value={bulkAddStockItemSearch}
                  onChange={(e) => setBulkAddStockItemSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredBulkAddStockItems.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-text-muted">No items match</div>
              ) : (
                filteredBulkAddStockItems.map((m: any) => {
                  const stock = Number(m.current_stock ?? 0);
                  const stockStr = stock % 1 === 0 ? String(Math.round(stock)) : stock.toFixed(3).replace(/\.?0+$/, '');
                  const suffix = isAllOutlet && m.outlet_name ? ` (${m.outlet_name})` : '';
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        updateBulkAddStockLine(bulkAddStockDropdownOpenIndex, 'itemId', String(m.id));
                        setBulkAddStockItemSearch('');
                        setBulkAddStockDropdownOpenIndex(null);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-primary/10 focus:bg-primary/10 focus:outline-none border-b border-border last:border-b-0"
                    >
                      {m.name} — {stockStr}{suffix}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Add Stock Modal (single material from row) */}
      {showAddStockModal && addStockMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !addStockSaving && setShowAddStockModal(false)}>
          <div className="bg-surface border border-border rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-4">Add stock</h3>
            <p className="text-sm text-text-secondary mb-2">Material: <span className="font-medium text-text-primary">{addStockMaterial.name}</span></p>
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Quantity ({addStockMaterial.unit})</label>
              <input
                type="number"
                step="any"
                min="0.001"
                value={addStockQty}
                onChange={e => setAddStockQty(e.target.value)}
                placeholder="e.g. 100"
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => !addStockSaving && setShowAddStockModal(false)}
                className="px-4 py-2 bg-surface-2 text-text-primary rounded-lg border border-border hover:border-text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAddStock}
                disabled={addStockSaving || !addStockQty || parseFloat(addStockQty) <= 0}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
              >
                {addStockSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PackagePlus size={16} />}
                Add stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMaterialToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Material"
        message={`Are you sure you want to delete "${materialToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successTitle}
        message={successMessage}
      />
    </div>
  );
}
