"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Save, AlertCircle, Info, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { cn, formatQty, getTodayDateString } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOutlet } from '@/contexts/OutletContext';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ErrorModal } from '@/components/ui/ErrorModal';

type LineItem = { raw_material_id: string; quantity: string };

/** Row from GET /raw-materials (fields used in this form). */
type RawMaterialOption = {
  id: number;
  name: string;
  unit?: string;
  current_stock?: number | string;
};

type OutletOption = { id: number; name: string };

export default function OutwardEntryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedOutlet } = useOutlet();
  const [materials, setMaterials] = useState<RawMaterialOption[]>([]);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    outward_type: 'wastage' as string,
    reason: '',
    outlet_id: '',
    to_outlet_id: '',
    transaction_date: getTodayDateString(),
  });
  const [lines, setLines] = useState<LineItem[]>([{ raw_material_id: '', quantity: '' }]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Success');
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Error');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/users/settings/outlets').then((res) => setOutlets(res.data)).catch(console.error);
    }
  }, [user]);

  // Fetch only materials (exclude inventory / for_direct_sale items) for Product to Transfer
  useEffect(() => {
    const outletId = formData.outlet_id || selectedOutlet?.id;
    if (!outletId) {
      setMaterials([]);
      return;
    }
    api
      .get('/raw-materials', {
        params: { for_direct_sale: false, outlet_id: outletId, limit: 500 },
      })
      .then((res) => setMaterials(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMaterials([]));
  }, [formData.outlet_id, selectedOutlet?.id]);

  useEffect(() => {
    if (selectedOutlet && !formData.outlet_id && user?.role !== 'admin') {
      setFormData((prev) => ({ ...prev, outlet_id: String(selectedOutlet.id) }));
    }
  }, [selectedOutlet, user?.role]);

  const getMaterial = (id: string) =>
    materials.find((m) => m.id === parseInt(id, 10));
  const isTransfer = Boolean(
    formData.outlet_id &&
    formData.to_outlet_id &&
    formData.outlet_id !== formData.to_outlet_id
  );

  const addLine = () => setLines((prev) => [...prev, { raw_material_id: '', quantity: '' }]);
  const updateLine = (index: number, field: keyof LineItem, value: string) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };
  const removeLine = (index: number) => {
    if (lines.length === 1) {
      setLines([{ raw_material_id: '', quantity: '' }]);
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const validLines = lines.filter(
    (l) => l.raw_material_id && l.quantity && parseFloat(l.quantity) > 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validLines.length === 0) {
      setErrorTitle('Cannot proceed');
      setErrorMessage('Add at least one material with a valid quantity.');
      setShowErrorModal(true);
      return;
    }
    for (const line of validLines) {
      const mat = getMaterial(line.raw_material_id);
      const currentStock = mat ? parseFloat(String(mat.current_stock ?? 0)) : 0;
      const qty = parseFloat(line.quantity);
      if (currentStock <= 0) {
        setErrorTitle('Insufficient stock');
        setErrorMessage(
          `Stock is zero for "${mat?.name ?? 'selected material'}". You cannot transfer or adjust this material.`
        );
        setShowErrorModal(true);
        return;
      }
      if (qty > currentStock) {
        setErrorTitle('Insufficient stock');
        setErrorMessage(
          `Cannot transfer or adjust more than available stock for "${mat?.name ?? 'selected material'}". Available: ${currentStock} ${mat?.unit ?? ''}.`
        );
        setShowErrorModal(true);
        return;
      }
    }
    setLoading(true);
    try {
      const dateStr = getTodayDateString();
      if (isTransfer) {
        for (const line of validLines) {
          await api.post('/raw-materials/transfer', {
            source_outlet_id: parseInt(formData.outlet_id),
            dest_outlet_id: parseInt(formData.to_outlet_id),
            raw_material_id: parseInt(line.raw_material_id),
            quantity: parseFloat(line.quantity),
            transaction_date: dateStr,
          });
        }
        setSuccessTitle('Transfer Completed');
        setSuccessMessage(
          validLines.length === 1
            ? 'Stock transfer completed successfully.'
            : `${validLines.length} transfers completed successfully.`
        );
      } else {
        for (const line of validLines) {
          await api.post('/raw-materials/outward', {
            raw_material_id: parseInt(line.raw_material_id),
            quantity: parseFloat(line.quantity),
            outward_type: formData.outward_type,
            reason: formData.reason || undefined,
            outlet_id: formData.outlet_id ? parseInt(formData.outlet_id) : undefined,
            transaction_date: dateStr,
          });
        }
        setSuccessTitle('Adjustment Recorded');
        setSuccessMessage(
          validLines.length === 1
            ? 'Adjustment recorded successfully.'
            : `${validLines.length} adjustments recorded successfully.`
        );
      }
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.detail || 'Failed to record adjustment';
      setErrorTitle('Error');
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/raw-materials"
            className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Outward / Adjust</h1>
            <p className="text-text-secondary text-sm mt-1">Record damage, wastage or corrections.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-8 shadow-xl space-y-6 w-full">
        <div className="flex items-center gap-3 p-4 bg-info/5 rounded-xl border border-info/20 mb-4">
          <Info className="text-info shrink-0" size={20} />
          <p className="text-xs text-info/80 font-medium">
            {isTransfer
              ? `Stock will decrease at the source outlet and increase at the destination outlet. The destination must have a material with the same name.`
              : 'Select the material and quantity to deduct. This will permanently decrease the running stock balance.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Source Outlet (From)</label>
            {user?.role === 'admin' ? (
              <select
                required
                value={formData.outlet_id}
                onChange={(e) => setFormData({ ...formData, outlet_id: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
              >
                <option value="">Select Source</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-secondary">
                {selectedOutlet?.name || 'Your Authorized Outlet'}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Destination Outlet (To)</label>
            {user?.role === 'admin' ? (
              <select
                value={formData.to_outlet_id}
                onChange={(e) => setFormData({ ...formData, to_outlet_id: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
              >
                <option value="">Select Destination</option>
                {outlets
                  .filter((o) => o.id.toString() !== formData.outlet_id)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            ) : (
              <div className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-secondary">
                —
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {lines.map((line, idx) => {
            const mat = getMaterial(line.raw_material_id);
            const currentStock = mat ? parseFloat(mat.current_stock || 0) : null;
            return (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-6 items-end"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                    Product to Transfer
                  </label>
                  <select
                    value={line.raw_material_id}
                    onChange={(e) => updateLine(idx, 'raw_material_id', e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
                  >
                    <option value="">Select Material</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {formatQty(m.current_stock ?? 0, m.unit || '')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                    Quantity to Transfer {mat ? `(${mat.unit})` : ''}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
                  />
                  {mat && line.quantity && currentStock !== null && (
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest pl-1">
                      After:{' '}
                      <span
                        className={cn(
                          parseFloat(line.quantity) > currentStock ? 'text-danger' : 'text-success'
                        )}
                      >
                        {Math.max(0, currentStock - parseFloat(line.quantity)).toFixed(3)} {mat.unit}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="shrink-0 p-2.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors self-end"
                  aria-label="Remove row"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addLine}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-2 border border-border text-text-primary font-medium rounded-lg hover:bg-surface-2/80 transition-colors"
          >
            <Plus size={16} />
            Add more
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Notes</label>
          <textarea
            rows={3}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors resize-none"
            placeholder="Optional notes (e.g. spilled bag, expired batch...)"
          />
        </div>

        <div className="p-4 bg-warning/5 rounded-xl border border-warning/20 flex items-start gap-3">
          <AlertCircle className="text-warning shrink-0" size={20} />
          <p className="text-xs text-warning/80 leading-relaxed">
            {isTransfer ? (
              <><strong>Transfer:</strong> Stock will be reduced at the source outlet and added at the destination. Both actions are logged.</>
            ) : (
              <><strong>Caution:</strong> This action will permanently decrease the running stock balance for this material. Manual adjustments are logged and audited.</>
            )}
          </p>
        </div>

        <div className="pt-4 border-t border-border flex flex-col md:flex-row items-center justify-end gap-4">
          <div className="flex gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => router.push('/raw-materials')}
              className="flex-1 md:flex-none px-6 py-3 bg-surface-2 text-text-primary font-bold rounded-lg border border-border hover:border-text-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || validLines.length === 0}
              className="flex-1 md:flex-none px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary-muted hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {isTransfer
                ? validLines.length > 1
                  ? `Confirm Transfer (${validLines.length})`
                  : 'Confirm Transfer'
                : validLines.length > 1
                  ? `Confirm Adjustment (${validLines.length})`
                  : 'Confirm Adjustment'}
            </button>
          </div>
        </div>
      </form>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push('/raw-materials');
        }}
        title={successTitle}
        message={successMessage}
        autoClose={false}
      />

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorTitle}
        message={errorMessage}
      />
    </div>
  );
}
