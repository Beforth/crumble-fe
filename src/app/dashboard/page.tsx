"use client";

import { useEffect, useState } from 'react';
import { useOutlet, ALL_OUTLET, isAllOutlet } from '@/contexts/OutletContext';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Package, ShoppingCart, AlertCircle, Store, Warehouse, ChevronDown, TrendingUp, FileText, CreditCard, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const SummaryCard = ({ label, value, subtext, icon: Icon, colorClass, diff = null }: any) => {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 transition-all hover:border-primary-muted relative overflow-hidden group">
      <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-5 transition-transform group-hover:scale-125", colorClass)}></div>
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2.5 rounded-lg", colorClass.replace('bg-', 'bg-').replace('text-', 'text-'))}>
          <Icon size={24} className="text-white" />
        </div>
        {diff != null && diff !== 0 && (
          <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full", diff > 0 ? "text-success bg-success/10" : "text-danger bg-danger/10")}>
            {diff > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{formatCurrency(Math.abs(diff))}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-text-secondary text-sm font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-text-primary tracking-tight">{value}</p>
        <p className="text-text-muted text-[11px] mt-1 font-medium">{subtext}</p>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { outlets, selectedOutlet, setSelectedOutlet, loading: outletLoading } = useOutlet();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const canViewAll = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (!selectedOutlet) {
      console.log('Waiting for outlet...', { selectedOutlet, outletLoading });
      return;
    }
    
    const allOutlets = isAllOutlet(selectedOutlet);
    const url = allOutlets
      ? '/dashboard/summary?all_outlets=true'
      : `/dashboard/summary?outlet_id=${selectedOutlet.id}`;
    console.log('Fetching dashboard data:', allOutlets ? 'all outlets' : 'outlet ' + selectedOutlet.id);
    setLoading(true);
    api.get(url)
      .then(res => {
        console.log('Dashboard data received:', res.data);
        setData(res.data);
      })
      .catch(err => {
        console.error('Dashboard error:', err);
      })
      .finally(() => setLoading(false));
  }, [selectedOutlet]);

  if (outletLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Dashboard</h1>
            <p className="text-text-secondary mt-1">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedOutlet) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Dashboard</h1>
            <p className="text-text-secondary mt-1">No outlet available. Please configure outlets in settings.</p>
          </div>
        </div>
      </div>
    );
  }

  const showAllInDropdown = canViewAll && outlets.length >= 1;
  const displayName = selectedOutlet?.name || 'Select Outlet';
  const displaySubtitle = isAllOutlet(selectedOutlet) ? 'All outlets' : (selectedOutlet?.outlet_type === 'warehouse' ? 'Warehouse' : 'Outlet');

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Dashboard</h1>
            <p className="text-text-secondary mt-1">Loading metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-12 text-center text-danger">Failed to load dashboard. Ensure backend is running.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-text-secondary mt-1">Summary of your recent performance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Outlet Selector: dropdown when multiple outlets or (admin/superadmin with All option) */}
          {(outlets.length > 1 || showAllInDropdown) ? (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 px-4 py-2.5 bg-surface border border-border rounded-lg hover:border-primary transition-colors min-w-[280px]"
              >
                <div className="flex items-center gap-2 flex-1">
                  {isAllOutlet(selectedOutlet) ? (
                    <Store size={18} className="text-primary" />
                  ) : selectedOutlet?.outlet_type === 'warehouse' ? (
                    <Warehouse size={18} className="text-info" />
                  ) : (
                    <Store size={18} className="text-primary" />
                  )}
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold text-text-primary">
                      {displayName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {displaySubtitle}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={cn("text-text-muted transition-transform", showDropdown && "rotate-180")}
                />
              </button>

              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-full bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                      {showAllInDropdown && (
                        <button
                          onClick={() => {
                            setSelectedOutlet(ALL_OUTLET);
                            setShowDropdown(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors text-left",
                            isAllOutlet(selectedOutlet) && "bg-primary/5 border-l-2 border-primary"
                          )}
                        >
                          <Store size={18} className="text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-text-primary">All</p>
                            <p className="text-xs text-text-muted">All outlets</p>
                          </div>
                          {isAllOutlet(selectedOutlet) && (
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                          )}
                        </button>
                      )}
                      {outlets.map((outlet) => (
                        <button
                          key={outlet.id}
                          onClick={() => {
                            setSelectedOutlet(outlet);
                            setShowDropdown(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors text-left",
                            !isAllOutlet(selectedOutlet) && selectedOutlet?.id === outlet.id && "bg-primary/5 border-l-2 border-primary"
                          )}
                        >
                          {outlet.outlet_type === 'warehouse' ? (
                            <Warehouse size={18} className="text-info" />
                          ) : (
                            <Store size={18} className="text-primary" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-text-primary">
                              {outlet.name}
                            </p>
                            <p className="text-xs text-text-muted">
                              {outlet.outlet_type === 'warehouse' ? 'Warehouse' : 'Outlet'}
                            </p>
                          </div>
                          {!isAllOutlet(selectedOutlet) && selectedOutlet?.id === outlet.id && (
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Show outlet name without dropdown for single outlet users (no All) */
            <div className="flex items-center gap-3 px-4 py-2.5 bg-surface border border-border rounded-lg min-w-[280px]">
              <div className="flex items-center gap-2 flex-1">
                {selectedOutlet?.outlet_type === 'warehouse' ? (
                  <Warehouse size={18} className="text-info" />
                ) : (
                  <Store size={18} className="text-primary" />
                )}
                <div className="text-left flex-1">
                  <p className="text-sm font-bold text-text-primary">
                    {displayName}
                  </p>
                  <p className="text-xs text-text-muted">
                    {displaySubtitle}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          label="Today's Sale"
          value={formatCurrency(data.revenue.total)}
          subtext={data.revenue.diff_from_yesterday >= 0 ? "Increase from yesterday" : "Decrease from yesterday"}
          diff={data.revenue.diff_from_yesterday}
          icon={ShoppingCart}
          colorClass="bg-primary text-white"
        />
        <SummaryCard
          label="Monthly Sale"
          value={formatCurrency(data.revenue.monthly)}
          subtext="Total sales this month"
          icon={TrendingUp}
          colorClass="bg-info text-white"
        />
        <SummaryCard
          label="Bills Generated"
          value={data.bills.today.toString()}
          subtext="Invoices created today"
          icon={FileText}
          colorClass="bg-success text-white"
        />
        <SummaryCard
          label="Total Market Credit"
          value={formatCurrency(data.credit.total)}
          subtext="Outstanding credit amount"
          icon={CreditCard}
          colorClass="bg-warning text-white"
        />
        <SummaryCard
          label="Total Products"
          value={data.inventory.total_items.toString()}
          subtext="Active inventory items"
          icon={Package}
          colorClass="bg-purple-600 text-white"
        />
        <SummaryCard
          label="Customers visited"
          value={data.customers.today.toString()}
          subtext="Customers today"
          icon={Users}
          colorClass="bg-blue-600 text-white"
        />
        <SummaryCard
          label="Low Stocks"
          value={data.inventory.low_stock_count.toString()}
          subtext="Items below minimum stock"
          icon={AlertCircle}
          colorClass="bg-danger text-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6 h-[500px]">
          <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Monthly Revenue (2026)
          </h2>
          <div className="h-[calc(100%-3rem)]">
            {data.monthly_revenue_chart && data.monthly_revenue_chart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthly_revenue_chart}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: '#9ca3af' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: '#9ca3af' }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }}
                    formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full border-2 border-dashed border-border rounded-lg text-text-muted text-sm">
                <div className="text-center">
                  <TrendingUp size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No revenue data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 h-[500px] flex flex-col">
          <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <AlertCircle size={20} className="text-danger" />
            Low Stock Alerts
          </h2>
          <div className="space-y-4 overflow-y-auto flex-1">
            {data.alerts.length > 0 ? (
              data.alerts.map((a: any) => {
                const displayStock = Math.max(0, Number(a.current_stock));
                const deficitAmount = Math.abs(Number(a.deficit));
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border/50">
                    <div>
                      <p className="text-sm font-bold text-text-primary truncate max-w-[120px]" title={a.name}>{a.name}</p>
                      <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mt-0.5">Deficit: {deficitAmount.toFixed(2)} {a.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-danger">{displayStock.toFixed(2)} {a.unit}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Min: {Number(a.min_stock).toFixed(0)} {a.unit}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-text-muted text-sm">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package size={20} className="text-success" />
                </div>
                All stock levels are healthy!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
