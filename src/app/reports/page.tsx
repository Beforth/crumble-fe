"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { TrendingUp, Calendar, Filter, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import DataTable from '@/components/tables/DataTable';

export default function ReportsPage() {
   const [sales, setSales] = useState([]);
   const [loading, setLoading] = useState(true);
   const [summary, setSummary] = useState<any>(null);
   const [consumption, setConsumption] = useState([]);
   const [combinedRevenue, setCombinedRevenue] = useState<any>(null);
   const [rmSalesSummary, setRmSalesSummary] = useState<any>(null);
   const [activeTab, setActiveTab] = useState<'sales' | 'consumption'>('sales');

   useEffect(() => {
      const fetchData = async () => {
         try {
            const [salesRes, summaryRes, consRes, revRes, rmSummaryRes] = await Promise.all([
               // Mocking or using actual endpoints
               api.get('/pos/sales/1/daily'), // Defaulting to main for report view
               api.get('/dashboard/summary'),
               api.get('/reports/raw-materials/consumption-analysis'),
               api.get('/reports/combined-revenue'),
               api.get('/reports/raw-material-sales/summary')
            ]);
            setSales(salesRes.data);
            setSummary(summaryRes.data);
            setConsumption(consRes.data);
            setCombinedRevenue(revRes.data);
            setRmSalesSummary(rmSummaryRes.data);
         } catch (err) {
            console.error(err);
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, []);

   return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
         <div className="flex justify-between items-end">
            <div>
               <h1 className="text-2xl font-bold text-text-primary tracking-tight">Sales Reports</h1>
               <p className="text-text-secondary text-sm mt-1">Detailed analytics and transaction logs.</p>
            </div>
            <div className="flex gap-2">
               <div className="flex bg-surface-2 p-1 rounded-lg border border-border mr-4">
                  <button
                     onClick={() => setActiveTab('sales')}
                     className={cn("px-4 py-2 rounded-md text-sm font-bold transition-all", activeTab === 'sales' ? "bg-surface shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-text-primary" : "text-text-secondary hover:text-text-primary")}
                  >
                     Financials
                  </button>
                  <button
                     onClick={() => setActiveTab('consumption')}
                     className={cn("px-4 py-2 rounded-md text-sm font-bold transition-all", activeTab === 'consumption' ? "bg-surface shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-text-primary" : "text-text-secondary hover:text-text-primary")}
                  >
                     RM Consumption
                  </button>
               </div>

               <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-primary text-sm font-bold rounded-lg hover:border-text-secondary transition-colors">
                  <Calendar size={18} />
                  This Month
               </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary-muted transition-colors">
                  <Download size={18} />
                  Export
               </button>
            </div>
         </div>

         {activeTab === 'sales' && (
            <>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-surface border border-border rounded-xl p-6">
                     <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Total Gross Revenue</p>
                     <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-text-primary">{formatCurrency(combinedRevenue?.total_revenue || 0)}</h3>
                     </div>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-6">
                     <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Finished Goods Revenue</p>
                     <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-text-primary">{formatCurrency(combinedRevenue?.finished_goods_revenue || 0)}</h3>
                     </div>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-6">
                     <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Raw Material Revenue</p>
                     <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-text-primary">{formatCurrency(combinedRevenue?.raw_material_revenue || 0)}</h3>
                     </div>
                  </div>
               </div>

               <div className="bg-surface border border-border rounded-xl p-6 min-h-[300px]">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary" />
                        Revenue Trend
                     </h2>
                     <div className="flex gap-2">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-widest border border-primary/20">Daily</span>
                        <span className="px-3 py-1 bg-surface-2 text-text-muted text-[10px] font-bold rounded-full uppercase tracking-widest border border-border">Weekly</span>
                     </div>
                  </div>
                  <div className="flex items-center justify-center h-48 border-2 border-dashed border-border rounded-xl text-text-muted text-sm italic">
                     Chart integration placeholder
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <h2 className="text-lg font-bold text-text-primary">Recent Transactions</h2>
                     <div className="relative w-64">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input
                           type="text"
                           placeholder="Quick Filter..."
                           className="w-full bg-surface-2 border border-border rounded-lg pl-10 pr-4 py-2 text-xs text-text-primary focus:border-primary focus:outline-none transition-colors"
                        />
                     </div>
                  </div>

                  <DataTable
                     columns={['Invoice #', 'Outlet', 'Amount', 'Payment', 'Date', 'Status']}
                     data={sales}
                     loading={loading}
                     renderRow={(s) => (
                        <>
                           <td className="px-6 py-4">
                              <span className="text-sm font-mono font-bold text-text-primary">{s.invoice_number}</span>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-sm text-text-secondary font-medium uppercase tracking-wide">Outlet {s.outlet_id}</span>
                           </td>
                           <td className="px-6 py-4 text-sm font-mono font-bold text-text-primary">{formatCurrency(s.total_amount)}</td>
                           <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{s.payment_method}</span>
                           </td>
                           <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(s.sale_date)}</td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-success"></div>
                                 <span className="text-[10px] font-bold text-success uppercase tracking-widest">Captured</span>
                              </div>
                           </td>
                        </>
                     )}
                  />
               </div>
            </>
         )}

         {activeTab === 'consumption' && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface border border-border rounded-xl p-6">
                     <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Total Items Analyzed</p>
                     <h3 className="text-2xl font-bold text-text-primary">{consumption.length} Materials</h3>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-6">
                     <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">RM Sold Qty</p>
                     <h3 className="text-2xl font-bold text-text-primary">{rmSalesSummary?.total_qty_sold || 0} units</h3>
                  </div>
               </div>

               <div className="bg-surface border border-border rounded-xl shadow-sm text-sm overflow-hidden">
                  <DataTable
                     columns={['Material', 'Total Inward', 'Used in Prod.', 'Sold Direct', 'Wastage', 'Accounted %']}
                     data={consumption}
                     loading={loading}
                     renderRow={(c: any) => (
                        <>
                           <td className="px-6 py-4 font-bold text-text-primary">{c.name}</td>
                           <td className="px-6 py-4 font-mono">{c.purchased.toFixed(3)}</td>
                           <td className="px-6 py-4 font-mono text-primary">{c.used_in_production.toFixed(3)}</td>
                           <td className="px-6 py-4 font-mono text-info">{c.sold_directly.toFixed(3)}</td>
                           <td className="px-6 py-4 font-mono text-danger">{c.damaged_wasted.toFixed(3)}</td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-16 h-2 bg-surface-2 rounded-full overflow-hidden">
                                    <div className={cn("h-full", c.accounted_percentage >= 95 ? "bg-success" : "bg-warning")} style={{ width: `${Math.min(c.accounted_percentage, 100)}%` }}></div>
                                 </div>
                                 <span className="text-xs font-mono font-bold">{c.accounted_percentage.toFixed(1)}%</span>
                              </div>
                           </td>
                        </>
                     )}
                  />
               </div>
            </div>
         )}
      </div>
   );
}
