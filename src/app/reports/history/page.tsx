"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useOutlet } from "@/contexts/OutletContext";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Eye, Trash2, Download, FileText, FileSpreadsheet } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { Pagination } from "@/components/ui/Pagination";

// Helper function to get local date in YYYY-MM-DD format
const getLocalDateString = (date?: Date) => {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get Monday of current week
const getMondayOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(now.setDate(diff));
};

// Get Sunday of current week
const getSundayOfWeek = () => {
  const monday = getMondayOfWeek();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
};

// Get first day of current month
const getFirstDayOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

// Get last day of current month
const getLastDayOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
};

export default function HistoryPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const [reportType, setReportType] = useState("daily");
  const [fromDate, setFromDate] = useState(getLocalDateString());
  const [toDate, setToDate] = useState(getLocalDateString());
  const [paymentMode, setPaymentMode] = useState("all");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportOutletId, setReportOutletId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 10;
  const [reportPage, setReportPage] = useState(1);
  const [reportSortBy, setReportSortBy] = useState<"sale_date" | "invoice_number" | "total_amount">("sale_date");
  const [reportSortOrder, setReportSortOrder] = useState<"asc" | "desc">("desc");

  const isGlobalAll = selectedOutlet && (selectedOutlet.id === 0 || (selectedOutlet as any).outlet_type === "all");
  const showAllInDropdown = !isGlobalAll && outlets.length > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedOutlet) return;
    if (isGlobalAll) {
      if (outlets.length > 0) setReportOutletId(outlets[0].id);
    } else {
      setReportOutletId(selectedOutlet.id);
    }
  }, [selectedOutlet?.id, isGlobalAll, outlets.length]);

  // Handle report type change and adjust dates accordingly
  const handleReportTypeChange = (type: string) => {
    setReportType(type);
    
    if (type === "weekly") {
      setFromDate(getLocalDateString(getMondayOfWeek()));
      setToDate(getLocalDateString(getSundayOfWeek()));
    } else if (type === "monthly") {
      setFromDate(getLocalDateString(getFirstDayOfMonth()));
      setToDate(getLocalDateString(getLastDayOfMonth()));
    } else {
      setFromDate(getLocalDateString());
      setToDate(getLocalDateString());
    }
  };

  const isReportAll = reportOutletId === 0;

  const dailyList = reportData?.transactions ?? [];
  const sortedDaily = [...dailyList].sort((a: any, b: any) => {
    const mul = reportSortOrder === "asc" ? 1 : -1;
    if (reportSortBy === "sale_date") {
      return mul * (new Date(a.sale_date || 0).getTime() - new Date(b.sale_date || 0).getTime());
    }
    if (reportSortBy === "invoice_number") {
      return mul * (a.invoice_number || "").localeCompare(b.invoice_number || "");
    }
    return mul * ((a.total_amount ?? 0) - (b.total_amount ?? 0));
  });
  const totalDailyPages = Math.max(1, Math.ceil(sortedDaily.length / ITEMS_PER_PAGE));
  const paginatedDaily = sortedDaily.slice((reportPage - 1) * ITEMS_PER_PAGE, reportPage * ITEMS_PER_PAGE);

  const weeklyList = reportData?.weeklyData ?? [];
  const totalWeeklyPages = Math.max(1, Math.ceil(weeklyList.length / ITEMS_PER_PAGE));
  const paginatedWeekly = weeklyList.slice((reportPage - 1) * ITEMS_PER_PAGE, reportPage * ITEMS_PER_PAGE);

  const monthlyList = reportData?.monthlyData ?? [];
  const totalMonthlyPages = Math.max(1, Math.ceil(monthlyList.length / ITEMS_PER_PAGE));
  const paginatedMonthly = monthlyList.slice((reportPage - 1) * ITEMS_PER_PAGE, reportPage * ITEMS_PER_PAGE);

  const itemwiseList = reportData?.itemwiseData ?? [];
  const totalItemwisePages = Math.max(1, Math.ceil(itemwiseList.length / ITEMS_PER_PAGE));
  const paginatedItemwise = itemwiseList.slice((reportPage - 1) * ITEMS_PER_PAGE, reportPage * ITEMS_PER_PAGE);

  const hasReportData =
    reportType === "daily" && (reportData?.transactions?.length ?? 0) > 0 ||
    reportType === "weekly" && (reportData?.weeklyData?.length ?? 0) > 0 ||
    reportType === "monthly" && (reportData?.monthlyData?.length ?? 0) > 0 ||
    reportType === "itemwise" && (reportData?.itemwiseData?.length ?? 0) > 0;

  useEffect(() => {
    if (reportOutletId != null) {
      loadReport();
    }
  }, [reportOutletId, fromDate, toDate, paymentMode, reportType]);

  useEffect(() => {
    setReportPage(1);
  }, [reportType]);

  const loadReport = async () => {
    if (reportOutletId == null) return;
    
    setLoading(true);
    try {
      const outletIdParam = String(reportOutletId);
      const params = new URLSearchParams({
        outlet_id: outletIdParam,
        from_date: fromDate,
        to_date: toDate,
        payment_mode: paymentMode,
        report_type: reportType,
      });
      
      const response = await api.get(`/reports/sales-history?${params}`);
      setReportData(response.data);
    } catch (error) {
      console.error("Failed to load report:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildExportParams = () =>
    new URLSearchParams({
      outlet_id: String(reportOutletId ?? ""),
      from_date: fromDate,
      to_date: toDate,
      payment_mode: paymentMode,
      report_type: reportType,
    });

  const handleExportPDF = async () => {
    if (reportOutletId == null) return;
    try {
      const params = buildExportParams();
      const response = await api.get(`/reports/sales-history/export/pdf?${params}`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SalesHistory_${reportType}_${fromDate}_${toDate}.pdf`;
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
      const params = buildExportParams();
      const response = await api.get(`/reports/sales-history/export/excel?${params}`, { responseType: "blob" });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SalesHistory_${reportType}_${fromDate}_${toDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download Excel:", err);
      alert("Failed to download Excel");
    }
  };

  const handleExportAllOutlets = async (format: "pdf" | "excel") => {
    setDownloadMenuOpen(false);
    setExportingAll(true);
    try {
      const params = new URLSearchParams({
        all_outlets: "true",
        from_date: fromDate,
        to_date: toDate,
        payment_mode: paymentMode,
        report_type: reportType,
      });
      const endpoint = `/reports/sales-history/export/${format}?${params}`;
      const response = await api.get(endpoint, { responseType: "blob" });
      const filename =
        format === "pdf"
          ? `SalesHistory_All_Outlets_${reportType}_${fromDate}_${toDate}.pdf`
          : `SalesHistory_All_Outlets_${reportType}_${fromDate}_${toDate}.xlsx`;
      const blob =
        format === "pdf"
          ? new Blob([response.data], { type: "application/pdf" })
          : new Blob([response.data], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccessMessage("Downloaded sales history for all outlets.");
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Failed to export all outlets:", err);
      alert("Failed to download. Please try again.");
    } finally {
      setExportingAll(false);
    }
  };

  const handleDeleteClick = (txn: any) => {
    setDeleteTarget(txn);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const endpoint =
        deleteTarget.type === "finished_goods"
          ? `/pos/sales/${encodeURIComponent(deleteTarget.invoice_number)}`
          : `/raw-material-sales/${encodeURIComponent(deleteTarget.invoice_number)}`;
      await api.delete(endpoint);
      setDeleteTarget(null);
      setSuccessMessage("Sale deleted successfully.");
      setShowSuccessModal(true);
      loadReport();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete sale");
      setDeleteTarget(null);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Sales History</h1>
        <p className="text-sm text-text-secondary">Detailed analytics and transaction logs</p>
      </div>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-surface rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">₹</div>
              <div>
                <p className="text-xs text-text-secondary">Total Sales</p>
                <p className="text-2xl font-bold text-text-primary">{formatCurrency(reportData.totalSales || 0)}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">#</div>
              <div>
                <p className="text-xs text-text-secondary">Total Bills</p>
                <p className="text-2xl font-bold text-text-primary">{reportData.totalBills || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning">₹</div>
              <div>
                <p className="text-xs text-text-secondary">Avg Bill Value</p>
                <p className="text-2xl font-bold text-text-primary">{formatCurrency(reportData.avgBillValue || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Report Type</div>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleReportTypeChange("daily")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === "daily"
                ? "bg-primary text-white"
                : "bg-surface-2 text-text-secondary hover:text-text-primary"
            }`}
          >
            Daily Sales
          </button>
          <button
            onClick={() => handleReportTypeChange("weekly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === "weekly"
                ? "bg-primary text-white"
                : "bg-surface-2 text-text-secondary hover:text-text-primary"
            }`}
          >
            Weekly Sales
          </button>
          <button
            onClick={() => handleReportTypeChange("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === "monthly"
                ? "bg-primary text-white"
                : "bg-surface-2 text-text-secondary hover:text-text-primary"
            }`}
          >
            Monthly Sales
          </button>
          <button
            onClick={() => handleReportTypeChange("itemwise")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === "itemwise"
                ? "bg-primary text-white"
                : "bg-surface-2 text-text-secondary hover:text-text-primary"
            }`}
          >
            Item-wise Sales
          </button>
        </div>

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
            <label className="block text-xs font-medium text-text-secondary mb-2">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            >
              <option value="all">All</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="credit">Credit</option>
            </select>
          </div>
        </div>

        {/* Load Report Button - Commented out, data loads automatically */}
        {/* <div className="flex gap-3 pt-2">
          <button
            onClick={loadReport}
            disabled={loading}
            className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : "Load Report"}
          </button>
          <button className="px-6 py-2 bg-danger text-white text-sm font-medium rounded-lg hover:bg-danger/90 transition-colors">
            Export PDF
          </button>
          <button className="px-6 py-2 bg-success text-white text-sm font-medium rounded-lg hover:bg-success/90 transition-colors">
            Export Excel
          </button>
        </div> */}

        <div className="flex gap-3 pt-2 items-center">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={reportOutletId == null || !hasReportData}
            className="px-6 py-2 bg-danger text-white text-sm font-medium rounded-lg hover:bg-danger/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={reportOutletId == null || !hasReportData}
            className="px-6 py-2 bg-success text-white text-sm font-medium rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Excel
          </button>
          <div className="relative" ref={downloadMenuRef}>
            <button
              type="button"
              onClick={() => setDownloadMenuOpen((o) => !o)}
              disabled={exportingAll || !hasReportData}
              title="Download history for all outlets"
              className="p-1.5 rounded-md border border-border bg-surface-2 text-text-primary hover:bg-surface hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
            </button>
            {downloadMenuOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 min-w-[180px] py-1 bg-surface border border-border rounded-lg shadow-xl">
                <p className="px-3 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
                  Export all outlets
                </p>
                <button
                  type="button"
                  onClick={() => handleExportAllOutlets("pdf")}
                  disabled={exportingAll}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-2 transition-colors text-left"
                >
                  <FileText size={18} className="text-danger" />
                  Export as PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleExportAllOutlets("excel")}
                  disabled={exportingAll}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-2 transition-colors text-left"
                >
                  <FileSpreadsheet size={18} className="text-success" />
                  Export as Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Display based on Report Type */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-text-primary">
            {reportType === "daily" && "Recent Transactions"}
            {reportType === "weekly" && "Weekly Sales Summary"}
            {reportType === "monthly" && "Monthly Sales Summary"}
            {reportType === "itemwise" && "Item-wise Sales"}
          </h2>
          {reportType === "daily" && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-secondary">Sort by:</span>
              <select
                value={`${reportSortBy}-${reportSortOrder}`}
                onChange={(e) => {
                  const [by, ord] = e.target.value.split("-") as ["sale_date" | "invoice_number" | "total_amount", "asc" | "desc"];
                  setReportSortBy(by);
                  setReportSortOrder(ord);
                  setReportPage(1);
                }}
                className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-primary focus:outline-none"
              >
                <option value="sale_date-desc">Date (newest)</option>
                <option value="sale_date-asc">Date (oldest)</option>
                <option value="invoice_number-asc">Invoice A–Z</option>
                <option value="invoice_number-desc">Invoice Z–A</option>
                <option value="total_amount-desc">Amount (high–low)</option>
                <option value="total_amount-asc">Amount (low–high)</option>
              </select>
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          {/* Daily Transactions */}
          {reportType === "daily" && (
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                  {isReportAll && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Outlet</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedDaily.length > 0 ? (
                  paginatedDaily.map((txn: any) => (
                    <tr key={txn.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-primary font-bold">{txn.invoice_number}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(txn.sale_date)}</td>
                      {isReportAll && (
                        <td className="px-6 py-4 text-sm text-text-secondary">{txn.outlet_name ?? "—"}</td>
                      )}
                      <td className="px-6 py-4 text-sm font-mono text-text-primary font-bold">{formatCurrency(txn.total_amount)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-surface-2 text-text-primary capitalize">{txn.payment_method}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/reports/history/view?invoice=${encodeURIComponent(txn.invoice_number)}&type=${txn.type || "finished_goods"}&outlet_id=${txn.outlet_id ?? reportOutletId}&from=${fromDate}&to=${toDate}`}
                            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                            title="View"
                          >
                            <Eye size={18} />
                          </Link>
                          {/* <button
                            type="button"
                            onClick={() => handleDeleteClick(txn)}
                            className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isReportAll ? 6 : 5} className="px-6 py-8 text-center text-text-secondary">
                      {loading ? "Loading..." : "No transactions found for the selected filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Weekly Summary */}
          {reportType === "weekly" && (
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Week</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Bills</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Avg Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedWeekly.length > 0 ? (
                  paginatedWeekly.map((week: any) => (
                    <tr key={week.week} className="hover:bg-surface-2 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-text-primary">{week.week}</td>
                      <td className="px-6 py-4 text-sm text-right text-text-primary">{week.bill_count}</td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-primary font-bold">{formatCurrency(week.total_amount)}</td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-text-secondary">{formatCurrency(week.total_amount / week.bill_count)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">
                      {loading ? "Loading..." : "No data found for the selected filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Monthly Summary */}
          {reportType === "monthly" && (
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Bills</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Avg Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedMonthly.length > 0 ? (
                  paginatedMonthly.map((month: any) => (
                    <tr key={month.month} className="hover:bg-surface-2 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-text-primary">{month.month}</td>
                      <td className="px-6 py-4 text-sm text-right text-text-primary">{month.bill_count}</td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-primary font-bold">{formatCurrency(month.total_amount)}</td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-text-secondary">{formatCurrency(month.total_amount / month.bill_count)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">
                      {loading ? "Loading..." : "No data found for the selected filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Item-wise Sales */}
          {reportType === "itemwise" && (
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Qty Sold</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Bills</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedItemwise.length > 0 ? (
                  paginatedItemwise.map((item: any) => (
                    <tr key={item.product_id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-text-primary">{item.product_name}</td>
                      <td className="px-6 py-4 text-sm text-right text-text-primary">{item.quantity_sold}</td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-primary font-bold">{formatCurrency(item.total_amount)}</td>
                      <td className="px-6 py-4 text-sm text-right text-text-secondary">{item.bill_count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">
                      {loading ? "Loading..." : "No data found for the selected filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {reportType === "daily" && (
          <Pagination
            currentPage={reportPage}
            totalPages={totalDailyPages}
            onPageChange={setReportPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={sortedDaily.length}
          />
        )}
        {reportType === "weekly" && (
          <Pagination
            currentPage={reportPage}
            totalPages={totalWeeklyPages}
            onPageChange={setReportPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={weeklyList.length}
          />
        )}
        {reportType === "monthly" && (
          <Pagination
            currentPage={reportPage}
            totalPages={totalMonthlyPages}
            onPageChange={setReportPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={monthlyList.length}
          />
        )}
        {reportType === "itemwise" && (
          <Pagination
            currentPage={reportPage}
            totalPages={totalItemwisePages}
            onPageChange={setReportPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={itemwiseList.length}
          />
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete sale"
        message={deleteTarget ? `Are you sure you want to delete sale ${deleteTarget.invoice_number}? This action cannot be undone.` : ""}
        confirmText="Delete"
        type="danger"
      />
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Sale deleted"
        message={successMessage}
      />
    </div>
  );
}
