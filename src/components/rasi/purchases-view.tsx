import { useState, useMemo } from "react";
import { Plus, Search, Download, Truck, Eye, Calendar, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportToCsv } from "./csv-utils";
import type { Tables } from "@/integrations/supabase/types";

type Purchase = Tables<"purchases"> & {
  suppliers?: { supplier_name: string; phone: string; gstin?: string; address?: string } | null;
  purchase_items?: Tables<"purchase_items">[];
  purchase_payments?: Tables<"purchase_payments">[];
};

interface PurchasesViewProps {
  purchases: Purchase[];
  search: string;
  loading: boolean;
  selectedPurchase: string | null;
  has: (permission: string) => boolean;
  onSelect: (purchaseId: string | null) => void;
  onCreate: () => void;
  onExport: () => void;
}

export function PurchasesView({
  purchases,
  search: externalSearch,
  loading,
  selectedPurchase,
  has,
  onSelect,
  onCreate,
  onExport,
}: PurchasesViewProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [detailPurchase, setDetailPurchase] = useState<Purchase | null>(null);

  const query = (localSearch || externalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      if (!query) return true;
      return (
        p.suppliers?.supplier_name?.toLowerCase().includes(query) ||
        p.supplier_reference?.toLowerCase().includes(query) ||
        p.purchase_date.includes(query)
      );
    });
  }, [purchases, query]);

  const totalPurchased = useMemo(() => purchases.reduce((sum, p) => sum + Number(p.total_amount), 0), [purchases]);
  const totalPayables = useMemo(() => purchases.reduce((sum, p) => sum + Number(p.balance_due), 0), [purchases]);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">Total Purchase Bills</p>
          <p className="mt-1 text-xl font-black text-foreground">{purchases.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">Total Invoiced Goods</p>
          <p className="mt-1 text-xl font-black text-primary">₹{totalPurchased.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">Pending Supplier Payables</p>
          <p className="mt-1 text-xl font-black text-rose-600">₹{totalPayables.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Top Filter & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search supplier, bill #..."
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport} className="h-8 text-xs gap-1.5">
            <Download className="size-3.5" /> Export CSV
          </Button>

          {has("purchases:create") && (
            <Button size="sm" onClick={onCreate} className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
              <Plus className="size-3.5" /> Receive Goods / Bill
            </Button>
          )}
        </div>
      </div>

      {/* Purchases Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Supplier Name</TableHead>
              <TableHead>Supplier Inv #</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Total (₹)</TableHead>
              <TableHead className="text-right">Paid (₹)</TableHead>
              <TableHead className="text-right">Balance Due (₹)</TableHead>
              <TableHead className="text-right w-20">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y">
            {filtered.length > 0 ? (
              filtered.map((purchase) => {
                const total = Number(purchase.total_amount);
                const paid = Number(purchase.paid_amount);
                const due = Number(purchase.balance_due);
                const isPaid = due <= 0.01;

                const dateStr = new Date(purchase.purchase_date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <TableRow key={purchase.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap">{dateStr}</TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground">{purchase.suppliers?.supplier_name || "Unknown Supplier"}</p>
                      {purchase.suppliers?.phone && (
                        <p className="font-mono text-[10px] text-muted-foreground">{purchase.suppliers.phone}</p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-foreground font-medium">
                      {purchase.supplier_reference || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`uppercase text-[9px] ${isPaid ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50"}`}>
                        {isPaid ? "PAID" : "DUE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">₹{total.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">₹{paid.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={due > 0 ? "text-rose-600 font-bold" : "text-muted-foreground"}>
                        {due > 0 ? `₹${due.toFixed(2)}` : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="View Purchase Details"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setDetailPurchase(purchase)}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                  {loading ? "Loading purchases..." : "No purchase bills recorded yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Purchase Detail Modal */}
      <Dialog open={detailPurchase !== null} onOpenChange={() => setDetailPurchase(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Bill Details</DialogTitle>
          </DialogHeader>
          {detailPurchase && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Supplier</p>
                  <p className="font-bold text-sm text-foreground">{detailPurchase.suppliers?.supplier_name}</p>
                  <p className="text-muted-foreground">{detailPurchase.suppliers?.phone}</p>
                  <p className="text-muted-foreground">{detailPurchase.suppliers?.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Invoice Reference</p>
                  <p className="font-mono font-bold text-foreground">{detailPurchase.supplier_reference || "—"}</p>
                  <p className="text-muted-foreground">Date: {detailPurchase.purchase_date}</p>
                </div>
              </div>

              <div>
                <p className="font-bold uppercase text-[11px] text-muted-foreground mb-2">Received Line Items</p>
                <div className="rounded border overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-muted text-[10px] font-bold">
                      <tr>
                        <th className="p-2">Part Name</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Cost (₹)</th>
                        <th className="p-2 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-mono">
                      {(detailPurchase.purchase_items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="p-2 font-sans">
                            <p className="font-semibold text-foreground">{item.product_name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.sku}</p>
                          </td>
                          <td className="p-2 text-center font-bold">{Number(item.quantity).toFixed(0)}</td>
                          <td className="p-2 text-right">₹{Number(item.unit_cost).toFixed(2)}</td>
                          <td className="p-2 text-right font-bold text-foreground">₹{Number(item.line_total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center border-t pt-3 font-bold">
                <span>Total Purchase Invoiced:</span>
                <span className="font-mono text-base text-primary">₹{Number(detailPurchase.total_amount).toFixed(2)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
