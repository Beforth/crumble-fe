"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, ChevronRight, Image as ImageIcon, Search } from 'lucide-react';
import { cn, formatCurrency, formatQty } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOutlet } from '@/contexts/OutletContext';
import BillReceipt from '@/components/pos/BillReceipt';

export default function POSTerminalPage({ params }: { params: Promise<{ outlet_id: string }> }) {
  const { outlet_id } = use(params);
  const { user } = useAuth();
  const { selectedOutlet, outlets } = useOutlet();
  // Title and data are for the outlet in the URL (this outlet's POS), not "All"
  const posOutletId = parseInt(outlet_id, 10);
  const posOutlet = !isNaN(posOutletId) ? outlets.find((o) => o.id === posOutletId) : null;
  const posTitleName = posOutlet?.name ?? selectedOutlet?.name ?? '';
  const [products, setProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [checkoutResult, setCheckoutResult] = useState<{ success: boolean; message: string; invoice?: string } | null>(null);
  const [displayCount, setDisplayCount] = useState(20);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [itemDiscounts, setItemDiscounts] = useState<Record<number, { percent: string; amount: string }>>({});
  const [overallDiscount, setOverallDiscount] = useState<string>('');
  const [showBill, setShowBill] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [gstEnabled, setGstEnabled] = useState(true); // GST enabled by default
  const [gstRate, setGstRate] = useState(18); // Default GST rate
  const [cashAmount, setCashAmount] = useState<string>('');
  const [onlineAmount, setOnlineAmount] = useState<string>('');
  const [creditCustomers, setCreditCustomers] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [selectedCreditCustomer, setSelectedCreditCustomer] = useState<string>('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Items highlighted until Pay and Print (cleared only on successful checkout)
  const [highlightedProductIds, setHighlightedProductIds] = useState<Set<number>>(new Set());
  const router = useRouter();

  // Get unique categories from products
  const categories = ['All', ...Array.from(new Set(products.map((p: any) => p.supplier_name || 'General')))];

  // Fetch GST rate from settings
  useEffect(() => {
    const fetchGstRate = async () => {
      try {
        const response = await api.get('/settings/gst-rate');
        setGstRate(response.data.gst_rate || 18);
      } catch (err) {
        console.error('Failed to fetch GST rate:', err);
        // Keep default rate of 18%
      }
    };
    fetchGstRate();
  }, []);

  useEffect(() => {
    const id = parseInt(outlet_id);
    if (isNaN(id)) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch raw materials for this specific outlet only — show all for_direct_sale (including no stock)
        const rmRes = await api.get(`/raw-materials?outlet_id=${id}&limit=1000`);
        const saleItems = rmRes.data.filter((item: any) => item.for_direct_sale);
        setRawMaterials(saleItems);
        setProducts(saleItems); // Use raw materials as products
        
        // Fetch credit clients for this outlet
        try {
          const creditRes = await api.get('/credit-clients', {
            params: { outlet_id: id }
          });
          const clients = creditRes.data.map((client: any) => ({
            id: client.id.toString(),
            name: client.name,
            phone: client.phone
          }));
          setCreditCustomers(clients);
        } catch (err) {
          console.error('Failed to fetch credit clients:', err);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [outlet_id]);

  // Clear payment amounts when payment method changes
  useEffect(() => {
    if (paymentMethod !== 'Both') {
      setCashAmount('');
      setOnlineAmount('');
    }
  }, [paymentMethod]);

  const addToCart = (product: any) => {
    const stock = Number(product.current_stock ?? 0);
    if (stock <= 0) return; // Do not add if no stock
    setHighlightedProductIds(prev => new Set(prev).add(product.id));
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => {
      const next = prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
      // If this item was removed (qty 0), clear its highlight
      const itemRemoved = prev.some(item => item.id === id) && !next.some(item => item.id === id);
      if (itemRemoved) {
        setHighlightedProductIds(prevIds => {
          const nextIds = new Set(prevIds);
          nextIds.delete(id);
          return nextIds;
        });
      }
      return next;
    });
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0);
  
  // Calculate total discount from all items
  const totalDiscount = cart.reduce((acc, item) => {
    const itemDiscount = itemDiscounts[item.id];
    if (!itemDiscount) return acc;
    
    const itemSubtotal = item.selling_price * item.quantity;
    let itemDiscountAmount = 0;
    
    // Calculate discount from percentage
    if (itemDiscount.percent && parseFloat(itemDiscount.percent) > 0) {
      itemDiscountAmount = (itemSubtotal * parseFloat(itemDiscount.percent)) / 100;
    }
    
    // Add discount from amount (rupees)
    if (itemDiscount.amount && parseFloat(itemDiscount.amount) > 0) {
      itemDiscountAmount += parseFloat(itemDiscount.amount);
    }
    
    return acc + itemDiscountAmount;
  }, 0);
  
  // Add overall discount to total discount
  const overallDiscountAmount = overallDiscount && parseFloat(overallDiscount) > 0 ? parseFloat(overallDiscount) : 0;
  const discount = totalDiscount + overallDiscountAmount;
  
  // Calculate GST if enabled (calculated on gross subtotal)
  const gstAmount = gstEnabled ? (subtotal * gstRate / 100) : 0;
  // Total is subtotal + gst - discount
  const total = Math.max(0, subtotal + gstAmount - discount);

  const handleAddCreditCustomer = () => {
    // Validate name and phone
    if (!customerName.trim()) {
      setErrorMessage('Please enter customer name');
      setShowError(true);
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('Please enter customer phone number');
      setShowError(true);
      return;
    }

    // Add customer to the list
    const newCustomer = {
      id: `customer_${Date.now()}`,
      name: customerName,
      phone: customerPhone
    };
    setCreditCustomers([...creditCustomers, newCustomer]);
    setSelectedCreditCustomer(newCustomer.id);
    
    // Keep the fields filled (don't clear them)
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Validate credit payment
    if (paymentMethod === 'Credit') {
      if (!customerName.trim() || !customerPhone.trim()) {
        setErrorMessage('Please enter customer name and phone for credit transactions');
        setShowError(true);
        return;
      }
      
      // Auto-create credit client if it doesn't exist
      try {
        const creditClientRes = await api.post('/credit-clients', {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          outlet_id: parseInt(outlet_id)
        });
        
        // Add to dropdown if it's a new client
        const newClientId = creditClientRes.data.id.toString();
        const existingClient = creditCustomers.find(c => c.id === newClientId);
        if (!existingClient) {
          const newClient = {
            id: newClientId,
            name: creditClientRes.data.name,
            phone: creditClientRes.data.phone
          };
          setCreditCustomers([...creditCustomers, newClient]);
          setSelectedCreditCustomer(newClientId);
        }
      } catch (err) {
        console.error('Failed to create credit client:', err);
        // Continue with checkout even if credit client creation fails
      }
    }
    
    setSubmitting(true);
    try {
      const numericOutletId = parseInt(outlet_id);
      if (isNaN(numericOutletId)) {
        alert("Invalid Outlet ID");
        setSubmitting(false);
        return;
      }

      const res = await api.post('/raw-material-sales', {
        outlet_id: numericOutletId,
        items: cart.map(item => ({
          raw_material_id: item.id,
          quantity: item.quantity,
          unit_price: item.selling_price,
          subtotal: item.selling_price * item.quantity
        })),
        customer_name: customerName || null,
        customer_contact: customerPhone || null,
        subtotal: subtotal,
        discount: discount,
        total_amount: total,
        payment_method: paymentMethod.toLowerCase(),
        sale_date: new Date().toISOString().split('T')[0]
      });
      
      // Prepare bill data
      const now = new Date();
      setBillData({
        invoiceNumber: res.data.invoice_number,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.selling_price,
          subtotal: item.selling_price * item.quantity
        })),
        subtotal: subtotal,
        discount: discount,
        gstAmount: gstAmount,
        gstRate: gstRate,
        total: total,
        paymentMethod: paymentMethod,
        date: now.toLocaleDateString('en-IN'),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        gstEnabled: gstEnabled
      });
      
      // Clear cart and highlights only when Pay and Print succeeds
      setCart([]);
      setHighlightedProductIds(new Set());
      setCustomerName('');
      setCustomerPhone('');
      setOverallDiscount('');
      setItemDiscounts({});
      setCashAmount('');
      setOnlineAmount('');
      setSelectedCreditCustomer('');
      setShowBill(true);
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      let errorMessage = 'Checkout failed';

      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (Array.isArray(errorDetail)) {
        errorMessage = errorDetail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join('\n');
      } else if (typeof errorDetail === 'object') {
        errorMessage = JSON.stringify(errorDetail);
      }

      setCheckoutResult({ success: false, message: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const category = p.supplier_name || 'General';
    const matchesTab = activeTab === 'All' || category === activeTab;
    return matchesSearch && matchesTab;
  });

  // Get products to display based on displayCount
  const displayedProducts = filteredProducts.slice(0, displayCount);
  const hasMore = displayedProducts.length < filteredProducts.length;

  const loadMore = () => {
    setDisplayCount(prev => prev + 20);
  };

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(20);
  }, [activeTab, search]);

  return (
    <div className="h-screen flex animate-in fade-in duration-500">
      {/* Product Selection Section */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Point of Sale{posTitleName ? ` - ${posTitleName}` : ''}
            </h1>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab
                    ? "bg-primary text-white shadow-lg"
                    : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-primary/50"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                <div key={i} className="aspect-square bg-surface border border-border rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {displayedProducts.map((p: any) => {
                  const inCart = cart.some((item) => item.id === p.id);
                  const cartQty = cart.find((item) => item.id === p.id)?.quantity ?? 0;
                  const isHighlighted = highlightedProductIds.has(p.id);
                  const noStock = Number(p.current_stock ?? 0) <= 0;
                  const canBeMade = Number(p.can_be_made ?? 0) > 0;
                  const lowStock = !noStock && Boolean(p.is_low_stock);
                  return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => !noStock && addToCart(p)}
                    disabled={noStock}
                    className={cn(
                      "group flex flex-col p-2 rounded-lg transition-all text-left relative overflow-hidden",
                      noStock && "opacity-60 cursor-not-allowed",
                      !noStock && "hover:shadow-lg active:scale-95 hover:border-primary",
                      isHighlighted && !noStock
                        ? "bg-primary/15 border-2 border-primary shadow-md shadow-primary/20"
                        : "bg-surface border border-border"
                    )}
                  >
                    {/* Veg/Non-Veg indicator */}
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center",
                        p.item_type === 'non_veg' ? "border-red-600" : "border-green-600"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          p.item_type === 'non_veg' ? "bg-red-600" : "bg-green-600"
                        )} />
                      </div>
                    </div>

                    {/* Stock badges: No Stock, and optionally Can be made when materials available */}
                    {noStock && (
                      <div className="absolute top-1.5 right-1.5 z-10 flex flex-col gap-1 items-end">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase tracking-wide">
                          No Stock
                        </span>
                        {canBeMade && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600/95 text-white uppercase tracking-wide shadow-sm">
                            Can be made
                          </span>
                        )}
                      </div>
                    )}
                    {lowStock && (
                      <div className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold bg-warning/90 text-white uppercase tracking-wide">
                        Low Stock
                      </div>
                    )}

                    <div className="w-full aspect-square rounded-lg bg-surface-2 mb-2 overflow-hidden flex items-center justify-center border border-border relative">
                      <img 
                        src={p.image_url ? `http://localhost:8000${p.image_url}` : '/images/default_product.png'} 
                        alt={p.name} 
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-500",
                          !noStock && "group-hover:scale-105"
                        )}
                        onError={(e) => {
                          e.currentTarget.src = '/images/default_product.png';
                        }}
                      />
                    </div>
                    
                    <h3 className="text-xs font-bold text-text-primary line-clamp-2 mb-1">{p.name}</h3>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-bold text-primary">{formatCurrency(p.selling_price)}</p>
                      {inCart && (
                        <span className="text-xs font-bold bg-primary text-white px-1.5 py-0.5 rounded min-w-[20px] text-center">
                          {cartQty}
                        </span>
                      )}
                    </div>
                  </button>
                  );
                })}
              </div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={loadMore}
                    className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-lg"
                  >
                    Load More ({filteredProducts.length - displayedProducts.length} more items)
                  </button>
                </div>
              )}
              
              {/* No products message */}
              {displayedProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <ImageIcon size={48} className="text-text-muted mb-4" />
                  <p className="text-text-secondary">No products available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current Order Section - Full Height Panel */}
      <div className="w-96 flex flex-col bg-surface border-l border-border shrink-0">
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">Current Order</h2>
          <button
            onClick={() => {
              setCart([]);
              setHighlightedProductIds(new Set());
            }}
            disabled={cart.length === 0}
            className="text-xs text-danger hover:text-danger/80 font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
              <ShoppingCart size={48} className="text-text-muted" />
              <p className="text-sm italic">Cart is empty. Tap products to add.</p>
            </div>
          ) : cart.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const discount = itemDiscounts[item.id] || { percent: '', amount: '' };
            
            return (
              <div key={item.id} className="border-b border-border">
                <div className="flex items-center gap-3 py-2">
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedItems);
                      if (isExpanded) {
                        newExpanded.delete(item.id);
                      } else {
                        newExpanded.add(item.id);
                      }
                      setExpandedItems(newExpanded);
                    }}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <ChevronRight size={16} className={cn("transition-transform", isExpanded && "rotate-90")} />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{item.name}</p>
                    <p className="text-xs text-primary font-mono">{formatCurrency(item.selling_price)}</p>
                  </div>
                  
                  <div className="flex items-center bg-surface-2 rounded-lg border border-border p-1">
                    <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:text-danger transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-xs font-bold font-mono">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:text-success transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <div className="text-right min-w-[60px]">
                    <p className="text-xs font-bold text-text-primary">{formatCurrency(item.selling_price * item.quantity)}</p>
                  </div>
                </div>
                
                {/* Discount Fields - Shown when expanded */}
                {isExpanded && (
                  <div className="pl-8 pr-4 pb-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-secondary mb-1 block">Discount %</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={discount.percent}
                        onChange={(e) => setItemDiscounts({
                          ...itemDiscounts,
                          [item.id]: { ...discount, percent: e.target.value }
                        })}
                        className="w-full px-2 py-1.5 text-xs bg-surface-2 border border-border rounded text-text-primary focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary mb-1 block">Discount ₹</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={discount.amount}
                        onChange={(e) => setItemDiscounts({
                          ...itemDiscounts,
                          [item.id]: { ...discount, amount: e.target.value }
                        })}
                        className="w-full px-2 py-1.5 text-xs bg-surface-2 border border-border rounded text-text-primary focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Customer Details & Checkout */}
        <div className="p-6 border-t border-border space-y-4">
          {/* Customer Details */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-text-primary">Customer Details</p>
            
            {/* Credit Customer Selection - Only show when "Credit" is selected */}
            {paymentMethod === 'Credit' && (
              <div className="space-y-1 mb-2">
                <label className="text-xs text-text-secondary">Select Credit Customer</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedCreditCustomer}
                    onChange={(e) => {
                      const customerId = e.target.value;
                      setSelectedCreditCustomer(customerId);
                      // Auto-populate customer name and phone when selected
                      if (customerId) {
                        const customer = creditCustomers.find(c => c.id === customerId);
                        if (customer) {
                          setCustomerName(customer.name);
                          setCustomerPhone(customer.phone);
                        }
                      }
                    }}
                    className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-xs text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
                  >
                    <option value="">Select customer</option>
                    {creditCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={handleAddCreditCustomer}
                    className="px-2 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-primary-hover transition-colors flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="px-2 py-1.5 bg-background border border-border rounded text-xs text-text-primary focus:border-primary focus:outline-none transition-colors"
              />
              <input
                type="text"
                placeholder="Phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="px-2 py-1.5 bg-background border border-border rounded text-xs text-text-primary focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            
            {/* Print Options Dropdown - COMMENTED OUT */}
            {/* <div className="space-y-2">
              <select
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors appearance-none"
                defaultValue="Microsoft Print to PDF"
              >
                <option value="OneNote for Windows 10">OneNote for Windows 10</option>
                <option value="OneNote">OneNote</option>
                <option value="Microsoft XPS Document Writer">Microsoft XPS Document Writer</option>
                <option value="Microsoft Print to PDF">Microsoft Print to PDF</option>
                <option value="Fax">Fax</option>
              </select>
            </div> */}
            
            {/* GST Checkbox and Overall Discount */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gst"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="gst" className="text-xs text-text-secondary">GST</label>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-text-secondary">Overall Discount (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(e.target.value)}
                  className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs text-text-primary focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {['Cash', 'Online', 'Both', 'Credit'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                    paymentMethod === method
                      ? "bg-primary text-white"
                      : "bg-background border border-border text-text-muted hover:border-primary/50"
                  )}
                >
                  {method}
                </button>
              ))}
            </div>
            
            {/* Payment Amount Fields - Only show when "Both" is selected */}
            {paymentMethod === 'Both' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Cash</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashAmount}
                    onChange={(e) => {
                      const cash = e.target.value;
                      setCashAmount(cash);
                      // Auto-calculate online amount
                      if (cash && parseFloat(cash) >= 0) {
                        const remaining = Math.max(0, total - parseFloat(cash));
                        setOnlineAmount(remaining.toFixed(2));
                      } else {
                        setOnlineAmount('');
                      }
                    }}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs text-text-primary focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Online</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={onlineAmount}
                    onChange={(e) => {
                      const online = e.target.value;
                      setOnlineAmount(online);
                      // Auto-calculate cash amount
                      if (online && parseFloat(online) >= 0) {
                        const remaining = Math.max(0, total - parseFloat(online));
                        setCashAmount(remaining.toFixed(2));
                      } else {
                        setCashAmount('');
                      }
                    }}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs text-text-primary focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Subtotal</span>
              <span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
            {gstEnabled && (
              <div className="flex justify-between text-sm text-text-secondary">
                <span>GST ({gstRate}%)</span>
                <span className="font-mono">₹{gstAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Discount</span>
              <span className="font-mono">₹{discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-text-primary pt-2 border-t border-border/50">
              <span>Total</span>
              <span className="text-primary font-mono">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Pay & Print Button */}
          <button
            disabled={cart.length === 0 || submitting}
            onClick={handleCheckout}
            className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-lg shadow-md shadow-primary-muted hover:bg-primary-hover disabled:grayscale active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <CreditCard size={16} />
                PAY & PRINT
              </>
            )}
          </button>
        </div>
      </div>

      {/* COMMENTED OUT - All Modal Components */}
      {/* Checkout Status Modal */}
      {checkoutResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8 text-center space-y-6">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
              checkoutResult.success ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            )}>
              {checkoutResult.success ? <ShoppingCart size={40} /> : <Trash2 size={40} />}
            </div>

            <div className="space-y-2">
              <h2 className={cn("text-2xl font-bold", checkoutResult.success ? "text-success" : "text-danger")}>
                {checkoutResult.success ? "Success!" : "Failed"}
              </h2>
              <p className="text-text-primary font-medium">{checkoutResult.message}</p>
              {checkoutResult.invoice && (
                <div className="bg-surface-2 p-3 rounded-xl border border-border mt-4">
                  <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Invoice Number</p>
                  <p className="text-lg font-mono font-bold text-primary">{checkoutResult.invoice}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setCheckoutResult(null)}
              className={cn(
                "w-full py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98]",
                checkoutResult.success
                  ? "bg-success text-white hover:bg-success/90 shadow-success/20"
                  : "bg-danger text-white hover:bg-danger/90 shadow-danger/20"
              )}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* COMMENTED OUT - Outlet Selection Modal and other complex features */}
      {/* {showOutletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl border border-border p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-text-primary">Select Outlet</h2>
              <p className="text-text-secondary text-sm">Please choose an outlet to continue terminal operations.</p>
            </div>
            // ... outlet selection content
          </div>
        </div>
      )} */}

      {/* Bill Receipt Modal */}
      {showBill && billData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface rounded-2xl shadow-2xl border border-border p-8 space-y-6">
            <div className="text-center space-y-2 mb-4">
              <h2 className="text-2xl font-bold text-text-primary">Bill Generated</h2>
              <p className="text-text-secondary text-sm">Invoice: {billData.invoiceNumber}</p>
            </div>

            <div className="flex justify-center">
              <BillReceipt {...billData} />
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-lg"
              >
                🖨 Print Bill
              </button>
              <button
                onClick={() => {
                  setShowBill(false);
                  setBillData(null);
                }}
                className="px-6 py-3 bg-surface-2 border border-border text-text-primary font-medium rounded-lg hover:border-primary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-danger/10 text-danger">
              <Trash2 size={40} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-danger">Error</h2>
              <p className="text-text-primary font-medium">{errorMessage}</p>
            </div>

            <button
              onClick={() => setShowError(false)}
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
