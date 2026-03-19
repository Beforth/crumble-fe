"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Save, Truck, Info, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn, formatQty } from '@/lib/utils';

export default function NewTransferPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    from_outlet_id: '',
    to_outlet_id: '',
    quantity: '',
    transfer_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/users/settings/outlets')
    ]).then(([prodRes, outRes]) => {
      setProducts(prodRes.data);
      const allOutlets = outRes.data;
      setOutlets(allOutlets);

      // Try to find "Main Hub" or similar to default from_outlet_id
      const mainHub = allOutlets.find((o: any) => o.name.toLowerCase().includes('main hub'));
      if (mainHub) {
        setFormData(prev => ({ ...prev, from_outlet_id: mainHub.id.toString() }));
      } else if (allOutlets.length > 0) {
        setFormData(prev => ({ ...prev, from_outlet_id: allOutlets[0].id.toString() }));
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (formData.product_id && formData.from_outlet_id) {
      // Fetch stock for selected product and source outlet
      api.get(`/pos/stock/${formData.from_outlet_id}/${formData.product_id}`)
        .then(res => setCurrentStock(res.data.quantity))
        .catch(() => setCurrentStock(0));
    } else {
      setCurrentStock(null);
    }
  }, [formData.product_id, formData.from_outlet_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/transfers', {
        ...formData,
        product_id: parseInt(formData.product_id),
        from_outlet_id: parseInt(formData.from_outlet_id),
        to_outlet_id: parseInt(formData.to_outlet_id),
        quantity: parseFloat(formData.quantity)
      });
      router.push('/transfers');
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : (detail?.message || JSON.stringify(detail) || 'Failed to record transfer'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/transfers" className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Stock Transfer</h1>
            <p className="text-text-secondary text-sm mt-1">Move finished products between outlets.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3 p-4 bg-info/5 rounded-xl border border-info/20 mb-4">
          <Info className="text-info shrink-0" size={20} />
          <p className="text-xs text-info/80 font-medium">Select a source outlet to dispatch stock from, and a destination outlet to receive it.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Source Outlet (From)</label>
            <select
              required
              value={formData.from_outlet_id}
              onChange={(e) => setFormData({ ...formData, from_outlet_id: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
            >
              <option value="">Select Source</option>
              {outlets.map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Destination Outlet (To)</label>
            <select
              required
              value={formData.to_outlet_id}
              onChange={(e) => setFormData({ ...formData, to_outlet_id: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
            >
              <option value="">Select Destination</option>
              {outlets.filter((o: any) => o.id.toString() !== formData.from_outlet_id).map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Product to Transfer</label>
              {currentStock !== null && (
                <span className={cn("text-[10px] px-2 py-1 rounded-full font-bold", currentStock > 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                  Available: {formatQty(currentStock, 'Pcs')}
                </span>
              )}
            </div>
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
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Quantity to Transfer</label>
            <input
              type="number"
              step="1"
              required
              placeholder="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Transfer Date</label>
          <input
            type="date"
            required
            value={formData.transfer_date}
            onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
            className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Transfer Notes</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors resize-none"
            placeholder="Vehicle number, driver name, etc..."
          ></textarea>
        </div>

        <div className="pt-4 border-t border-border flex flex-col md:flex-row items-center justify-end gap-4">
          <div className="flex gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => router.push('/transfers')}
              className="flex-1 md:flex-none px-6 py-3 bg-surface-2 text-text-primary font-bold rounded-lg border border-border hover:border-text-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 md:flex-none px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary-muted hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Truck size={18} />}
              Dispatch Transfer
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
