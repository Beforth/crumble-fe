"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getTodayDateString } from '@/lib/utils';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function InwardEntryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    raw_material_id: '',
    quantity: '',
    rate: '',
    supplier: '',
    invoice_number: '',
    outlet_id: '',
    transaction_date: getTodayDateString(),
    notes: ''
  });

  useEffect(() => {
    api.get('/raw-materials').then(res => setMaterials(res.data)).catch(console.error);
    if (user?.role === 'admin') {
      api.get('/users/settings/outlets').then(res => setOutlets(res.data)).catch(console.error);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/raw-materials/inward', {
        ...formData,
        raw_material_id: parseInt(formData.raw_material_id),
        outlet_id: formData.outlet_id ? parseInt(formData.outlet_id) : undefined,
        quantity: parseFloat(formData.quantity),
        rate: parseFloat(formData.rate),
        total_amount: parseFloat(formData.quantity) * parseFloat(formData.rate)
      });
      router.push('/raw-materials');
    } catch (err) {
      console.error(err);
      alert('Failed to record inward entry');
    } finally {
      setLoading(false);
    }
  };

  const selectedMaterial: any = materials.find((m: any) => m.id === parseInt(formData.raw_material_id));

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/raw-materials" className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Record Inward</h1>
            <p className="text-text-secondary text-sm mt-1">Add new stock to your inventory.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-8 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Transaction Date</label>
            <input 
              type="date" 
              required
              value={formData.transaction_date}
              onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          {user?.role === 'admin' ? (
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Destination Outlet</label>
            <select 
              required
              value={formData.outlet_id}
              onChange={(e) => setFormData({...formData, outlet_id: e.target.value})}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
            >
              <option value="">Select Outlet</option>
              {outlets.map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Destination Outlet</label>
              <div className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-secondary">
                 Your Authorized Outlet
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Raw Material</label>
            <select 
              required
              value={formData.raw_material_id}
              onChange={(e) => setFormData({...formData, raw_material_id: e.target.value})}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
            >
              <option value="">Select Material</option>
              {materials.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Quantity {selectedMaterial && `(${selectedMaterial.unit})`}
            </label>
            <input 
              type="number" 
              step="0.001"
              required
              placeholder="0.000"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Rate per Unit (₹)</label>
            <input 
              type="number" 
              step="0.01"
              required
              placeholder="0.00"
              value={formData.rate}
              onChange={(e) => setFormData({...formData, rate: e.target.value})}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Supplier Name</label>
            <input 
              type="text" 
              placeholder="e.g. ABC Milling Co."
              value={formData.supplier}
              onChange={(e) => setFormData({...formData, supplier: e.target.value})}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Invoice / Ref Number</label>
            <input 
              type="text" 
              placeholder="e.g. INV-123456"
              value={formData.invoice_number}
              onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
           <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Notes (Optional)</label>
           <textarea 
             rows={3}
             value={formData.notes}
             onChange={(e) => setFormData({...formData, notes: e.target.value})}
             className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:outline-none transition-colors resize-none"
             placeholder="Additional details..."
           ></textarea>
        </div>

        <div className="pt-4 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="text-sm font-medium text-text-secondary">
             Total Amount: <span className="text-primary font-bold text-lg">₹{(parseFloat(formData.quantity || '0') * parseFloat(formData.rate || '0')).toLocaleString('en-IN')}</span>
           </div>
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
                disabled={loading}
                className="flex-1 md:flex-none px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary-muted hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
                Confirm Entry
              </button>
           </div>
        </div>
      </form>
    </div>
  );
}
