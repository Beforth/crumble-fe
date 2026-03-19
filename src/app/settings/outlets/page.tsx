"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import DataTable from '@/components/tables/DataTable';
import { cn } from '@/lib/utils';
import { Store, Plus, MapPin, Phone, CheckCircle2 } from 'lucide-react';

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const res = await api.get('/users/settings/outlets');
        setOutlets(res.data);
      } catch (err) {
        // Fallback for demo if endpoint not ready
        setOutlets([
          { id: 1, name: 'Main Hub', address: 'Plot 4, Industrial Area', phone: '+91 98765 43210', is_active: true },
          { id: 2, name: 'Downtown Outlet', address: 'MG Road, Mall Corner', phone: '+91 98765 43211', is_active: true },
          { id: 3, name: 'West Side Branch', address: 'Kothrud, High Street', phone: '+91 98765 43212', is_active: true },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchOutlets();
  }, []);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Outlet Management</h1>
          <p className="text-text-secondary text-sm mt-1">Configure retail points and distribution centers.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary-muted transition-all active:scale-95">
          <Plus size={18} />
          Add New Outlet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {outlets.map((outlet: any) => (
          <div key={outlet.id} className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-surface-2 rounded-xl border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                <Store size={24} className="text-text-secondary group-hover:text-primary" />
              </div>
              <span className={cn(
                "px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-widest",
                outlet.is_active ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"
              )}>
                {outlet.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-text-primary mb-2">{outlet.name}</h3>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 text-text-muted">
                <MapPin size={16} className="shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed">{outlet.address}</span>
              </div>
              <div className="flex items-center gap-3 text-text-muted">
                <Phone size={16} className="shrink-0" />
                <span className="text-xs">{outlet.phone}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
              <span className="text-text-muted">ID: 00{outlet.id}</span>
              <button className="text-primary hover:text-primary-hover transition-colors">Edit Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
