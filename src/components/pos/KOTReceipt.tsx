"use client";

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

interface KOTReceiptProps {
  tableName: string;
  kotNumber?: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  onClose: () => void;
}

export default function KOTReceipt({ tableName, kotNumber, items, onClose }: KOTReceiptProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  const now = new Date();
  const displayKotNumber = kotNumber || `KOT-${now.getTime().toString().slice(-6)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl p-6">
        <div ref={componentRef} id="kot-receipt-to-print" style={{ 
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
              
              #kot-receipt-to-print,
              #kot-receipt-to-print * {
                visibility: visible !important;
              }
              
              #kot-receipt-to-print {
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
          <div style={{ textAlign: 'center', paddingBottom: '10px', borderBottom: '2px solid #1a1a1a', marginBottom: '10px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', lineHeight: '1.2' }}>
              KITCHEN ORDER
            </div>
            <div style={{ fontSize: '8px', letterSpacing: '0.1em', color: '#555', marginTop: '4px' }}>
              KOT #{displayKotNumber}
            </div>
          </div>

          {/* Table and Time Info */}
          <div style={{ marginBottom: '10px', fontSize: '8px', lineHeight: '1.8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ color: '#555', fontWeight: '600' }}>Table:</span>
              <span style={{ fontWeight: '700', fontSize: '11px', color: '#1a1a1a' }}>{tableName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ color: '#555' }}>Date:</span>
              <span style={{ color: '#1a1a1a' }}>{now.toLocaleDateString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ color: '#555' }}>Time:</span>
              <span style={{ color: '#1a1a1a' }}>{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '2px solid #1a1a1a', margin: '8px 0' }} />

          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: '6px', gap: '4px', fontWeight: '700' }}>
            <span>ITEM</span>
            <span style={{ textAlign: 'right' }}>QTY</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed #d0cec8', margin: '6px 0' }} />

          {/* Items */}
          {items.map((item, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 50px', fontSize: '9px', lineHeight: '1.6', gap: '4px', padding: '4px 0', borderBottom: '1px dashed #e0e0e0' }}>
              <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{item.name}</span>
              <span style={{ textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#1a1a1a' }}>{item.quantity}</span>
            </div>
          ))}

          <hr style={{ border: 'none', borderTop: '2px solid #1a1a1a', margin: '8px 0' }} />

          {/* Total Items */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', background: '#f0f0f0', margin: '0 -4px', paddingLeft: '4px', paddingRight: '4px' }}>
            <span style={{ fontWeight: '700', fontSize: '9px', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL ITEMS:</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a1a' }}>
              {items.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed #d0cec8', margin: '10px 0' }} />

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <div style={{ fontSize: '7px', color: '#999', lineHeight: '1.6' }}>
              This is a Kitchen Order Ticket
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3 justify-center">
          <button
            onClick={() => handlePrint()}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Bill
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
