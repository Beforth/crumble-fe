"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import DataTable from '@/components/tables/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Download, ShoppingBag } from 'lucide-react';

export default function MySalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.outlets && user.outlets.length > 0 && !selectedOutlet) {
      setSelectedOutlet(user.outlets[0].id);
    }
  }, [user]);

  useEffect(() => {
    if (!selectedOutlet) return;

    setLoading(true);
    api.get(`/pos/sales/${selectedOutlet}/daily`)
      .then(res => setSales(res.data))
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [selectedOutlet]);

  const handleDownloadInvoice = async (saleId: number, invoiceNum: string) => {
    try {
      const response = await api.get(`/pos/sales/${saleId}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to download invoice", error);
      alert("Failed to download invoice.");
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">My Sales Today</h1>
          <p className="text-text-secondary text-sm mt-1">View the sales rung up at your outlet today.</p>
        </div>
        {user?.outlets && user.outlets.length > 1 && (
          <select
            value={selectedOutlet || ''}
            onChange={(e) => setSelectedOutlet(parseInt(e.target.value))}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            {user.outlets.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-1 border border-border rounded-xl bg-surface p-6 flex flex-col justify-center items-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag size={32} className="text-success" />
          </div>
          <p className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-1">Total Daily Revenue</p>
          <p className="text-3xl font-bold text-text-primary">
            {formatCurrency(sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0))}
          </p>
        </div>
      </div>

      <DataTable
        columns={['Invoice No.', 'Date', 'Payment Method', 'Discount', 'Total Amount', 'Status', 'Actions']}
        data={sales}
        loading={loading}
        renderRow={(sale) => (
          <>
            <td className="px-6 py-4">
              <span className="text-sm font-bold text-text-primary">{sale.invoice_number}</span>
            </td>
            <td className="px-6 py-4 text-sm text-text-secondary">
              {formatDate(sale.sale_date)}
            </td>
            <td className="px-6 py-4">
              <span className="px-2 py-1 bg-surface-2 border border-border text-text-primary text-[10px] font-bold uppercase tracking-widest rounded-lg">
                {sale.payment_method}
              </span>
            </td>
            <td className="px-6 py-4 text-sm font-mono text-text-secondary">
              {formatCurrency(sale.discount)}
            </td>
            <td className="px-6 py-4 text-sm font-mono text-text-primary font-bold">
              {formatCurrency(sale.total_amount)}
            </td>
            <td className="px-6 py-4">
              <span className="px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest bg-success/10 text-success">
                {sale.status || 'Completed'}
              </span>
            </td>
            <td className="px-6 py-4">
              <button
                onClick={() => handleDownloadInvoice(sale.id, sale.invoice_number)}
                className="flex items-center gap-1 px-3 py-1.5 bg-surface border border-border text-text-primary text-xs font-bold rounded-lg hover:bg-surface-2 transition-colors"
              >
                <Download size={14} /> Receipt
              </button>
            </td>
          </>
        )}
      />
    </div>
  );
}
