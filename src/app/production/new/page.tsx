"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Save, CheckCircle2, XCircle, Info, Calculator, CakeSlice } from 'lucide-react';
import Link from 'next/link';
import { cn, formatQty } from '@/lib/utils';

export default function NewProductionBatchPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    product_id: '',
    quantity_produced: '1',
    deduction_mode: 'auto',
    production_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (formData.product_id && formData.quantity_produced) {
      const fetchPreview = async () => {
        setPreviewLoading(true);
        try {
          const res = await api.get(`/production/preview`, {
            params: {
              product_id: formData.product_id,
              quantity: formData.quantity_produced
            }
          });
          setPreview(res.data);
          setPreviewError(null);
        } catch (err: any) {
          setPreview(null);
          setPreviewError(err.response?.data?.detail || 'Error calculating BOM. Please check recipe.');
        } finally {
          setPreviewLoading(false);
        }
      };

      const timer = setTimeout(fetchPreview, 500);
      return () => clearTimeout(timer);
    } else {
      setPreview(null);
    }
  }, [formData.product_id, formData.quantity_produced]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview?.all_sufficient) return;

    setLoading(true);
    try {
      await api.post('/production/batches', {
        ...formData,
        product_id: parseInt(formData.product_id),
        quantity_produced: parseFloat(formData.quantity_produced)
      });
      router.push('/production');
    } catch (err) {
      console.error(err);
      alert('Failed to record production batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/production" className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">New Production Batch</h1>
            <p className="text-text-secondary text-sm mt-1">Convert raw materials into finished goods.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-8 shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Info size={16} className="text-primary" />
              Batch Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Production Date</label>
                <input
                  type="date"
                  required
                  value={formData.production_date}
                  onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Finished Product</label>
                <select
                  required
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
                >
                  <option value="">Select Product</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Batch Quantity (Planned)</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="0"
                  value={formData.quantity_produced}
                  onChange={(e) => setFormData({ ...formData, quantity_produced: e.target.value })}
                  className="w-full bg-surface-2 border border-border rounded-lg pl-4 pr-16 py-3 text-text-primary font-bold text-lg focus:border-primary focus:outline-none transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted font-bold text-xs uppercase">Pieces</span>
              </div>
            </div>

            <div className="space-y-3 p-4 border border-border rounded-xl bg-surface-2/50 mt-6">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <CakeSlice size={14} className="text-primary" />
                Ingredient Deduction Mode
              </label>
              <div className="flex gap-4">
                <label className={cn(
                  "flex-1 flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all",
                  formData.deduction_mode === 'auto' ? "border-primary bg-primary/5 text-primary" : "border-border bg-surface text-text-secondary hover:border-primary/50"
                )}>
                  <input
                    type="radio"
                    name="deduction_mode"
                    value="auto"
                    checked={formData.deduction_mode === 'auto'}
                    onChange={(e) => setFormData({ ...formData, deduction_mode: e.target.value })}
                    className="sr-only"
                  />
                  <span className="font-bold mb-1">Auto Deduct</span>
                  <span className="text-[10px] text-center opacity-80 leading-tight">Ingredients consumed immediately on save</span>
                </label>

                <label className={cn(
                  "flex-1 flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all",
                  formData.deduction_mode === 'manual' ? "border-primary bg-primary/5 text-primary" : "border-border bg-surface text-text-secondary hover:border-primary/50"
                )}>
                  <input
                    type="radio"
                    name="deduction_mode"
                    value="manual"
                    checked={formData.deduction_mode === 'manual'}
                    onChange={(e) => setFormData({ ...formData, deduction_mode: e.target.value })}
                    className="sr-only"
                  />
                  <span className="font-bold mb-1">Manual Deduct</span>
                  <span className="text-[10px] text-center opacity-80 leading-tight">Batch created, ingredients deducted later</span>
                </label>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Production Notes</label>
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors resize-none"
                placeholder="Shift details, specific instructions, etc..."
              ></textarea>
            </div>

            <div className="pt-6 border-t border-border flex items-center justify-end gap-4">
              <button
                type="submit"
                disabled={loading || (formData.deduction_mode === 'auto' && !preview?.all_sufficient) || previewLoading}
                className="w-full md:w-auto px-10 py-4 bg-primary text-white font-bold rounded-lg shadow-xl shadow-primary-muted hover:bg-primary-hover disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle2 size={20} />}
                Confirm & Commit Batch
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm sticky top-8">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2 mb-6">
              <Calculator size={16} className="text-primary" />
              BOM Consumption Preview
            </h3>

            {!formData.product_id ? (
              <div className="py-12 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-surface-2 rounded-full flex items-center justify-center text-text-muted mb-4 opacity-50">
                  <CakeSlice size={24} />
                </div>
                <p className="text-text-muted text-xs italic">Select a product and quantity to see required raw materials.</p>
              </div>
            ) : previewLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-surface-2 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : previewError ? (
              <p className="text-danger text-xs text-center p-8 bg-danger/5 rounded-lg border border-danger/20">{previewError}</p>
            ) : preview ? (
              <div className="space-y-4">
                {preview.items.map((item: any, i: number) => (
                  <div key={i} className={cn(
                    "p-3 rounded-lg border transition-all",
                    item.sufficient ? "bg-success/5 border-success/20" : "bg-danger/5 border-danger/30"
                  )}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-text-primary">{item.material_name}</span>
                      {item.sufficient ? <CheckCircle2 size={16} className="text-success" /> : <XCircle size={16} className="text-danger" />}
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Required / Avail</span>
                      <span className="text-xs font-mono font-bold text-text-primary">
                        {formatQty(item.required_qty, item.unit)} /
                        <span className={item.sufficient ? "text-text-primary" : "text-danger"}> {formatQty(item.available_qty, item.unit)}</span>
                      </span>
                    </div>
                  </div>
                ))}

                <div className={cn(
                  "mt-6 p-4 rounded-xl border flex items-center gap-3",
                  preview.all_sufficient ? "bg-success/10 border-success/30 text-success" : "bg-danger/10 border-danger/30 text-danger"
                )}>
                  {preview.all_sufficient ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  <div>
                    <p className="text-sm font-bold">{preview.all_sufficient ? 'All Materials Sufficient' : 'Insufficient Inventory'}</p>
                    <p className="text-[10px] opacity-80 font-medium">
                      {preview.all_sufficient
                        ? 'Batch can be produced successfully.'
                        : 'One or more ingredients exceed current stock levels.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
