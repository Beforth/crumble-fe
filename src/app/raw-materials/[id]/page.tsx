"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Archive, Box } from 'lucide-react';
import Link from 'next/link';
import { cn, formatQty, formatDate } from '@/lib/utils';
import DataTable from '@/components/tables/DataTable';

export default function RawMaterialLedgerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [ledger, setLedger] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLedger = async () => {
            try {
                const res = await api.get(`/raw-materials/${id}/ledger`);
                setLedger(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLedger();
    }, [id]);

    if (loading) {
        return <div className="p-8 text-center text-text-muted animate-pulse">Loading Ledger...</div>;
    }

    if (!ledger) {
        return <div className="p-8 text-center text-danger">Material not found.</div>;
    }

    const { material, transactions, opening_balance, closing_balance, total_inward, total_outward } = ledger;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/raw-materials" className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{material.name} - Ledger</h1>
                        <p className="text-text-secondary text-sm mt-1">Transaction history and stock balance.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Current Stock</p>
                    <h3 className="text-2xl font-bold text-primary font-mono">{formatQty(closing_balance, material.unit)}</h3>
                </div>
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Total Inward</p>
                    <div className="flex items-center gap-2">
                        <ArrowUpRight size={16} className="text-success" />
                        <h3 className="text-xl font-bold text-text-primary font-mono">{formatQty(total_inward, material.unit)}</h3>
                    </div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Total Outward</p>
                    <div className="flex items-center gap-2">
                        <ArrowDownRight size={16} className="text-danger" />
                        <h3 className="text-xl font-bold text-text-primary font-mono">{formatQty(total_outward, material.unit)}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden text-sm">
                <DataTable
                    columns={['Date', 'Type', 'Reason / Source', 'Qty In', 'Qty Out', 'Balance']}
                    data={transactions}
                    loading={loading}
                    renderRow={(tx) => {
                        const isInward = tx.type === 'inward';
                        const isOutward = tx.type === 'outward';

                        // Color coding for outward types
                        let typeColor = "bg-surface-2 text-text-secondary";
                        if (isInward) typeColor = "bg-success/10 text-success border border-success/20";
                        else if (tx.outward_type === 'production') typeColor = "bg-primary/10 text-primary border border-primary/20";
                        else if (tx.outward_type === 'direct_sale') typeColor = "bg-info/10 text-info border border-info/20";
                        else if (['damage', 'expiry', 'wastage'].includes(tx.outward_type)) typeColor = "bg-danger/10 text-danger border border-danger/20";
                        else if (tx.outward_type === 'correction') typeColor = "bg-warning/10 text-warning border border-warning/20";

                        return (
                            <>
                                <td className="px-6 py-4 text-text-secondary">{formatDate(tx.transaction_date)}</td>
                                <td className="px-6 py-4">
                                    <span className={cn("px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md", typeColor)}>
                                        {isInward ? 'Inward' : tx.outward_type?.replace('_', ' ') || 'Outward'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-text-primary block truncate max-w-[200px]">
                                        {isInward ? (tx.supplier || 'Stock Entry') : (tx.reason || (tx.outward_type === 'production' ? 'Used in Batch' : 'Direct Sale'))}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-success font-bold">
                                    {isInward ? `+${tx.quantity}` : '-'}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-danger font-bold">
                                    {isOutward ? `-${tx.quantity}` : '-'}
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-text-primary">
                                    {tx.running_balance}
                                </td>
                            </>
                        );
                    }}
                />
            </div>
        </div>
    );
}
