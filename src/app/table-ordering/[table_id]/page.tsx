"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useOutlet } from '@/contexts/OutletContext';
import api from '@/lib/api';
import { ShoppingCart, Plus, Minus, ArrowLeft, CreditCard, ChevronRight, Image as ImageIcon, Search, Trash2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import BillReceipt from '@/components/pos/BillReceipt';
import KOTReceipt from '@/components/pos/KOTReceipt';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SuccessModal } from '@/components/ui/SuccessModal';

interface CartItem {
  id: number;
  name: string;
  selling_price: number;
  quantity: number;
  image_url?: string;
  item_type?: string;
}

export default function TablePOSPage({ params }: { params: Promise<{ table_id: string }> }) {
  const { table_id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { selectedOutlet } = useOutlet();
  const [table, setTable] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [displayCount, setDisplayCount] = useState(20);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [itemDiscounts, setItemDiscounts] = useState<Record<number, { percent: string; amount: string }>>({});
  const [overallDiscount, setOverallDiscount] = useState<string>('');
  const [showBill, setShowBill] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [showKOT, setShowKOT] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(true); // GST enabled by default
  const [gstRate, setGstRate] = useState(18); // Default GST rate
  const [cashAmount, setCashAmount] = useState<string>('');
  const [onlineAmount, setOnlineAmount] = useState<string>('');
  const [creditCustomers, setCreditCustomers] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [selectedCreditCustomer, setSelectedCreditCustomer] = useState<string>('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [kotList, setKotList] = useState<Array<{ id: number; kotNumber: string; items: any[] }>>([]);
  const [kotData, setKotData] = useState<any>(null);
  const [search, setSearch] = useState('');
  // Items highlighted until Clear cart or Pay and Print; cleared when item qty goes to 0
  const [highlightedProductIds, setHighlightedProductIds] = useState<Set<number>>(new Set());
  // Track items that have been printed in KOT (cumulative across all KOTs)
  const [printedItems, setPrintedItems] = useState<Record<number, number>>({});
  // Clear table modals
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearSuccess, setShowClearSuccess] = useState(false);
  // Track expanded KOTs in the dropdown
  const [expandedKOTs, setExpandedKOTs] = useState<Set<number>>(new Set());

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

  // Load cart from localStorage on mount and sync highlights
  useEffect(() => {
    const savedCart = localStorage.getItem(`table_${table_id}_cart`);
    const savedPrintedItems = localStorage.getItem(`table_${table_id}_printed`);
    const savedKotList = localStorage.getItem(`table_${table_id}_kots`);
    
    if (savedKotList) {
      try {
        const parsed = JSON.parse(savedKotList);
        setKotList(parsed);
      } catch (err) {
        console.error('Failed to parse KOT list:', err);
      }
    }
    
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setCart(parsed);
        setHighlightedProductIds(new Set(parsed.map((item: CartItem) => item.id)));
      } catch (err) {
        console.error('Failed to parse saved cart:', err);
      }
    }
    
    if (savedPrintedItems) {
      try {
        const parsed = JSON.parse(savedPrintedItems);
        setPrintedItems(parsed);
      } catch (err) {
        console.error('Failed to parse printed items:', err);
      }
    }
  }, [table_id]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`table_${table_id}_cart`, JSON.stringify(cart));
    } else {
      localStorage.removeItem(`table_${table_id}_cart`);
    }
  }, [cart, table_id]);

  // Clear payment amounts when payment method changes
  useEffect(() => {
    if (paymentMethod !== 'Both') {
      setCashAmount('');
      setOnlineAmount('');
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (!selectedOutlet) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch table details
        const tableRes = await api.get(`/tables/${table_id}`);
        setTable(tableRes.data);
        
        // Fetch pending KOTs for this table
        let kotRes;
        try {
          kotRes = await api.get('/kots', {
            params: { 
              table_id: table_id,
              status: 'pending'
            }
          });
        } catch (err) {
          console.error('Failed to fetch KOTs:', err);
        }
        
        // Fetch raw materials for this specific outlet only
        const rmRes = await api.get(`/raw-materials?outlet_id=${selectedOutlet.id}&limit=1000`);
        const saleItems = rmRes.data.filter((item: any) => item.for_direct_sale);
        setProducts(saleItems);
        
        // Enrich KOT items with price information from products
        if (kotRes && kotRes.data && kotRes.data.length > 0) {
          const kots = kotRes.data.map((kot: any) => ({
            id: kot.id,
            kotNumber: kot.kot_number,
            items: kot.items.map((kotItem: any) => {
              // Find the product to get price info
              const product = saleItems.find((p: any) => p.name === kotItem.name);
              return {
                id: product?.id || kotItem.id,
                name: kotItem.name,
                quantity: kotItem.quantity,
                selling_price: product?.selling_price || 0,
                subtotal: (product?.selling_price || 0) * kotItem.quantity
              };
            })
          }));
          setKotList(kots);
          localStorage.setItem(`table_${table_id}_kots`, JSON.stringify(kots));
        }
        
        // Fetch credit clients for this outlet
        try {
          const creditRes = await api.get('/credit-clients', {
            params: { outlet_id: selectedOutlet.id }
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
  }, [table_id, selectedOutlet]);

  const addToCart = (product: any) => {
    const stock = Number(product.current_stock ?? 0);
    if (stock <= 0) return;
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

  // Calculate KOT total
  const kotTotal = kotList.reduce((total, kot) => 
    total + kot.items.reduce((kotSum: number, item: any) => kotSum + (item.subtotal || 0), 0), 0
  );

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0);
  const subtotal = cartSubtotal + kotTotal;
  
  const totalDiscount = cart.reduce((acc, item) => {
    const itemDiscount = itemDiscounts[item.id];
    if (!itemDiscount) return acc;
    
    const itemSubtotal = item.selling_price * item.quantity;
    let itemDiscountAmount = 0;
    
    if (itemDiscount.percent && parseFloat(itemDiscount.percent) > 0) {
      itemDiscountAmount = (itemSubtotal * parseFloat(itemDiscount.percent)) / 100;
    }
    
    if (itemDiscount.amount && parseFloat(itemDiscount.amount) > 0) {
      itemDiscountAmount += parseFloat(itemDiscount.amount);
    }
    
    return acc + itemDiscountAmount;
  }, 0);
  
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
  };

  const handlePrintKOT = async () => {
    if (cart.length === 0) return;
    
    if (!selectedOutlet) {
      setErrorMessage("No outlet selected");
      setShowError(true);
      return;
    }
    
    try {
      // Create KOT via API with all cart items
      const kotRes = await api.post('/kots', {
        table_id: parseInt(table_id),
        outlet_id: selectedOutlet.id,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity
        })),
        notes: customerName ? `Customer: ${customerName}` : null
      });
      
      // Add KOT to the list with full item details
      const newKOT = {
        id: kotRes.data.id,
        kotNumber: kotRes.data.kot_number,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          selling_price: item.selling_price,
          subtotal: item.selling_price * item.quantity
        }))
      };
      
      const updatedKotList = [...kotList, newKOT];
      setKotList(updatedKotList);
      localStorage.setItem(`table_${table_id}_kots`, JSON.stringify(updatedKotList));
      
      // Clear cart after printing KOT (items are now in KOT)
      setCart([]);
      setHighlightedProductIds(new Set());
      localStorage.removeItem(`table_${table_id}_cart`);
      
      // Prepare KOT data for receipt
      setKotData({
        kotNumber: kotRes.data.kot_number,
        tableName: table?.name || `Table ${table_id}`,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity
        }))
      });
      
      // Refresh table data to show occupied status
      const tableRes = await api.get(`/tables/${table_id}`);
      setTable(tableRes.data);
      
      setShowKOT(true);
    } catch (err: any) {
      console.error('Failed to create KOT:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to create KOT');
      setShowError(true);
    }
  };

  const handleCancelKOT = async (kotId: number, kotIndex: number) => {
    try {
      // Delete KOT from backend
      await api.delete(`/kots/${kotId}`);
      
      // Remove KOT from the list
      const updatedKotList = kotList.filter((_, index) => index !== kotIndex);
      setKotList(updatedKotList);
      
      // Update localStorage
      if (updatedKotList.length > 0) {
        localStorage.setItem(`table_${table_id}_kots`, JSON.stringify(updatedKotList));
      } else {
        localStorage.removeItem(`table_${table_id}_kots`);
      }
      
      // Refresh table data
      const tableRes = await api.get(`/tables/${table_id}`);
      setTable(tableRes.data);
    } catch (err: any) {
      console.error('Failed to cancel KOT:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to cancel KOT');
      setShowError(true);
    }
  };

  const handleReduceKOTItem = async (kotIndex: number, itemIndex: number) => {
    const kot = kotList[kotIndex];
    const item = kot.items[itemIndex];
    
    // Reduce quantity
    const newQuantity = item.quantity - 1;
    
    if (newQuantity <= 0) {
      // Remove item from KOT
      const updatedItems = kot.items.filter((_, idx) => idx !== itemIndex);
      
      if (updatedItems.length === 0) {
        // If no items left, delete the entire KOT
        await handleCancelKOT(kot.id, kotIndex);
        return;
      }
      
      // Update KOT with remaining items
      const updatedKot = { ...kot, items: updatedItems };
      const updatedKotList = [...kotList];
      updatedKotList[kotIndex] = updatedKot;
      setKotList(updatedKotList);
      localStorage.setItem(`table_${table_id}_kots`, JSON.stringify(updatedKotList));
    } else {
      // Update item quantity
      const updatedItem = {
        ...item,
        quantity: newQuantity,
        subtotal: item.selling_price * newQuantity
      };
      
      const updatedItems = [...kot.items];
      updatedItems[itemIndex] = updatedItem;
      
      const updatedKot = { ...kot, items: updatedItems };
      const updatedKotList = [...kotList];
      updatedKotList[kotIndex] = updatedKot;
      setKotList(updatedKotList);
      localStorage.setItem(`table_${table_id}_kots`, JSON.stringify(updatedKotList));
    }
  };

  const handleClearTable = async () => {
    setShowClearConfirm(false);
    
    try {
      // Complete all pending KOTs
      for (const kot of kotList) {
        try {
          await api.patch(`/kots/${kot.id}/complete`);
        } catch (err) {
          console.error(`Failed to complete KOT ${kot.id}:`, err);
        }
      }
      
      // Refresh table data
      const tableRes = await api.get(`/tables/${table_id}`);
      setTable(tableRes.data);
      
      // Clear cart
      setCart([]);
      setHighlightedProductIds(new Set());
      setPrintedItems({});
      setKotList([]);
      localStorage.removeItem(`table_${table_id}_cart`);
      localStorage.removeItem(`table_${table_id}_printed`);
      localStorage.removeItem(`table_${table_id}_kots`);
      
      setShowClearSuccess(true);
    } catch (err: any) {
      console.error('Failed to clear table:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to clear table');
      setShowError(true);
    }
  };

  const handleCheckout = async () => {
    // Allow checkout if there are KOTs or items in cart
    if (cart.length === 0 && kotList.length === 0) return;
    
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
          outlet_id: selectedOutlet?.id
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
      }
    }
    
    setSubmitting(true);
    try {
      if (!selectedOutlet) {
        setErrorMessage("No outlet selected");
        setShowError(true);
        return;
      }

      // Aggregate all items from KOTs and current cart
      const allItemsMap = new Map<number, CartItem>();
      
      // Add items from all KOTs
      kotList.forEach(kot => {
        kot.items.forEach((kotItem: any) => {
          // Find the product in cart or products to get price and ID
          const product = cart.find(c => c.name === kotItem.name) || 
                         products.find((p: any) => p.name === kotItem.name);
          
          if (product) {
            const existing = allItemsMap.get(product.id);
            if (existing) {
              existing.quantity += kotItem.quantity;
            } else {
              allItemsMap.set(product.id, {
                id: product.id,
                name: kotItem.name,
                selling_price: product.selling_price,
                quantity: kotItem.quantity
              });
            }
          }
        });
      });
      
      // Add current cart items
      cart.forEach(item => {
        const existing = allItemsMap.get(item.id);
        if (existing) {
          existing.quantity = item.quantity; // Use cart quantity as it's the latest
        } else {
          allItemsMap.set(item.id, { ...item });
        }
      });
      
      const allItems = Array.from(allItemsMap.values());
      
      // Calculate totals for all items
      const allItemsSubtotal = allItems.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0);
      const allItemsTotal = Math.max(0, allItemsSubtotal - discount + gstAmount);

      const res = await api.post('/raw-material-sales', {
        outlet_id: selectedOutlet.id,
        items: allItems.map(item => ({
          raw_material_id: item.id,
          quantity: item.quantity,
          unit_price: item.selling_price,
          subtotal: item.selling_price * item.quantity
        })),
        customer_name: customerName || table?.name || null,
        customer_contact: customerPhone || null,
        subtotal: allItemsSubtotal,
        discount: discount,
        total_amount: allItemsTotal,
        payment_method: paymentMethod.toLowerCase(),
        sale_date: new Date().toISOString().split('T')[0]
      });
      
      // Prepare bill data with all items
      const now = new Date();
      setBillData({
        invoiceNumber: res.data.invoice_number,
        tableName: table?.name,
        items: allItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.selling_price,
          subtotal: item.selling_price * item.quantity
        })),
        subtotal: allItemsSubtotal,
        discount: discount,
        gstAmount: gstAmount,
        gstRate: gstRate,
        total: allItemsTotal,
        paymentMethod: paymentMethod,
        date: now.toLocaleDateString('en-IN'),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        gstEnabled: gstEnabled
      });
      
      // Complete all KOTs (marks table as available)
      for (const kot of kotList) {
        try {
          await api.patch(`/kots/${kot.id}/complete`);
        } catch (err) {
          console.error(`Failed to complete KOT ${kot.id}:`, err);
        }
      }
      
      // Refresh table data to show available status
      try {
        const tableRes = await api.get(`/tables/${table_id}`);
        setTable(tableRes.data);
      } catch (err) {
        console.error('Failed to refresh table:', err);
      }
      
      // Clear cart, highlights and localStorage
      setCart([]);
      setHighlightedProductIds(new Set());
      setPrintedItems({});
      setKotList([]);
      localStorage.removeItem(`table_${table_id}_cart`);
      localStorage.removeItem(`table_${table_id}_printed`);
      localStorage.removeItem(`table_${table_id}_kots`);
      setCustomerName('');
      setCustomerPhone('');
      setOverallDiscount('');
      setItemDiscounts({});
      setCashAmount('');
      setOnlineAmount('');
      setSelectedCreditCustomer('');
      setShowBill(true);
    } catch (err: any) {
      console.error('Checkout error:', err);
      const errorDetail = err.response?.data?.detail;
      let errorMessage = 'Checkout failed';

      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (Array.isArray(errorDetail)) {
        errorMessage = errorDetail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join('\n');
      } else if (typeof errorDetail === 'object') {
        errorMessage = JSON.stringify(errorDetail);
      }

      // Log full error for debugging
      console.error('Full error:', err);
      console.error('Error response:', err.response);
      
      setErrorMessage(errorMessage);
      setShowError(true);
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

  const displayedProducts = filteredProducts.slice(0, displayCount);
  const hasMore = displayedProducts.length < filteredProducts.length;

  const loadMore = () => {
    setDisplayCount(prev => prev + 20);
  };

  useEffect(() => {
    setDisplayCount(20);
  }, [activeTab, search]);

  return (
    <div className="h-screen flex animate-in fade-in duration-500">
      {/* Product Selection Section */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-surface-2 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} className="text-text-primary" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                  {table?.name || 'Loading...'}
                </h1>
                <p className="text-sm text-text-secondary">
                  {table ? (
                    <>Capacity: {table.capacity} | Status: <span className="capitalize">{table.status}</span></>
                  ) : (
                    'Loading table details...'
                  )}
                </p>
              </div>
            </div>
            
            {/* Clear Table Button - Only show if table is occupied */}
            {table?.status === 'occupied' && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 bg-danger text-white text-sm font-medium rounded-lg hover:bg-danger/90 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Table
              </button>
            )}
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
                  const lowStock = !noStock && Boolean(p.is_low_stock);
                  return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => !noStock && addToCart(p)}
                    disabled={noStock}
                    className={cn(
                      "group flex flex-col p-2 rounded-lg hover:shadow-lg transition-all text-left relative overflow-hidden active:scale-95",
                      isHighlighted
                        ? "bg-primary/15 border-2 border-primary shadow-md shadow-primary/20"
                        : "bg-surface border border-border hover:border-primary",
                      noStock && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {/* No Stock / Low Stock badge */}
                    {(noStock || lowStock) && (
                      <div className="absolute top-1.5 right-1.5 z-10">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          noStock ? "bg-danger/90 text-white" : "bg-warning/90 text-white"
                        )}>
                          {noStock ? "No Stock" : "Low Stock"}
                        </span>
                      </div>
                    )}
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

                    <div className="w-full aspect-square rounded-lg bg-surface-2 mb-2 overflow-hidden flex items-center justify-center border border-border relative">
                      <img 
                        src={p.image_url ? `http://localhost:8000${p.image_url}` : '/images/default_product.png'} 
                        alt={p.name} 
                        className={cn("w-full h-full object-cover transition-transform duration-500", !noStock && "group-hover:scale-105")}
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

      {/* Current Order Section */}
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

        {/* KOT History Section */}
        {kotList.length > 0 && (
          <div className="border-b border-border bg-warning/5">
            <div className="px-6 py-3">
              <p className="text-xs font-bold text-text-secondary mb-2">KOT HISTORY</p>
              <div className="space-y-1">
                {kotList.map((kot, index) => {
                  const isExpanded = expandedKOTs.has(index);
                  
                  return (
                    <div key={kot.id} className="border border-border rounded-lg bg-background">
                      <div className="w-full flex items-center gap-2 px-3 py-2">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedKOTs);
                            if (isExpanded) {
                              newExpanded.delete(index);
                            } else {
                              newExpanded.add(index);
                            }
                            setExpandedKOTs(newExpanded);
                          }}
                          className="flex items-center gap-2 flex-1 hover:bg-surface-2 transition-colors rounded"
                        >
                          <ChevronRight size={14} className={cn("transition-transform text-text-secondary", isExpanded && "rotate-90")} />
                          <span className="text-xs font-semibold text-text-primary flex-1 text-left">
                            KOT {index + 1}
                          </span>
                          <span className="text-xs text-text-secondary">
                            ₹{kot.items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0)}
                          </span>
                        </button>
                        <button
                          onClick={() => handleCancelKOT(kot.id, index)}
                          className="p-1.5 hover:bg-danger/10 hover:text-danger transition-colors rounded"
                          title="Cancel KOT"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-3 pb-2 space-y-1 border-t border-border/50">
                          <p className="text-[10px] text-text-muted pt-2">{kot.kotNumber}</p>
                          {kot.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between py-2 border-b border-border/30 last:border-b-0">
                              <div className="flex-1">
                                <p className="text-xs font-medium text-text-primary">{item.name}</p>
                                <p className="text-[10px] text-text-muted">₹{item.selling_price} × {item.quantity}</p>
                              </div>
                              <button
                                onClick={() => handleReduceKOTItem(index, idx)}
                                className="p-1 hover:bg-danger/10 hover:text-danger transition-colors rounded mr-2"
                                title="Reduce quantity"
                              >
                                <Minus size={12} />
                              </button>
                              <div className="text-right">
                                <p className="text-xs font-bold text-text-primary">₹{item.subtotal}</p>
                                <p className="text-[10px] text-text-muted">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-border/50">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-text-primary">KOT Total:</span>
                              <span className="text-sm font-bold text-text-primary">
                                ₹{kot.items.reduce((sum: number, item: any) => sum + item.subtotal, 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

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

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* KOT Button */}
            <button
              disabled={cart.length === 0}
              onClick={handlePrintKOT}
              className="py-2.5 bg-warning text-white text-sm font-medium rounded-lg shadow-md hover:bg-warning/90 disabled:grayscale active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              KOT
            </button>

            {/* Bill Button - Enabled if cart has items OR if there are KOTs */}
            <button
              disabled={(cart.length === 0 && kotList.length === 0) || submitting}
              onClick={handleCheckout}
              className="py-2.5 bg-primary text-white text-sm font-medium rounded-lg shadow-md shadow-primary-muted hover:bg-primary-hover disabled:grayscale active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Bill
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bill Receipt Modal */}
      {showBill && billData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface rounded-2xl shadow-2xl border border-border p-8 space-y-6">
            <div className="text-center space-y-2 mb-4">
              <h2 className="text-2xl font-bold text-text-primary">Bill Generated</h2>
              <p className="text-text-secondary text-sm">Invoice: {billData.invoiceNumber}</p>
              <p className="text-text-secondary text-sm">Table: {billData.tableName}</p>
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
                  router.back();
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
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
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

      {/* KOT Receipt Modal */}
      {/* KOT Receipt Modal */}
      {showKOT && kotData && (
        <KOTReceipt
          tableName={kotData.tableName}
          kotNumber={kotData.kotNumber}
          items={kotData.items}
          onClose={() => setShowKOT(false)}
        />
      )}

      {/* Clear Table Confirm Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear Table"
        message="Are you sure you want to clear this table? This will complete any pending KOTs and mark the table as available."
        onConfirm={handleClearTable}
        onClose={() => setShowClearConfirm(false)}
        confirmText="Clear Table"
        type="warning"
      />

      {/* Clear Table Success Modal */}
      <SuccessModal
        isOpen={showClearSuccess}
        title="Success"
        message="Table cleared successfully!"
        onClose={() => setShowClearSuccess(false)}
      />
    </div>
  );
}
