"use client";

import { useState, useEffect } from "react";
import { useOutlet } from "@/contexts/OutletContext";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Users, ShoppingCart, TrendingUp, User, Trash2, Eye } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { ErrorModal } from "@/components/ui/ErrorModal";
import { Pagination } from "@/components/ui/Pagination";

// Helper function to get local date in YYYY-MM-DD format
const getLocalDateString = (date?: Date) => {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface TransactionRow {
  customer_name: string;
  phone: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  payment_method: string;
  type: string;
  item_count?: number;
  outlet_id?: number;
  outlet_name?: string;
}


export default function CustomerSalesPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const [fromDate, setFromDate] = useState(getLocalDateString());
  const [toDate, setToDate] = useState(getLocalDateString());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalSales: 0,
    avgPerCustomer: 0,
    topCustomer: ""
  });
  const [reportOutletId, setReportOutletId] = useState<number | null>(null);
  const ITEMS_PER_PAGE = 10;
  const [custPage, setCustPage] = useState(1);
  const [custSortBy, setCustSortBy] = useState<"customer_name" | "sale_date" | "total_amount">("sale_date");
  const [custSortOrder, setCustSortOrder] = useState<"asc" | "desc">("desc");

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TransactionRow | null>(null);

  const isGlobalAll = selectedOutlet && (selectedOutlet.id === 0 || (selectedOutlet as any).outlet_type === "all");
  const showAllInDropdown = !isGlobalAll && outlets.length > 0;
  const isReportAll = reportOutletId === 0;

  useEffect(() => {
    if (!selectedOutlet) return;
    if (isGlobalAll) {
      if (outlets.length > 0) setReportOutletId(outlets[0].id);
    } else {
      setReportOutletId(selectedOutlet.id);
    }
  }, [selectedOutlet?.id, isGlobalAll, outlets.length]);

  useEffect(() => {
    if (reportOutletId != null) {
      loadCustomerSales();
    }
  }, [reportOutletId, fromDate, toDate]);

  const loadCustomerSales = async () => {
    if (reportOutletId == null) return;
    
    setLoading(true);
    try {
      const outletIdParam = String(reportOutletId);
      const params = new URLSearchParams({
        outlet_id: outletIdParam,
        from_date: fromDate,
        to_date: toDate,
      });
      
      const response = await api.get(`/reports/customer-sales?${params}`);
      setTransactions(response.data.transactions || []);
      setSummary(response.data.summary || {
        totalCustomers: 0,
        totalSales: 0,
        avgPerCustomer: 0,
        topCustomer: ""
      });
    } catch (error) {
      console.error("Failed to load customer sales:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (transaction: TransactionRow) => {
    setDeleteTarget(transaction);
    setShowConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      const endpoint = deleteTarget.type === "finished_goods" 
        ? `/pos/sales/${deleteTarget.invoice_number}`
        : `/raw-material-sales/${deleteTarget.invoice_number}`;
      
      await api.delete(endpoint);
      setShowSuccessModal(true);
      loadCustomerSales(); // Reload data
    } catch (error: any) {
      setErrorMessage(error.response?.data?.detail || "Failed to delete sale");
      setShowErrorModal(true);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filter transactions by customer name or phone
  const filteredTransactions = transactions.filter(
    (t) =>
      t.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone?.includes(searchQuery)
  );
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const mul = custSortOrder === "asc" ? 1 : -1;
    if (custSortBy === "customer_name") {
      return mul * (a.customer_name || "").localeCompare(b.customer_name || "", undefined, { sensitivity: "base" });
    }
    if (custSortBy === "sale_date") {
      return mul * (new Date(a.sale_date || 0).getTime() - new Date(b.sale_date || 0).getTime());
    }
    return mul * ((a.total_amount ?? 0) - (b.total_amount ?? 0));
  });
  const totalCustPages = Math.max(1, Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE));
  const paginatedTransactions = sortedTransactions.slice(
    (custPage - 1) * ITEMS_PER_PAGE,
    custPage * ITEMS_PER_PAGE
  );

  const handleExportPDF = async () => {
    if (reportOutletId == null) return;
    try {
      const params = new URLSearchParams({
        outlet_id: String(reportOutletId),
        from_date: fromDate,
        to_date: toDate,
      });
      const response = await api.get(`/reports/customer-sales/export/pdf?${params}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `CustomerSales_${fromDate}_${toDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Failed to download PDF");
    }
  };

  const handleExportExcel = async () => {
    if (reportOutletId == null) return;
    try {
      const params = new URLSearchParams({
        outlet_id: String(reportOutletId),
        from_date: fromDate,
        to_date: toDate,
      });
      const response = await api.get(`/reports/customer-sales/export/excel?${params}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `CustomerSales_${fromDate}_${toDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download Excel:", err);
      alert("Failed to download Excel");
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Customer Sales Summary</h1>
        <p className="text-sm text-text-secondary">Track customer purchase history and spending patterns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Total Customers</p>
              <p className="text-2xl font-bold text-text-primary">{summary.totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
              <ShoppingCart size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Total Sales</p>
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(summary.totalSales)}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Avg. per Customer</p>
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(summary.avgPerCustomer)}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <User size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Top Customer</p>
              <p className="text-lg font-bold text-text-primary truncate">{summary.topCustomer || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Outlet</label>
            <select
              value={reportOutletId ?? ""}
              onChange={(e) => setReportOutletId(e.target.value === "" ? null : Number(e.target.value))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            >
              {showAllInDropdown && (
                <option value={0}>All</option>
              )}
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Search Customer</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCustPage(1); }}
              placeholder="Name or phone..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={transactions.length === 0}
            className="px-6 py-2 bg-danger text-white text-sm font-medium rounded-lg hover:bg-danger/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={transactions.length === 0}
            className="px-6 py-2 bg-success text-white text-sm font-medium rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* One row per purchase (each bill) */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Purchase records</h2>
            <p className="text-xs text-text-secondary mt-0.5">One row per bill — each purchase is a new record</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-secondary">Sort by:</span>
            <select
              value={`${custSortBy}-${custSortOrder}`}
              onChange={(e) => {
                const [by, ord] = e.target.value.split("-") as ["customer_name" | "sale_date" | "total_amount", "asc" | "desc"];
                setCustSortBy(by);
                setCustSortOrder(ord);
                setCustPage(1);
              }}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="sale_date-desc">Date (newest)</option>
              <option value="sale_date-asc">Date (oldest)</option>
              <option value="customer_name-asc">Customer A–Z</option>
              <option value="customer_name-desc">Customer Z–A</option>
              <option value="total_amount-desc">Amount (high–low)</option>
              <option value="total_amount-asc">Amount (low–high)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Customer Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Invoice</th>
                {isReportAll && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Outlet</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((t, index) => (
                  <tr key={`${t.type}-${t.invoice_number}-${t.sale_date}-${t.outlet_id ?? ""}-${index}`} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-text-primary">{t.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{t.phone}</td>
                    <td className="px-6 py-4 text-sm font-mono text-text-primary">{t.invoice_number}</td>
                    {isReportAll && (
                      <td className="px-6 py-4 text-sm text-text-secondary">{t.outlet_name ?? "—"}</td>
                    )}
                    <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(t.sale_date)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md bg-surface-2 border border-border text-sm font-medium text-text-primary">
                        {t.item_count ?? 0} {(t.item_count ?? 0) === 1 ? "item" : "items"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary capitalize">{t.payment_method}</td>
                    <td className="px-6 py-4 text-sm font-mono text-right font-bold text-success">{formatCurrency(t.total_amount)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/reports/customer-sales/view?name=${encodeURIComponent(t.customer_name)}&phone=${encodeURIComponent(t.phone)}&invoice=${encodeURIComponent(t.invoice_number)}&from=${fromDate}&to=${toDate}`}
                          className="text-primary hover:text-primary-hover transition-colors p-1"
                          title="View invoice details"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(t)}
                          className="text-danger hover:text-danger/80 transition-colors p-1"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isReportAll ? 9 : 8} className="px-6 py-8 text-center text-text-secondary">
                    {loading ? "Loading..." : "No purchase records found for the selected period."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={custPage}
          totalPages={totalCustPages}
          onPageChange={setCustPage}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={sortedTransactions.length}
        />
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Sale"
        message={`Are you sure you want to delete invoice ${deleteTarget?.invoice_number}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Sale Deleted"
        message="The sale has been successfully deleted."
      />

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Delete Failed"
        message={errorMessage}
      />
    </div>
  );
}
