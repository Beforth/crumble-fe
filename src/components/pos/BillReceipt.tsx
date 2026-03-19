"use client";

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

interface BillReceiptProps {
  invoiceNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  date: string;
  time: string;
  gstEnabled?: boolean;
  /** GST amount from checkout cart (so bill matches cart) */
  gstAmount?: number;
  /** GST rate % from settings (for display) */
  gstRate?: number;
}

export default function BillReceipt({
  invoiceNumber,
  items,
  subtotal,
  discount,
  total,
  paymentMethod,
  date,
  time,
  gstEnabled = false,
  gstAmount: gstAmountFromCart,
  gstRate: gstRateFromCart
}: BillReceiptProps) {
  
  const [settings, setSettings] = useState({
    shop_name: 'CRUMBLE BAKERY',
    address: 'Your Bakery Address',
    phone: '+91 XXXXX XXXXX',
    gst_number: 'XXXXXXXXXXXX',
    enable_gst: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings/general');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Use GST and total from checkout cart so bill matches cart (POS and Table POS both pass these)
  const showGst = gstEnabled || settings.enable_gst;
  const gstAmount = showGst && (gstAmountFromCart !== undefined && gstAmountFromCart !== null)
    ? Number(gstAmountFromCart)
    : 0;
  const finalTotal = Number(total);

  return (
    <div className="receipt-wrapper" id="receipt-to-print" style={{ 
      width: '226px',
      background: '#fafaf8',
      color: '#1a1a1a',
      padding: '14px 12px',
      fontFamily: 'monospace',
      fontSize: '8px',
      position: 'relative'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: 60mm auto;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          body * {
            visibility: hidden;
          }
          
          #receipt-to-print,
          #receipt-to-print * {
            visibility: visible !important;
          }
          
          #receipt-to-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 60mm !important;
            max-width: 60mm !important;
            margin: 0 !important;
            padding: 3mm !important;
            background: white !important;
          }
        }
      `}} />

      {/* Header */}
      <div style={{ textAlign: 'center', paddingBottom: '10px', borderBottom: '1px dashed #d0cec8', marginBottom: '10px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: '1.2' }}>
          {settings.shop_name || 'CRUMBLE BAKERY'}
        </div>
        <div style={{ fontSize: '7px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555', marginTop: '2px' }}>
          FRESH BAKED DAILY
        </div>
        <div style={{ marginTop: '6px', fontSize: '7.5px', color: '#555', lineHeight: '1.7' }}>
          {settings.address || 'Your Bakery Address'}<br/>
          Tel: {settings.phone || '+91 XXXXX XXXXX'}<br/>
          {settings.gst_number && `GST: ${settings.gst_number}`}
        </div>
      </div>

      {/* Bill Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5px', color: '#555', marginBottom: '8px', lineHeight: '1.7' }}>
        <div>
          <div><span style={{ color: '#999' }}>BILL# </span>{invoiceNumber}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>{date}</div>
          <div>{time}</div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #d0cec8', margin: '8px 0' }} />

      {/* Table Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 42px 42px', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: '4px', gap: '2px' }}>
        <span>Item</span>
        <span style={{ textAlign: 'right' }}>Qty</span>
        <span style={{ textAlign: 'right' }}>Rate</span>
        <span style={{ textAlign: 'right' }}>Amt</span>
      </div>

      <hr style={{ border: 'none', borderTop: '1px dashed #d0cec8', margin: '8px 0' }} />

      {/* Items */}
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 28px 42px 42px', fontSize: '8px', lineHeight: '1.5', gap: '2px', padding: '2px 0' }}>
          <span style={{ color: '#1a1a1a', fontWeight: '500' }}>{item.name}</span>
          <span style={{ textAlign: 'right', color: '#555' }}>{Number(item.quantity)}</span>
          <span style={{ textAlign: 'right', color: '#555' }}>{Number(item.unit_price).toFixed(2)}</span>
          <span style={{ textAlign: 'right', color: '#1a1a1a' }}>{Number(item.subtotal).toFixed(2)}</span>
        </div>
      ))}

      <hr style={{ border: 'none', borderTop: '1px dashed #d0cec8', margin: '8px 0' }} />

      {/* Summary */}
      <div style={{ fontSize: '8px', color: '#555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 0' }}>
          <span>Subtotal</span>
          <span>₹{Number(subtotal).toFixed(2)}</span>
        </div>
        {Number(discount) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 0', color: '#c0392b' }}>
            <span>Discount</span>
            <span>-₹{Number(discount).toFixed(2)}</span>
          </div>
        )}
        {showGst && Number(gstAmount) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 0', color: '#999' }}>
            <span>{gstRateFromCart != null ? `GST (${gstRateFromCart}%)` : 'GST'}</span>
            <span>₹{Number(gstAmount).toFixed(2)}</span>
          </div>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #d0cec8', margin: '8px 0' }} />

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: '#1a1a1a', padding: '5px 0 3px' }}>
        <span>TOTAL</span>
        <span>₹{Number(finalTotal).toFixed(2)}</span>
      </div>

      <hr style={{ border: 'none', borderTop: '1px dashed #d0cec8', margin: '8px 0' }} />

      {/* Payment */}
      <div style={{ marginTop: '2px', fontSize: '7.5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', padding: '1px 0' }}>
          <span>Payment</span>
          <span>{paymentMethod}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #d0cec8' }}>
        <div style={{ fontSize: '8px', color: '#999', letterSpacing: '3px', margin: '4px 0 2px' }}>* * * * *</div>
        <div style={{ fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1a1a1a', marginBottom: '4px' }}>
          Thank You!
        </div>
        <div style={{ fontSize: '7px', color: '#999', lineHeight: '1.6' }}>
          Please visit again<br/>
          www.crumblebakery.com
        </div>
        <div style={{ fontSize: '8px', color: '#999', letterSpacing: '3px', margin: '4px 0 2px' }}>* * * * *</div>
      </div>
    </div>
  );
}
