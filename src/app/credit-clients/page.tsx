"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useOutlet } from '@/contexts/OutletContext';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Search, Eye, Trash2, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

export default function CreditClientsPage() {
  const router = useRouter();
  const { selectedOutlet } = useOutlet();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [clientToDelete, setClientToDelete] = useState<{ id: number; name: string } | null>(null);
  const [search, setSearch] = useState('');
  const [downloadMenuClientId, setDownloadMenuClientId] = useState<number | null>(null);
  const [downloadMenuRect, setDownloadMenuRect] = useState<DOMRect | null>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 10;
  const [clientPage, setClientPage] = useState(1);
  const [clientSortBy, setClientSortBy] = useState<'name' | 'total_due' | 'outlet'>('name');
  const [clientSortOrder, setClientSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('[data-download-trigger]')) return;
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(target)) {
        setDownloadMenuClientId(null);
        setDownloadMenuRect(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    // Set current month and year
    const now = new Date();
    setSelectedMonth(now.toLocaleString('default', { month: 'long' }));
    setSelectedYear(now.getFullYear().toString());
  }, []);

  // Refetch from database whenever month, year, or outlet changes
  useEffect(() => {
    if (!selectedMonth || !selectedYear || !selectedOutlet) return;

    let cancelled = false;
    const monthIndex = months.indexOf(selectedMonth) + 1;
    const year = parseInt(selectedYear, 10);
    const outletId = selectedOutlet.id;

    setLoading(true);
    api
      .get('/credit-clients', {
        params: {
          month: monthIndex,
          year,
          outlet_id: outletId,
          _: Date.now(), // cache-bust so month/year change always hits the server
        },
      })
      .then((res) => {
        if (!cancelled) setClients(res.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setClients([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, selectedYear, selectedOutlet]);

  const fetchClients = async () => {
    if (!selectedMonth || !selectedYear || !selectedOutlet) return;
    const monthIndex = months.indexOf(selectedMonth) + 1;
    const year = parseInt(selectedYear, 10);
    try {
      setLoading(true);
      const res = await api.get('/credit-clients', {
        params: {
          month: monthIndex,
          year,
          outlet_id: selectedOutlet.id,
        },
      });
      setClients(res.data ?? []);
    } catch (err) {
      console.error(err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (clientId: number, clientName: string) => {
    try {
      const response = await api.get(`/credit-clients/${clientId}/pdf`, {
        responseType: 'blob'
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ClientHistory_${clientName}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Failed to download PDF');
    }
  };

  const handleDownloadExcel = async (clientId: number, clientName: string) => {
    try {
      const response = await api.get(`/credit-clients/${clientId}/excel`, {
        responseType: 'blob'
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ClientHistory_${clientName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download Excel:', err);
      alert('Failed to download Excel');
    }
  };

  const handleDeleteClick = (clientId: number, clientName: string) => {
    setClientToDelete({ id: clientId, name: clientName });
    setModalMessage(`Are you sure you want to delete ${clientName}?`);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    
    setShowConfirmModal(false);
    
    try {
      await api.delete(`/credit-clients/${clientToDelete.id}`);
      setModalMessage(`${clientToDelete.name} deleted successfully`);
      setShowSuccessModal(true);
      // Refresh the list
      await fetchClients();
    } catch (err: any) {
      console.error('Failed to delete client:', err);
      setModalMessage(err.response?.data?.detail || 'Failed to delete client');
      setShowErrorModal(true);
    } finally {
      setClientToDelete(null);
    }
  };

  const filteredClients = clients.filter((client) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    const name = (client.name || '').toLowerCase();
    const phone = (client.phone || '').toLowerCase();
    return name.includes(term) || phone.includes(term);
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    const mul = clientSortOrder === 'asc' ? 1 : -1;
    if (clientSortBy === 'name') {
      return mul * (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    }
    if (clientSortBy === 'outlet') {
      return mul * (a.outlet_name || '').localeCompare(b.outlet_name || '', undefined, { sensitivity: 'base' });
    }
    const da = typeof a.total_due === 'string' ? parseFloat(a.total_due) : (a.total_due ?? 0);
    const db = typeof b.total_due === 'string' ? parseFloat(b.total_due) : (b.total_due ?? 0);
    return mul * (da - db);
  });
  const totalClientPages = Math.max(1, Math.ceil(sortedClients.length / ITEMS_PER_PAGE));
  const paginatedClients = sortedClients.slice(
    (clientPage - 1) * ITEMS_PER_PAGE,
    clientPage * ITEMS_PER_PAGE
  );

  const totalMarketCredit = filteredClients.reduce((acc, client) => {
    const due = typeof client.total_due === 'string' ? parseFloat(client.total_due) : client.total_due;
    return acc + (due || 0);
  }, 0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Credit Clients</h1>
        <p className="text-text-secondary text-sm">Manage outstanding balances and payments</p>
      </div>

      {/* Search Bar and Sort */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setClientPage(1); }}
            className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-secondary">Sort by:</span>
          <select
            value={`${clientSortBy}-${clientSortOrder}`}
            onChange={(e) => {
              const [by, ord] = e.target.value.split('-') as ['name' | 'total_due' | 'outlet', 'asc' | 'desc'];
              setClientSortBy(by);
              setClientSortOrder(ord);
              setClientPage(1);
            }}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="total_due-desc">Total due (high–low)</option>
            <option value="total_due-asc">Total due (low–high)</option>
            <option value="outlet-asc">Outlet A–Z</option>
            <option value="outlet-desc">Outlet Z–A</option>
          </select>
        </div>
      </div>

      {/* Filters and Total */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchClients}
            className="self-end px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        <div className="text-right">
          <p className="text-xs text-text-secondary mb-1">
            Total Market Credit {search ? `(${filteredClients.length} shown)` : ''}
          </p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalMarketCredit)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-2 border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Customer Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Outlet
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                Monthly Taken
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                Monthly Paid
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                Total Due
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-text-secondary">
                  Loading...
                </td>
              </tr>
            ) : paginatedClients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-text-secondary">
                  {clients.length === 0 ? 'No credit clients found' : 'No clients match your search'}
                </td>
              </tr>
            ) : (
              paginatedClients.map((client) => (
                <tr key={client.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-4 text-sm text-text-primary font-medium">
                    {client.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {client.phone}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {(client.outlet_name && client.outlet_name.trim()) ? client.outlet_name : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-primary font-mono">
                    {formatCurrency(client.monthly_taken || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-success font-mono">
                    {formatCurrency(client.monthly_paid || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono">
                    <span className={(client.total_due || 0) > 0 ? 'text-danger' : 'text-text-primary'}>
                      {formatCurrency(client.total_due || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        type="button"
                        onClick={() => router.push(`/credit-clients/${client.id}`)}
                        className="text-primary hover:text-primary-hover transition-colors p-1"
                        title="View History"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(client.id, client.name)}
                        className="text-danger hover:text-danger/80 transition-colors p-1"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        type="button"
                        data-download-trigger
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                          if (downloadMenuClientId === client.id) {
                            setDownloadMenuClientId(null);
                            setDownloadMenuRect(null);
                          } else {
                            setDownloadMenuClientId(client.id);
                            setDownloadMenuRect(rect);
                          }
                        }}
                        className="text-text-primary hover:text-primary transition-colors p-1"
                        title="Download"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={clientPage}
          totalPages={totalClientPages}
          onPageChange={setClientPage}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={sortedClients.length}
        />
      </div>

      {/* Download dropdown - portal so it's not clipped by table overflow */}
      {typeof document !== 'undefined' &&
        downloadMenuClientId != null &&
        downloadMenuRect &&
        (() => {
          const downloadClient = clients.find((c: any) => c.id === downloadMenuClientId);
          if (!downloadClient) return null;
          const rect = downloadMenuRect;
          return createPortal(
            <div
              ref={downloadMenuRef}
              className="fixed z-[100] min-w-[160px] bg-surface border border-border rounded-lg shadow-lg py-1"
              style={{
                top: rect.bottom + 4,
                left: Math.min(rect.left, typeof window !== 'undefined' ? window.innerWidth - 168 : rect.left),
              }}
            >
              <button
                type="button"
                onClick={() => {
                  handleDownloadPDF(downloadClient.id, downloadClient.name);
                  setDownloadMenuClientId(null);
                  setDownloadMenuRect(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-2 transition-colors text-left"
              >
                <FileText size={16} className="text-danger shrink-0" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDownloadExcel(downloadClient.id, downloadClient.name);
                  setDownloadMenuClientId(null);
                  setDownloadMenuRect(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-2 transition-colors text-left"
              >
                <FileSpreadsheet size={16} className="text-success shrink-0" />
                Download Excel
              </button>
            </div>,
            document.body
          );
        })()}

      {/* Confirm Delete Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-warning/10 text-warning">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-warning">Confirm Delete</h2>
              <p className="text-text-primary font-medium">{modalMessage}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setClientToDelete(null);
                }}
                className="flex-1 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] bg-surface-2 border border-border text-text-primary hover:border-primary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] bg-danger text-white hover:bg-danger/90 shadow-danger/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-success/10 text-success">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-success">Success!</h2>
              <p className="text-text-primary font-medium">{modalMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] bg-success text-white hover:bg-success/90 shadow-success/20"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-danger/10 text-danger">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-danger">Error</h2>
              <p className="text-text-primary font-medium">{modalMessage}</p>
            </div>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] bg-danger text-white hover:bg-danger/90 shadow-danger/20"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
