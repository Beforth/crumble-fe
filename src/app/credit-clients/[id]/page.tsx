"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function CreditClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('outstanding');
  const [receiveAmount, setReceiveAmount] = useState('0.00');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      const api = (await import('@/lib/api')).default;
      
      // Fetch client info
      const clientRes = await api.get(`/credit-clients/${id}`);
      
      // Fetch client sales
      const salesRes = await api.get(`/credit-clients/${id}/sales`);
      
      // Fetch payment history
      const paymentsRes = await api.get(`/credit-clients/${id}/payments`);
      
      setClient({
        id: clientRes.data.id,
        name: clientRes.data.name,
        phone: clientRes.data.phone,
        currentBalance: clientRes.data.total_due,
        outstandingBills: salesRes.data.map((sale: any) => {
          const amountPaid = sale.amount_paid || 0;
          const pending = sale.total_amount - amountPaid;
          return {
            billNumber: sale.invoice_number,
            date: new Date(sale.created_at).toLocaleString('en-IN'),
            total: sale.total_amount,
            paid: amountPaid,
            status: pending > 0 ? 'Unpaid' : 'Paid',
            pending: pending
          };
        }),
        salesHistory: salesRes.data,
        paymentHistory: paymentsRes.data
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReceivePayment = async () => {
    const amount = parseFloat(receiveAmount);
    if (isNaN(amount) || amount <= 0) {
      setModalMessage('Please enter a valid amount');
      setShowErrorModal(true);
      return;
    }
    
    if (amount > client.currentBalance) {
      setModalMessage(`Payment amount cannot exceed current balance: ${formatCurrency(client.currentBalance)}`);
      setShowErrorModal(true);
      return;
    }
    
    try {
      const api = (await import('@/lib/api')).default;
      await api.post(`/credit-clients/${id}/payments`, {
        amount: amount,
        payment_method: paymentMode.toLowerCase()
      });
      
      // Refresh client details
      await fetchClientDetails();
      setReceiveAmount('0.00');
      setModalMessage('Payment received successfully');
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error(err);
      setModalMessage(err.response?.data?.detail || 'Failed to receive payment');
      setShowErrorModal(true);
    }
  };

  const handleSettleAll = async () => {
    if (client.currentBalance <= 0) {
      setModalMessage('No outstanding balance to settle');
      setShowErrorModal(true);
      return;
    }
    
    setModalMessage(`Settle all outstanding balance of ${formatCurrency(client.currentBalance)}?`);
    setShowConfirmModal(true);
  };

  const confirmSettleAll = async () => {
    setShowConfirmModal(false);
    
    try {
      const api = (await import('@/lib/api')).default;
      await api.post(`/credit-clients/${id}/settle-all`, null, {
        params: {
          payment_method: paymentMode.toLowerCase()
        }
      });
      
      // Refresh client details
      await fetchClientDetails();
      setModalMessage('All outstanding balance settled successfully');
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error(err);
      setModalMessage(err.response?.data?.detail || 'Failed to settle balance');
      setShowErrorModal(true);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary">Client not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Back Button */}
      <div className="px-6 py-3 bg-background">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Header Card */}
      <div className="px-6 pb-4">
        <div className="bg-surface rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-1">{client.name}</h1>
              <p className="text-text-secondary text-sm">{client.phone}</p>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-text-secondary mb-1">Current Balance</p>
              <p className="text-3xl font-bold text-danger">{formatCurrency(client.currentBalance)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div className="px-6 pb-4">
        <div className="bg-surface rounded-lg border border-border p-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">Receive Payment</label>
            <input
              type="number"
              step="0.01"
              value={receiveAmount}
              onChange={(e) => setReceiveAmount(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
            />
          </div>
          
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
              <option value="Card">Card</option>
            </select>
          </div>
          
          <button
            onClick={handleReceivePayment}
            className="px-6 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors text-sm font-medium"
          >
            Receive Payment
          </button>
          
          <button
            onClick={handleSettleAll}
            className="px-6 py-2 bg-danger text-white rounded-lg hover:bg-danger/90 transition-colors text-sm font-medium"
          >
            Settle All Outstanding
          </button>
        </div>
        </div>
      </div>

      {/* Tabs */}
      {/* Tabs and Table - Combined */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full flex flex-col bg-surface rounded-lg border border-border">
          {/* Tabs */}
          <div className="flex gap-1 px-4 border-b border-border">
            {['outstanding', 'sales', 'payment'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab === 'outstanding' && 'Outstanding Bills'}
                {tab === 'sales' && 'Sales History'}
                {tab === 'payment' && 'Payment History'}
              </button>
            ))}
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-border sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {activeTab === 'payment' ? 'Payment Date' : 'Bill #'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {activeTab === 'payment' ? 'Method' : 'Date'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {activeTab === 'payment' ? 'Amount' : 'Total'}
                </th>
                {activeTab === 'outstanding' && (
                  <>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Pending
                    </th>
                  </>
                )}
                {activeTab === 'sales' && (
                  <>
                    <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Pending
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeTab === 'outstanding' && client.outstandingBills.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                    No outstanding bills
                  </td>
                </tr>
              )}
              {activeTab === 'outstanding' && client.outstandingBills.map((bill: any, idx: number) => (
                <tr key={idx} className="hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-4 text-sm text-text-primary font-medium">
                    {bill.billNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {bill.date}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-primary font-mono">
                    {formatCurrency(bill.total)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-success font-mono">
                    {formatCurrency(bill.paid || 0)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      bill.status === 'Paid' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-danger/10 text-danger'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-danger font-mono">
                    {formatCurrency(bill.pending)}
                  </td>
                </tr>
              ))}
              
              {activeTab === 'sales' && client.salesHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">
                    No sales history
                  </td>
                </tr>
              )}
              {activeTab === 'sales' && client.salesHistory.map((sale: any, idx: number) => (
                <tr key={idx} className="hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-4 text-sm text-text-primary font-medium">
                    {sale.invoice_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {new Date(sale.created_at).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-primary font-mono">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-warning/10 text-warning">
                      Credit
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-danger font-mono">
                    {formatCurrency(sale.total_amount)}
                  </td>
                </tr>
              ))}
              
              {activeTab === 'payment' && client.paymentHistory.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-text-secondary">
                    No payment history
                  </td>
                </tr>
              )}
              {activeTab === 'payment' && client.paymentHistory.map((payment: any, idx: number) => (
                <tr key={idx} className="hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-4 text-sm text-text-primary font-medium">
                    {new Date(payment.payment_date).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary capitalize">
                    {payment.payment_method}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-success font-mono">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

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

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-warning/10 text-warning">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-warning">Confirm</h2>
              <p className="text-text-primary font-medium">{modalMessage}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] bg-surface-2 border border-border text-text-primary hover:border-primary"
              >
                Cancel
              </button>
              <button
                onClick={confirmSettleAll}
                className="flex-1 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] bg-danger text-white hover:bg-danger/90 shadow-danger/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
