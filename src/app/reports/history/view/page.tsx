"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, FileText } from "lucide-react";

interface ItemTransaction {
  date: string;
  invoice_number: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  payment_method: string;
  type: string;
}

export default function HistoryViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const invoiceNumber = searchParams.get("invoice") || "";
  const outletId = searchParams.get("outlet_id") || "";
  const fromDate = searchParams.get("from") || "";
  const toDate = searchParams.get("to") || "";

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ItemTransaction[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (outletId && invoiceNumber) {
      loadInvoiceDetails();
    } else {
      setLoading(false);
    }
  }, [outletId, invoiceNumber]);

  const loadInvoiceDetails = async () => {
    if (!outletId || !invoiceNumber) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        outlet_id: outletId,
        customer_name: "",
        customer_phone: "",
        invoice_number: invoiceNumber,
        from_date: fromDate || new Date().toISOString().slice(0, 10),
        to_date: toDate || new Date().toISOString().slice(0, 10),
      });

      const response = await api.get(`/reports/customer-sales/history?${params}`);
      setTransactions(response.data.transactions || []);
      setTotalAmount(response.data.total_amount || 0);
    } catch (error) {
      console.error("Failed to load invoice details:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-surface-2 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Invoice {invoiceNumber}
          </h1>
          <p className="text-sm text-text-secondary">
            {fromDate && toDate
              ? `${formatDate(fromDate)} — ${formatDate(toDate)}`
              : "Sale details"}
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Total Amount</p>
              <p className="text-3xl font-bold text-text-primary">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Line Items</p>
            <p className="text-2xl font-bold text-text-primary">{transactions.length}</p>
          </div>
        </div>
      </div>

      {/* Item details */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary">Items</h2>
          <p className="text-xs text-text-secondary mt-0.5">Line items for this sale</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Unit Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                    Loading...
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((t, index) => (
                  <tr key={index} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(t.date)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-text-primary">
                      {t.item_name}
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-surface-2 text-text-muted">
                        {t.type === "raw_materials" ? "Raw materials" : "Finished goods"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium text-text-primary">{t.quantity}</td>
                    <td className="px-6 py-4 text-sm font-mono text-right text-text-secondary">{formatCurrency(t.unit_price)}</td>
                    <td className="px-6 py-4 text-sm font-mono text-right font-bold text-success">{formatCurrency(t.total)}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary capitalize">{t.payment_method}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                    No items found for this invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
