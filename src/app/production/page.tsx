"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import DataTable from '@/components/tables/DataTable';
import { formatDate, formatQty, cn } from '@/lib/utils';
import { Plus, Search, Calendar, CakeSlice, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';

export default function ProductionHistoryPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deductConfirm, setDeductConfirm] = useState(false);
  const [pendingDeductId, setPendingDeductId] = useState<number | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await api.get('/production/batches');
        setBatches(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  const handleDeduct = async (id: number) => {
    setPendingDeductId(id);
    setDeductConfirm(true);
  };

  const executeDeduction = async () => {
    if (!pendingDeductId) return;
    setDeductConfirm(false);
    try {
      await api.post(`/production/batches/${pendingDeductId}/deduct-ingredients`);
      setSaveResult({ success: true, message: 'Ingredients successfully deducted.' });
      // Refresh list
      const res = await api.get('/production/batches');
      setBatches(res.data);
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      const errorMessage = typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : (errorDetail || 'Failed to deduct ingredients');
      setSaveResult({ success: false, message: errorMessage });
    } finally {
      setPendingDeductId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Production History</h1>
          <p className="text-text-secondary text-sm mt-1">View and manage all finished goods production batches.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/production/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary-muted transition-colors">
            <Plus size={18} />
            New Batch
          </Link>
        </div>
      </div>

      <DataTable
        columns={['Batch Code', 'Product', 'Quantity', 'Date', 'Type', 'Status', 'Actions']}
        data={batches}
        loading={loading}
        renderRow={(b: any) => (
          <>
            <td className="px-6 py-4">
              <span className="text-sm font-mono font-bold text-primary">{b.batch_code}</span>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-surface-2 rounded-lg border border-border">
                  <CakeSlice size={16} className="text-text-secondary" />
                </div>
                <span className="text-sm font-bold text-text-primary">{b.product?.name || `Product ID: ${b.product_id}`}</span>
              </div>
            </td>
            <td className="px-6 py-4 text-sm font-mono text-text-primary">{formatQty(b.quantity_produced, 'pieces')}</td>
            <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(b.production_date)}</td>
            <td className="px-6 py-4">
              <span className={cn(
                "px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest",
                b.deduction_mode === 'auto' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}>
                {b.deduction_mode === 'auto' ? 'Auto' : 'Manual'}
              </span>
            </td>
            <td className="px-6 py-4">
              <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded-full uppercase tracking-widest">
                Completed
              </span>
            </td>
            <td className="px-6 py-4 flex flex-col gap-2">
              {b.deduction_mode === 'manual' && (
                <button onClick={() => handleDeduct(b.id)} className="text-[10px] font-bold text-primary hover:text-primary-hover uppercase tracking-widest transition-colors text-left">Deduct Now</button>
              )}
              <button className="text-[10px] font-bold text-text-muted hover:text-text-primary uppercase tracking-widest transition-colors text-left">Details</button>
            </td>
          </>
        )}
      />

      {/* Confirmation Modal */}
      {deductConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Info size={40} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-text-primary">Confirm Deduction</h2>
              <p className="text-text-secondary text-sm">Are you sure you want to deduct materials for this batch now?</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setDeductConfirm(false);
                  setPendingDeductId(null);
                }}
                className="flex-1 py-3 bg-surface-2 text-text-primary font-bold rounded-xl border border-border hover:bg-surface-3 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDeduction}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary-muted hover:bg-primary-hover transition-colors"
              >
                Yes, Deduct
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {saveResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8 text-center space-y-6">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
              saveResult.success ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            )}>
              {saveResult.success ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
            </div>

            <div className="space-y-2">
              <h2 className={cn("text-2xl font-bold", saveResult.success ? "text-success" : "text-danger")}>
                {saveResult.success ? "Success!" : "Failed"}
              </h2>
              <p className="text-text-primary font-medium">{saveResult.message}</p>
            </div>

            <button
              onClick={() => setSaveResult(null)}
              className={cn(
                "w-full py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98]",
                saveResult.success
                  ? "bg-success text-white hover:bg-success/90 shadow-success/20"
                  : "bg-danger text-white hover:bg-danger/90 shadow-danger/20"
              )}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
