"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import DataTable from '@/components/tables/DataTable';
import { formatDate, formatQty, cn } from '@/lib/utils';
import { Plus, ArrowRight, Truck } from 'lucide-react';
import Link from 'next/link';

export default function TransferHistoryPage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        const res = await api.get('/transfers');
        setTransfers(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransfers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Transfer History</h1>
          <p className="text-text-secondary text-sm mt-1">Track finished goods movement between hub and outlets.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/transfers/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary-muted transition-colors">
            <Plus size={18} />
            New Transfer
          </Link>
        </div>
      </div>

      <DataTable
        columns={['Ref Number', 'Product', 'To Outlet', 'Quantity', 'Date', 'Status']}
        data={transfers}
        loading={loading}
        renderRow={(t) => (
          <>
            <td className="px-6 py-4">
              <span className="text-sm font-mono font-bold text-primary">{t.transfer_ref}</span>
            </td>
            <td className="px-6 py-4">
              <span className="text-sm font-bold text-text-primary">{t.product?.name || `Product ID: ${t.product_id}`}</span>
            </td>
            <td className="px-6 py-4">
              <span className="text-sm text-text-secondary font-medium">{t.to_outlet?.name || `Outlet ID: ${t.to_outlet_id}`}</span>
            </td>
            <td className="px-6 py-4 text-sm font-mono text-text-primary">{formatQty(t.quantity, 'pieces')}</td>
            <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(t.transfer_date)}</td>
            <td className="px-6 py-4">
              <span className="px-2 py-1 bg-info/10 text-info text-[10px] font-bold rounded-full uppercase tracking-widest">
                Dispatched
              </span>
            </td>
          </>
        )}
      />
    </div>
  );
}
