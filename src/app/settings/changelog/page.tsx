"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import DataTable from "@/components/tables/DataTable";
import { cn } from "@/lib/utils";
import { FileText, Calendar, Filter } from "lucide-react";

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ChangeLogEntry {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_name: string | null;
  details: string | null;
  created_at: string;
}

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangeLogEntry[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hoveredEntry, setHoveredEntry] = useState<ChangeLogEntry | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers((res.data || []).map((u: any) => ({ id: u.id, name: u.name })));
    } catch {
      setUsers([]);
    }
  };

  const fetchChangelog = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { limit: 200 };
      if (filterUserId) params.user_id = filterUserId;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const res = await api.get("/settings/changelog", { params });
      setEntries(res.data || []);
    } catch (err) {
      console.error(err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchChangelog();
  }, [filterUserId, fromDate, toDate]);

  const actionStyle = (action: string) => {
    switch (action?.toLowerCase()) {
      case "created":
        return "bg-success/10 text-success";
      case "updated":
        return "bg-primary/10 text-primary";
      case "deleted":
        return "bg-danger/10 text-danger";
      default:
        return "bg-surface-2 text-text-secondary";
    }
  };

  /** Show POS, Table order, etc. in Item column instead of receipt/invoice number */
  const itemLabel = (entityType: string | null) => {
    if (!entityType) return "—";
    const map: Record<string, string> = {
      pos_sale: "POS",
      table_order: "Table order",
      credit_client: "Credit client",
      credit_payment: "Credit payment",
      credit_client_settle: "Credit client (settle)",
      table: "Table",
      raw_material: "Raw material",
      raw_material_recipe: "Raw material recipe",
      purchase: "Purchase",
      inventory_inward: "Inventory (inward)",
      inventory_outward: "Inventory (outward)",
      inventory_transfer: "Inventory (transfer)",
      product: "Product",
      product_bom: "Product BOM",
      production_batch: "Production batch",
      transfer: "Transfer",
      customer_sale: "Customer sale",
      barcode: "Barcode",
      user: "User",
      outlet: "Outlet",
      settings: "Settings",
      developer: "Developer",
      aging_rule: "Aging rule",
    };
    return map[entityType] ?? entityType.replace(/_/g, " ");
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
          <FileText size={28} className="text-primary" />
          Change Log
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          View what each user has changed across POS, credit clients, table orders, inventory, materials, purchase, barcodes, customer sales, settings, and users. Hover on Details to see the full detail text.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center gap-2 text-text-secondary text-sm font-medium">
          <Filter size={16} />
          Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">User</label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">From date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">To date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={["Date & time", "User", "Action", "Entity", "Item", "Details"]}
        data={entries}
        loading={loading}
        renderRow={(e: ChangeLogEntry) => (
          <>
            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-text-muted" />
                {formatDateTime(e.created_at)}
              </span>
            </td>
            <td className="px-6 py-4">
              <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {e.user_name?.charAt(0) || "?"}
                </span>
                {e.user_name}
              </span>
            </td>
            <td className="px-6 py-4">
              <span
                className={cn(
                  "inline-flex px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider",
                  actionStyle(e.action)
                )}
              >
                {e.action}
              </span>
            </td>
            <td className="px-6 py-4 text-sm text-text-secondary capitalize">
              {e.entity_type?.replace("_", " ") || "—"}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-text-primary">
              {itemLabel(e.entity_type)}
            </td>
            <td className="px-6 py-4 text-sm text-text-muted max-w-xs">
              <div
                className="relative inline-block max-w-full cursor-help"
                onMouseEnter={() => setHoveredEntry(e)}
                onMouseLeave={() => setHoveredEntry(null)}
              >
                <span className="truncate block">{e.details || "—"}</span>
                {hoveredEntry?.id === e.id && (
                  <div
                    className="absolute left-0 top-full z-50 mt-1 p-3 min-w-[200px] max-w-md bg-surface border border-border rounded-lg shadow-xl text-left text-sm text-text-primary whitespace-pre-wrap break-words"
                    role="tooltip"
                  >
                    {e.details || "—"}
                  </div>
                )}
              </div>
            </td>
          </>
        )}
      />
    </div>
  );
}
