"use client";

import { useEffect, useState } from 'react';
import { useOutlet } from '@/contexts/OutletContext';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, BarChart3, Calendar, CreditCard, Package, AlertTriangle } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  const { selectedOutlet } = useOutlet();
  const [profitLossData, setProfitLossData] = useState([]);
  const [dailySalesData, setDailySalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('12'); // months
  const [selectedYear, setSelectedYear] = useState(2026); // Jan–Dec for this year
  const [fromDate, setFromDate] = useState<string>(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  });
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedOutlet) {
      setNetworkError(null);
      loadAnalyticsData();
    } else {
      setLoading(false);
    }
  }, [selectedOutlet, timeRange, selectedYear, fromDate]);

  const loadAnalyticsData = async () => {
    if (!selectedOutlet) return;
    
    setLoading(true);
    setNetworkError(null);
    try {
      const fromParam = fromDate ? `&from_date=${encodeURIComponent(fromDate)}` : '';
      const profitLossUrl = selectedYear
        ? `/analytics/profit-loss?outlet_id=${selectedOutlet.id}&year=${selectedYear}${fromParam}`
        : `/analytics/profit-loss?outlet_id=${selectedOutlet.id}&months=${timeRange}${fromParam}`;
      // Daily Sales Trend: from 8 Mar so chart shows 8 Mar, 9 Mar, 10 Mar … through 14 Mar and beyond
      const dailyTrendFromDate = '2026-03-08';
      const dailyTrendUrl = `/analytics/daily-sales-trend?outlet_id=${selectedOutlet.id}&from_date=${encodeURIComponent(dailyTrendFromDate)}`;
      // Top Products: daily (today only) – item-wise sales for the current day
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const [profitLoss, dailySales, products, transactions, payments, lowStock] = await Promise.all([
        api.get(profitLossUrl),
        api.get(dailyTrendUrl),
        api.get(`/analytics/top-products?outlet_id=${selectedOutlet.id}&limit=10&for_date=${encodeURIComponent(todayStr)}`),
        api.get(`/analytics/recent-transactions?outlet_id=${selectedOutlet.id}&limit=10&for_date=${encodeURIComponent(todayStr)}`),
        api.get(`/analytics/payment-methods?outlet_id=${selectedOutlet.id}&days=90${fromParam}`),
        api.get(`/analytics/low-stock-items?outlet_id=${selectedOutlet.id}&limit=10`)
      ]);
      
      setProfitLossData(profitLoss.data || []);
      setDailySalesData(dailySales.data || []);
      setTopProducts(products.data || []);
      setRecentTransactions(transactions.data || []);
      setPaymentMethods(payments.data || []);
      setLowStockItems(lowStock.data || []);
    } catch (error: unknown) {
      console.error("Failed to load analytics:", error);
      const isNetworkError =
        (error as { code?: string; message?: string }).code === "ERR_NETWORK" ||
        (error as { message?: string }).message === "Network Error";
      setNetworkError(
        isNetworkError
          ? "Cannot reach the server. Make sure the backend is running (e.g. uvicorn from the backend folder on port 8000)."
          : "Failed to load analytics. Please try again."
      );
      setProfitLossData([]);
      setDailySalesData([]);
      setTopProducts([]);
      setRecentTransactions([]);
      setPaymentMethods([]);
      setLowStockItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Analytics</h1>
        <p className="text-text-secondary">Loading analytics data...</p>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Analytics</h1>
        <div className="mt-4 p-4 bg-danger/10 border border-danger/30 rounded-xl text-danger">
          <p className="font-medium">Connection error</p>
          <p className="text-sm mt-1 text-text-secondary">{networkError}</p>
          <button
            type="button"
            onClick={() => selectedOutlet && loadAnalyticsData()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!selectedOutlet) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Analytics</h1>
        <p className="text-text-secondary">Select an outlet to view analytics.</p>
      </div>
    );
  }

  // Summary: revenue and expense only (profit = revenue - expense)
  const totalRevenue = profitLossData.reduce((sum: number, item: any) => sum + item.revenue, 0);
  const totalExpense = profitLossData.reduce((sum: number, item: any) => sum + (item.expense ?? 0), 0);
  const totalProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Analytics</h1>
          <p className="text-text-secondary mt-1">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-sm text-text-secondary">Data from:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value || '')}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:border-primary focus:outline-none"
            title="Only sales on or after this date (excludes demo/pre-go-live data)"
          />
          <span className="text-sm text-text-secondary">Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:border-primary focus:outline-none"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
          <span className="text-sm text-text-secondary">Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:border-primary focus:outline-none"
          >
            <option value="3">Last 3 Months</option>
            <option value="6">Last 6 Months</option>
            <option value="12">Last 12 Months</option>
          </select>
        </div>
      </div>

      {/* Summary Cards – for selected year */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Total Revenue ({selectedYear})</p>
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Package size={24} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Total Expense ({selectedYear})</p>
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalExpense)}</p>
              <p className="text-[10px] text-text-muted mt-0.5">Purchase (inward)</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp size={24} className="text-success" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Net Profit ({selectedYear})</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalProfit)}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center">
              <BarChart3 size={24} className="text-info" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Profit Margin ({selectedYear})</p>
              <p className="text-2xl font-bold text-text-primary">{profitMargin.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit & Loss Trend – Jan–Dec for selected year */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Profit & Loss Trend ({selectedYear})
          </h2>
          {profitLossData.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-text-secondary">
              No data available for the selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={profitLossData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="month_short" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(_, payload) => (payload?.[0]?.payload?.month as string) ?? _}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="expense" stroke="#f59e0b" strokeWidth={2} name="Expense" />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment Methods Pie Chart – cash, online, credit only; filtered by Data from date */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
            <CreditCard size={20} className="text-primary" />
            Payment Methods Distribution
          </h2>
          <p className="text-xs text-text-secondary mb-6">Cash, online, credit only · from selected start date</p>
          {paymentMethods.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-text-secondary">
              No payment data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, percent }: any) => `${method ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethods.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue vs Cost Bar Chart */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            Revenue vs Expense ({selectedYear})
          </h2>
          {profitLossData.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-text-secondary">
              No data available for the selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={profitLossData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="month_short" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                <Bar dataKey="expense" fill="#f59e0b" name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Daily Sales Trend – line with area fill, one point per day (8 Mar, 9 Mar, 10 Mar, …) */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-primary" />
            Daily Sales Trend (8 Mar – 14 Mar and onward)
          </h2>
          {dailySalesData.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-text-secondary">
              No sales data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={dailySalesData} margin={{ top: 12, right: 12, left: 8, bottom: 24 }}>
                <defs>
                  <linearGradient id="colorDailySales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  style={{ fontSize: '11px' }}
                  interval="preserveStartEnd"
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: unknown) => [formatCurrency(Number(value ?? 0)), 'Sales']}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#colorDailySales)"
                  dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Monthly P&L Table – selected year */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            Monthly Profit & Loss
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:border-primary focus:outline-none"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-text-secondary py-3">Month</th>
                <th className="text-right text-xs font-semibold text-text-secondary py-3">Revenue</th>
                <th className="text-right text-xs font-semibold text-text-secondary py-3">Expense</th>
                <th className="text-right text-xs font-semibold text-text-secondary py-3">Profit</th>
                <th className="text-right text-xs font-semibold text-text-secondary py-3">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {profitLossData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-text-secondary">
                    No data for this period
                  </td>
                </tr>
              ) : (
                profitLossData.map((row: any, index: number) => {
                  const margin = row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={index} className="border-b border-border/50 hover:bg-black/5">
                      <td className="py-3 text-sm font-medium text-text-primary">{row.month}</td>
                      <td className="py-3 text-sm text-text-primary text-right">{formatCurrency(row.revenue)}</td>
                      <td className="py-3 text-sm text-amber-600 text-right">{formatCurrency(row.expense ?? 0)}</td>
                      <td className={`py-3 text-sm text-right font-medium ${row.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(row.profit)}
                      </td>
                      <td className={`py-3 text-sm text-right ${row.profit >= 0 ? 'text-success' : 'text-danger'}`}>{margin}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Tables – compact cards with scroll */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Products – same as Item-wise Sales (products + materials) */}
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col max-h-[280px]">
          <h2 className="text-base font-bold text-text-primary mb-1 flex items-center gap-2 shrink-0">
            <Package size={18} className="text-primary" />
            Top Products
          </h2>
          <p className="text-xs text-text-secondary mb-2 shrink-0">
            Item-wise sales for today ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
          </p>
          <div className="overflow-auto min-h-0 flex-1">
            <table className="w-full">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-secondary py-1.5">Product</th>
                  <th className="text-right text-xs font-semibold text-text-secondary py-1.5">Qty</th>
                  <th className="text-right text-xs font-semibold text-text-secondary py-1.5">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-xs text-text-secondary">
                      No product data available
                    </td>
                  </tr>
                ) : (
                  topProducts.map((product: any, index: number) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-2 text-xs text-text-primary">{product.name}</td>
                      <td className="py-2 text-xs text-text-primary text-right">{product.quantity}</td>
                      <td className="py-2 text-xs text-success text-right font-medium">{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions – daily, last 10 */}
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col max-h-[280px]">
          <h2 className="text-base font-bold text-text-primary mb-1 flex items-center gap-2 shrink-0">
            <DollarSign size={18} className="text-primary" />
            Recent Transactions
          </h2>
          <p className="text-xs text-text-secondary mb-2 shrink-0">Last 10 for today ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})</p>
          <div className="overflow-auto min-h-0 flex-1">
            <table className="w-full">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-secondary py-1.5">Invoice</th>
                  <th className="text-right text-xs font-semibold text-text-secondary py-1.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-4 text-center text-xs text-text-secondary">
                      No transactions available
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((txn: any, index: number) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-2">
                        <div className="text-xs text-text-primary font-medium">{txn.invoice}</div>
                        <div className="text-[11px] text-text-secondary">{txn.customer}</div>
                      </td>
                      <td className="py-2 text-xs text-success text-right font-medium">{formatCurrency(txn.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts Table */}
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col max-h-[280px]">
          <h2 className="text-base font-bold text-text-primary mb-3 flex items-center gap-2 shrink-0">
            <AlertTriangle size={18} className="text-warning" />
            Low Stock Alerts
          </h2>
          <div className="overflow-auto min-h-0 flex-1">
            <table className="w-full">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-secondary py-1.5">Item</th>
                  <th className="text-right text-xs font-semibold text-text-secondary py-1.5">Stock</th>
                  <th className="text-center text-xs font-semibold text-text-secondary py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-xs text-text-secondary">
                      All items are well stocked
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-2 text-xs text-text-primary">{item.name}</td>
                      <td className="py-2 text-xs text-text-primary text-right">
                        {Math.max(0, Number(item.current_stock))} {item.unit}
                        {Number(item.current_stock) < 0 && (
                          <span className="text-danger text-[10px] ml-1">(oversold)</span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                          item.status === 'Critical'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
