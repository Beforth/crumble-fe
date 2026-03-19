"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOutlet } from '@/contexts/OutletContext';
import api from '@/lib/api';
import { Plus, X } from 'lucide-react';

interface Table {
  id: number;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  outlet_id: number;
}

const isAllOutlet = (o: { id?: number; outlet_type?: string } | null) => o != null && (o.id === 0 || o.outlet_type === 'all');

export default function TableOrderingPage() {
  const router = useRouter();
  const { selectedOutlet, outlets } = useOutlet();
  // When "All" is selected, show only Main Bakery tables (same as POS)
  const tableOrderingOutlet = (() => {
    if (isAllOutlet(selectedOutlet)) {
      return outlets.find((o) => o.name === 'Main Bakery') ?? outlets[0] ?? selectedOutlet;
    }
    return selectedOutlet;
  })();

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);

  useEffect(() => {
    if (tableOrderingOutlet) {
      fetchTables();
    }
  }, [tableOrderingOutlet?.id]);

  const fetchTables = async () => {
    if (!tableOrderingOutlet) return;
    
    try {
      setLoading(true);
      const res = await api.get('/tables', {
        params: { outlet_id: tableOrderingOutlet.id }
      });
      setTables(res.data);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    if (!tableOrderingOutlet) return;

    // Find the highest table number
    const tableNumbers = tables
      .map(t => {
        const match = t.name.match(/Table (\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);
    
    const nextNumber = tableNumbers.length > 0 ? Math.max(...tableNumbers) + 1 : 1;

    try {
      await api.post('/tables', {
        name: `Table ${nextNumber}`,
        capacity: 4,
        status: 'available',
        outlet_id: tableOrderingOutlet.id
      });
      
      fetchTables();
    } catch (err) {
      console.error('Failed to add table:', err);
    }
  };

  const handleDeleteTable = async () => {
    if (!tableToDelete) return;

    try {
      await api.delete(`/tables/${tableToDelete.id}`);
      setShowDeleteModal(false);
      setTableToDelete(null);
      fetchTables();
    } catch (err) {
      console.error('Failed to delete table:', err);
    }
  };

  const handleStatusChange = async (tableId: number, newStatus: string) => {
    try {
      await api.put(`/tables/${tableId}`, { status: newStatus });
      fetchTables();
    } catch (err) {
      console.error('Failed to update table status:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-success/10 text-success border-success/20';
      case 'occupied':
        return 'bg-danger/10 text-danger border-danger/20';
      case 'reserved':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-surface-2 text-text-secondary border-border';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Table Ordering{tableOrderingOutlet?.name ? ` - ${tableOrderingOutlet.name}` : ''}
          </h1>
          <p className="text-text-secondary text-sm">Manage table availability and reservations</p>
        </div>
        
        <button
          onClick={handleAddTable}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium shadow-lg"
        >
          <Plus size={20} />
          Add Table
        </button>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
            <div key={i} className="aspect-square bg-surface border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-text-secondary mb-4">No tables found</p>
          <button
            onClick={handleAddTable}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Add Your First Table
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              onClick={() => router.push(`/table-ordering/${table.id}`)}
              className={`relative aspect-square border-2 rounded-lg p-4 flex flex-col items-center justify-center transition-all hover:shadow-lg cursor-pointer ${getStatusColor(table.status)}`}
            >
              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTableToDelete(table);
                  setShowDeleteModal(true);
                }}
                className="absolute top-2 right-2 p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
              >
                <X size={16} />
              </button>

              {/* Table Icon */}
              <div className="mb-3">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="8" width="18" height="12" rx="2" strokeWidth="2" />
                  <path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2" strokeWidth="2" />
                </svg>
              </div>

              {/* Table Info */}
              <h3 className="text-lg font-bold mb-1">{table.name}</h3>
              <p className="text-xs opacity-75 mb-3">Capacity: {table.capacity}</p>

              {/* Status Badge */}
              <div className="text-xs font-bold uppercase tracking-wider mb-3">
                {table.status}
              </div>

              {/* Status Change Buttons */}
              <div className="flex gap-1 flex-wrap justify-center">
                {table.status !== 'reserved' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(table.id, 'reserved');
                    }}
                    className="px-2 py-1 text-[10px] font-medium bg-warning text-white rounded hover:bg-warning/90 transition-colors"
                  >
                    Reserve
                  </button>
                )}
                {table.status === 'reserved' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(table.id, 'available');
                    }}
                    className="px-2 py-1 text-[10px] font-medium bg-success text-white rounded hover:bg-success/90 transition-colors"
                  >
                    Unreserve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && tableToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-danger/10 text-danger">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-danger">Delete Table</h2>
              <p className="text-text-primary font-medium">
                Are you sure you want to delete {tableToDelete.name}?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTableToDelete(null);
                }}
                className="flex-1 py-3 rounded-lg font-medium transition-all bg-surface-2 border border-border text-text-primary hover:border-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTable}
                className="flex-1 py-3 rounded-lg font-medium transition-all bg-danger text-white hover:bg-danger/90 shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
