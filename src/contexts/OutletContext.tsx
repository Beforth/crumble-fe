"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

export interface Outlet {
  id: number;
  name: string;
  outlet_type: string;
  address?: string;
  phone?: string;
  email?: string;
  manager?: string;
  is_active: boolean;
}

/** Sentinel for "All outlets" view (admin/superadmin only). id=0, outlet_type='all'. */
export const ALL_OUTLET: Outlet = {
  id: 0,
  name: 'All',
  outlet_type: 'all',
  is_active: true,
};

/** True when the sentinel "All outlets" row is selected (not a real outlet row). */
export function isAllOutlet(o: Outlet | null): boolean {
  return o != null && (o.id === 0 || o.outlet_type === 'all');
}

interface OutletContextType {
  outlets: Outlet[];
  selectedOutlet: Outlet | null;
  setSelectedOutlet: (outlet: Outlet) => void;
  loading: boolean;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export function OutletProvider({ children }: { children: ReactNode }) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutletState] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        console.log('Fetching outlets...');
        
        // Fetch user info to check role
        let userRole = '';
        try {
          const userResponse = await api.get('/auth/me');
          userRole = userResponse.data.role;
          console.log('User role:', userRole);
        } catch (err) {
          console.error('Failed to fetch user info:', err);
        }
        
        const response = await api.get('/outlets');
        const fetchedOutlets = response.data;
        console.log('Outlets fetched:', fetchedOutlets);
        
        if (!fetchedOutlets || fetchedOutlets.length === 0) {
          console.warn('No outlets returned from API');
          setLoading(false);
          return;
        }
        
        setOutlets(fetchedOutlets);

        // For admin/superadmin, respect "All" (0) from localStorage; else use first outlet
        // For other roles, use saved outlet or first outlet
        const savedOutletId = localStorage.getItem('selectedOutletId');
        const isAdminOrSuperadmin = userRole === 'admin' || userRole === 'super_admin';
        if (savedOutletId === '0' || savedOutletId === 'all') {
          if (isAdminOrSuperadmin) {
            setSelectedOutletState(ALL_OUTLET);
          } else if (fetchedOutlets.length > 0) {
            setSelectedOutletState(fetchedOutlets[0]);
            localStorage.setItem('selectedOutletId', fetchedOutlets[0].id.toString());
          }
        } else if (userRole === 'admin' || userRole === 'super_admin') {
          if (savedOutletId) {
            const saved = fetchedOutlets.find((o: Outlet) => o.id === parseInt(savedOutletId, 10));
            if (saved) setSelectedOutletState(saved);
            else if (fetchedOutlets.length > 0) {
              setSelectedOutletState(fetchedOutlets[0]);
              localStorage.setItem('selectedOutletId', fetchedOutlets[0].id.toString());
            }
          } else if (fetchedOutlets.length > 0) {
            setSelectedOutletState(fetchedOutlets[0]);
            localStorage.setItem('selectedOutletId', fetchedOutlets[0].id.toString());
          }
        } else {
          if (savedOutletId) {
            const saved = fetchedOutlets.find((o: Outlet) => o.id === parseInt(savedOutletId, 10));
            if (saved) setSelectedOutletState(saved);
            else if (fetchedOutlets.length > 0) {
              setSelectedOutletState(fetchedOutlets[0]);
              localStorage.setItem('selectedOutletId', fetchedOutlets[0].id.toString());
            }
          } else if (fetchedOutlets.length > 0) {
            setSelectedOutletState(fetchedOutlets[0]);
            localStorage.setItem('selectedOutletId', fetchedOutlets[0].id.toString());
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch outlets:', error);
        console.error('Error details:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately, no delay
    fetchOutlets();
  }, []);

  const setSelectedOutlet = (outlet: Outlet) => {
    setSelectedOutletState(outlet);
    const key = outlet.id === 0 || outlet.outlet_type === 'all' ? '0' : outlet.id.toString();
    localStorage.setItem('selectedOutletId', key);
  };

  return (
    <OutletContext.Provider value={{ outlets, selectedOutlet, setSelectedOutlet, loading }}>
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet() {
  const context = useContext(OutletContext);
  if (context === undefined) {
    throw new Error('useOutlet must be used within an OutletProvider');
  }
  return context;
}
