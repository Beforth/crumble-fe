"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useOutlet } from '@/contexts/OutletContext';
import { useSidebar } from '@/components/layout/AppWrapper';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  CakeSlice,
  Settings,
  TrendingUp,
  Truck,
  ShoppingCart,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Users,
  Clock,
  Utensils,
  FileText,
  UserCheck,
  History
} from 'lucide-react';
import { useState } from 'react';

const SidebarItem = ({ icon: Icon, label, href, subItems, isCollapsed }: any) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  // More specific active state logic
  const isActive = pathname === href || (
    href !== '/settings' && pathname.startsWith(href + '/')
  );

  if (subItems) {
    return (
      <div className="mb-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            isActive ? "bg-primary-muted text-primary" : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          )}
          title={isCollapsed ? label : undefined}
        >
          <div className="flex items-center gap-3">
            <Icon size={20} />
            {!isCollapsed && <span>{label}</span>}
          </div>
          {!isCollapsed && <ChevronDown size={16} className={cn("transition-transform", isOpen && "rotate-180")} />}
        </button>
        {isOpen && !isCollapsed && (
          <div className="ml-9 mt-1 space-y-1">
            {subItems.map((sub: any) => (
              <Link
                key={sub.href}
                href={sub.href}
                className={cn(
                  "block px-4 py-2 text-xs font-medium rounded-lg transition-colors",
                  pathname === sub.href ? "text-primary" : "text-text-muted hover:text-text-primary"
                )}
              >
                {sub.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-2 mb-1 text-sm font-medium rounded-lg transition-colors",
        isActive ? "bg-primary-muted text-primary" : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
      )}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={20} />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { selectedOutlet, outlets } = useOutlet();
  const isAllOutlet = (o: { id?: number; outlet_type?: string } | null) => o != null && (o.id === 0 || o.outlet_type === 'all');
  const { isCollapsed, setIsCollapsed } = useSidebar();
  
  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isSuperAdmin = user.role === 'super_admin';
  const isInventory = user.role === 'inventory_manager';
  const isProduction = user.role === 'production_manager';
  const isCashier = user.role === 'cashier';
  
  // When "All" is selected, POS shows Main Bakery outlet only; otherwise use selected outlet
  const posOutletId = (() => {
    if (isAllOutlet(selectedOutlet)) {
      const mainBakery = outlets.find((o) => o.name === 'Main Bakery');
      return mainBakery?.id ?? outlets[0]?.id ?? (user.outlets?.length ? user.outlets[0].id : null);
    }
    return selectedOutlet?.id ?? (user.outlets?.length ? user.outlets[0].id : null);
  })();
  const posHref = posOutletId ? `/pos/${posOutletId}` : '/pos/select';

  return (
    <div className={cn(
        "h-screen bg-surface border-right border-border flex flex-col transition-all duration-300",
        isCollapsed ? "w-20" : "w-64 p-4"
      )}>
        {/* Header */}
      <div className={cn("mb-6 mt-2 transition-all", isCollapsed ? "px-0 py-4" : "px-2")}>
        <div className={cn("flex items-center gap-2", isCollapsed ? "flex-col" : "justify-between")}>
          <div className={cn("flex items-center gap-3", isCollapsed && "flex-col")}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shrink-0">C</div>
            {!isCollapsed && <span className="text-lg font-bold text-text-primary truncate">Crumble</span>}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={20} />}
          </button>
        </div>
        {!isCollapsed && (
          <div className="mt-2 px-2">
            <p className="text-[10px] text-text-muted/80">Powered By Beforth</p>
          </div>
        )}
        <hr className={cn("border-border", isCollapsed ? "mt-4 w-10 mx-auto" : "mt-4")} />
      </div>

      <div className={cn("flex-1 overflow-y-auto", isCollapsed ? "px-2" : "")}>
        {/* GENERAL Section */}
        {!isCollapsed && <div className="px-4 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">GENERAL</div>}
        {(isAdmin || isCashier) && (
          <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" isCollapsed={isCollapsed} />
        )}
        {isAdmin && (
          <SidebarItem icon={TrendingUp} label="Analytics" href="/analytics" isCollapsed={isCollapsed} />
        )}

        {/* OPERATIONS Section */}
        {!isCollapsed && <div className="px-4 mb-2 mt-6 text-[10px] font-bold text-text-muted uppercase tracking-wider">OPERATIONS</div>}
        {isCollapsed && <div className="h-4" />}
        {(isAdmin || isCashier) && (
          <SidebarItem icon={ShoppingCart} label="Point of Sale" href={posHref} isCollapsed={isCollapsed} />
        )}
        {(isAdmin || isCashier) && (
          <SidebarItem icon={Users} label="Credit Clients" href="/credit-clients" isCollapsed={isCollapsed} />
        )}
        {(isAdmin || isCashier) && (
          <SidebarItem icon={Utensils} label="Table Ordering" href="/table-ordering" isCollapsed={isCollapsed} />
        )}
        {(isAdmin || isInventory || isCashier) && (
          <SidebarItem icon={Package} label="Inventory" href="/inventory" isCollapsed={isCollapsed} />
        )}
        {(isAdmin || isProduction || isCashier) && (
          <SidebarItem icon={CakeSlice} label="Materials" href="/raw-materials" isCollapsed={isCollapsed} />
        )}
        {(isAdmin || isProduction) && (
          <SidebarItem icon={ShoppingCart} label="Purchase" href="/purchase" isCollapsed={isCollapsed} />
        )}
        {(isAdmin || isInventory) && (
          <SidebarItem icon={Truck} label="Barcodes" href="/barcodes" isCollapsed={isCollapsed} />
        )}

        {/* REPORTS Section */}
        {isAdmin && (
          <>
            {!isCollapsed && <div className="px-4 mb-2 mt-6 text-[10px] font-bold text-text-muted uppercase tracking-wider">REPORTS</div>}
            {isCollapsed && <div className="h-4" />}
            <SidebarItem icon={FileText} label="History" href="/reports/history" isCollapsed={isCollapsed} />
            <SidebarItem icon={UserCheck} label="Cust. Sales" href="/reports/customer-sales" isCollapsed={isCollapsed} />
          </>
        )}

        {/* OLD NAVIGATION - COMMENTED OUT */}
        {/* {(isAdmin || isInventory) && (
          <>
            <div className="px-4 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">Inventory</div>
            <SidebarItem
              icon={Package}
              label="Raw Materials"
              subItems={[
                { label: 'Stock Overview', href: '/raw-materials' },
                { label: 'Inward Entry', href: '/raw-materials/inward' },
                { label: 'Outward / Adjust', href: '/raw-materials/outward' },
              ]}
            />
          </>
        )}

        {(isAdmin || isProduction) && (
          <>
            <div className="px-4 mb-2 mt-6 text-[10px] font-bold text-text-muted uppercase tracking-wider">Production</div>
            <SidebarItem
              icon={CakeSlice}
              label="Products"
              subItems={[
                { label: 'All Products', href: '/products' },
                { label: 'Recipes (BOM)', href: '/products/bom' },
              ]}
            />
            <SidebarItem
              icon={Settings}
              label="Production"
              subItems={[
                { label: 'New Batch', href: '/production/new' },
                { label: 'Batch History', href: '/production' },
              ]}
            />
          </>
        )}

        {(isAdmin || isInventory) && (
          <>
            <div className="px-4 mb-2 mt-6 text-[10px] font-bold text-text-muted uppercase tracking-wider">Logistics</div>
            <SidebarItem
              icon={Truck}
              label="Stock Transfer"
              subItems={[
                { label: 'New Transfer', href: '/transfers/new' },
                { label: 'Transfer History', href: '/transfers' },
              ]}
            />
          </>
        )}

        {(isAdmin || isCashier) && (
          <>
            <div className="px-4 mb-2 mt-6 text-[10px] font-bold text-text-muted uppercase tracking-wider">Sales</div>
            <SidebarItem icon={ShoppingCart} label="POS Dashboard" href={user.outlets.length > 0 ? `/pos/${user.outlets[0].id}` : '/pos/select'} />
            <SidebarItem icon={TrendingUp} label="My Sales" href="/my-sales" />
          </>
        )}

        {isAdmin && (
          <>
            <div className="px-4 mb-2 mt-6 text-[10px] font-bold text-text-muted uppercase tracking-wider">Admin</div>
            <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
            <SidebarItem icon={TrendingUp} label="Reports" href="/reports" />
            <SidebarItem
              icon={Settings}
              label="Settings"
              subItems={[
                { label: 'Users', href: '/settings/users' },
                { label: 'Outlets', href: '/settings/outlets' },
              ]}
            />
          </>
        )} */}

        {/* ADMINISTRATION Section: Settings for admin, cashier, super_admin; Users & Change Log for admin and super_admin */}
        {(isAdmin || isCashier || isSuperAdmin) && (
          <>
            {!isCollapsed && <div className="px-4 mb-2 mt-6 text-[10px] font-bold text-text-muted uppercase tracking-wider">ADMINISTRATION</div>}
            {isCollapsed && <div className="h-4" />}
            <SidebarItem
              icon={Settings}
              label="Settings"
              href="/settings"
              isCollapsed={isCollapsed}
            />
          </>
        )}
        {(isAdmin || isSuperAdmin) && (
          <>
            <SidebarItem
              icon={Users}
              label="Users"
              href="/settings/users"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              icon={History}
              label="Change Log"
              href="/settings/changelog"
              isCollapsed={isCollapsed}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        "mt-auto border-t border-border transition-all",
        isCollapsed ? "p-2 flex-col items-center" : "p-2 flex items-center justify-between gap-3"
      )}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-text-secondary">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">{user.name}</p>
                <p className="text-[10px] text-text-muted truncate capitalize">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Log Out"
              className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-text-secondary">
              {user.name.charAt(0)}
            </div>
            <button
              onClick={logout}
              title="Log Out"
              className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
