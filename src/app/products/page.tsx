"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import DataTable from '@/components/tables/DataTable';

import { useAuth } from '@/hooks/useAuth';
import { formatQty } from '@/lib/utils';

export default function ProductsPage() {
  const { user } = useAuth();
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get('/users/settings/outlets')
      .then(res => {
        setOutlets(res.data);
        if (res.data.length > 0) {
          setSelectedOutlet(res.data[0].id.toString());
        }
      })
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!selectedOutlet) return;
    setLoading(true);
    api.get(`/products?outlet_id=${selectedOutlet}`)
      .then(res => setProducts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedOutlet]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Products & Inventory</h1>
          <p className="text-text-secondary text-sm mt-1">Manage finished goods and view stock levels.</p>
        </div>
        {outlets.length > 0 && (
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            {outlets.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
      </div>
      <DataTable
        columns={['Name', 'Category', 'Selling Price', 'Inventory (Stock)']}
        data={products}
        loading={loading}
        renderRow={(p) => (
          <>
            <td className="px-6 py-4 font-bold">{p.name}</td>
            <td className="px-6 py-4 text-text-secondary">{p.category || '-'}</td>
            <td className="px-6 py-4 text-text-primary">₹{p.selling_price}</td>
            <td className="px-6 py-4">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${(p.stock_quantity ?? 0) > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}>
                {formatQty(p.stock_quantity ?? 0, p.unit || 'Pcs')}
              </span>
            </td>
          </>
        )}
      />
    </div>
  );
}
