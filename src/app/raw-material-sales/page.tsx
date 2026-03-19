"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import DataTable from '@/components/tables/DataTable';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Search, Filter, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function RawMaterialSalesPage() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const res = await api.get('/raw-material-sales');
                setSales(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSales();
    }, []);

    const filtered = sales.filter((s: any) =>
        s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">Raw Material Sales</h1>
                    <p className="text-text-secondary text-sm mt-1">View direct sales of ingredients and raw materials.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Search invoice or customer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-border text-text-secondary text-sm font-medium rounded-lg hover:text-text-primary transition-colors">
                        <Filter size={16} />
                        Filter
                    </button>
                </div>
            </div>

            <DataTable
                columns={['Invoice #', 'Date', 'Customer', 'Items', 'Total', 'Payment', 'Actions']}
                data={filtered}
                loading={loading}
                renderRow={(s) => (
                    <>
                        <td className="px-6 py-4">
                            <span className="text-sm font-mono font-bold text-primary">{s.invoice_number}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(s.sale_date)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-text-primary">
                            {s.customer_name || 'Walk-in Customer'}
                            {s.customer_contact && <span className="block text-xs font-normal text-text-muted">{s.customer_contact}</span>}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={14} className="text-text-muted" />
                                <span className="text-sm font-mono text-text-primary">{s.items?.length || 0} items</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono font-bold text-text-primary">{formatCurrency(s.total_amount)}</td>
                        <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-surface-2 text-[10px] font-bold rounded-full uppercase tracking-widest border border-border">
                                {s.payment_method}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <button className="text-[10px] font-bold text-text-muted hover:text-text-primary uppercase tracking-widest transition-colors">View Details</button>
                        </td>
                    </>
                )}
            />
        </div>
    );
}
