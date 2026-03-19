"use client";

import { useState, useRef, useEffect } from 'react';
import { useOutlet } from '@/contexts/OutletContext';
import { useAuth } from '@/hooks/useAuth';
import { Store, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_OUTLET, isAllOutlet } from '@/contexts/OutletContext';

export default function OutletFloatingButton() {
  const { user } = useAuth();
  const { selectedOutlet, outlets, setSelectedOutlet } = useOutlet();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const canViewAll = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!selectedOutlet) return null;

  const currentName = selectedOutlet.name || 'Current outlet';
  const isWarehouse = selectedOutlet.outlet_type === 'warehouse';
  const hasMultiple = (outlets && outlets.length > 1) || canViewAll;

  return (
    <div ref={dropdownRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Tooltip above the icon on hover */}
      {showTooltip && (
        <div className="absolute bottom-full mb-2 right-0 bg-surface border border-border rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-text-primary whitespace-nowrap animate-in fade-in duration-150">
          {currentName}
        </div>
      )}

      {/* Dropdown above the icon when open */}
      {showDropdown && hasMultiple && (
        <div className="absolute bottom-full mb-2 right-0 bg-surface border border-border rounded-lg shadow-xl overflow-hidden max-h-[280px] overflow-y-auto min-w-[220px] animate-in fade-in duration-200">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Switch outlet</p>
          </div>
          {canViewAll && (
            <button
              type="button"
              onClick={() => {
                setSelectedOutlet(ALL_OUTLET);
                setShowDropdown(false);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-2 transition-colors text-left',
                isAllOutlet(selectedOutlet) && 'bg-primary/10 border-l-2 border-primary'
              )}
            >
              <Store size={16} className="text-primary shrink-0" />
              <span className="text-sm text-text-primary truncate">All</span>
            </button>
          )}
          {outlets.map((outlet) => (
            <button
              key={outlet.id}
              type="button"
              onClick={() => {
                setSelectedOutlet(outlet);
                setShowDropdown(false);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-2 transition-colors text-left',
                !isAllOutlet(selectedOutlet) && selectedOutlet.id === outlet.id && 'bg-primary/10 border-l-2 border-primary'
              )}
            >
              {outlet.outlet_type === 'warehouse' ? (
                <Warehouse size={16} className="text-info shrink-0" />
              ) : (
                <Store size={16} className="text-primary shrink-0" />
              )}
              <span className="text-sm text-text-primary truncate">{outlet.name}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => hasMultiple && setShowDropdown((o) => !o)}
        title={currentName}
        className={cn(
          'w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors',
          'bg-primary/90 text-white hover:bg-primary border-2 border-primary',
          hasMultiple && 'cursor-pointer'
        )}
        aria-label={`Current: ${currentName}. ${hasMultiple ? 'Click to switch outlet.' : ''}`}
      >
        {isAllOutlet(selectedOutlet) || !isWarehouse ? (
          <Store size={22} />
        ) : (
          <Warehouse size={22} />
        )}
      </button>
    </div>
  );
}
