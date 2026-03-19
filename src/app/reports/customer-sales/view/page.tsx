"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useOutlet } from "@/contexts/OutletContext";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, ShoppingBag } from "lucide-react";

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

export default function CustomerSalesViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedOutlet } = useOutlet();
  
  const customerName = searchParams.get("name") || "";
  const customerPhone = searchParams.get("phone") || "";
  const invoiceNumber = searchParams.get("invoice") || "";
  const fromDate = searchParams.get("from") || "";
  const toDate = searchParams.get("to") || "";
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ItemTransaction[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (selectedOutlet) {
      loadCustomerHistory();
    }
  }, [selectedOutlet]);

  const loadCustomerHistory = async () => {
    if (!selectedOutlet) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        outlet_id: String(selectedOutlet.id),
        customer_name: customerName,
        customer_phone: customerPhone,
        invoice_number: invoiceNumber,
        from_date: fromDate,
        to_date: toDate,
      });
      
      const response = await api.get(`/reports/customer-sales/history?${params}`);
      setTransactions(response.data.transactions || []);
      setTotalAmount(response.data.total_amount || 0);
    } catch (error) {
      console.error("Failed to load customer history:", error);
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
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {customerName || "Walk-in Customer"}
          </h1>
          <p className="text-sm text-text-secondary">
            {customerPhone !== "N/A" ? customerPhone : "No phone number"} • {formatDate(fromDate)} to {formatDate(toDate)}
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingBag size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Total Amount</p>
              <p className="text-3xl font-bold text-text-primary">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Total Items Purchased</p>
            <p className="text-2xl font-bold text-text-primary">{transactions.length}</p>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary">Transaction history</h2>
          <p className="text-xs text-text-secondary mt-0.5">All purchases by this customer in the selected period</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Invoice</th>
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
                  <td colSpan={7} className="px-6 py-8 text-center text-text-secondary">
                    Loading...
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((t, index) => (
                  <tr key={index} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(t.date)}</td>
                    <td className="px-6 py-4 text-sm font-mono text-text-primary">{t.invoice_number}</td>
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
                  <td colSpan={7} className="px-6 py-8 text-center text-text-secondary">
                    No transactions found for this customer in the selected period.
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
