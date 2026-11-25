import { useState, useMemo, useEffect } from "react";
import {
  Search, Printer, Download, Share2, Plus, Eye, Play, Undo2,
  CheckCircle2, Clock, Ban, ArrowUpRight, DollarSign, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoicePrinter } from "./invoice-printer";
import { exportToCsv } from "./csv-utils";
import { recordCustomerPayment, loadSales } from "@/lib/rasi-data";
import type { Tables } from "@/integrations/supabase/types";

type Sale = Tables<"sales"> & {
  customers?: { customer_name: string; phone: string; gstin?: string | null; billing_address?: string | null; state?: string | null } | null;
  sale_items?: (Tables<"sale_items"> & { products?: { part_number?: string } | null })[];
  sale_payments?: Tables<"sale_payments">[];
};

interface SalesViewProps {
  sales: Sale[];
  search: string;
  loading: boolean;
  selectedSale: string | null;
  autoPrintSaleId?: string | null;
  onClearAutoPrint?: () => void;
  has: (permission: string) => boolean;
  onSelect: (saleId: string | null) => void;
  onResume: (sale: Sale) => void;
  onDeleteSale?: (saleId: string) => void;
  onNewSale: () => void;
  onExport: () => void;
  onClearAll?: () => void;
  settings?: Tables<"business_settings"> | null | undefined;
  onRefresh?: () => void;
}

export function SalesView({
  sales,
  search: externalSearch,
  loading,
  selectedSale,
  autoPrintSaleId,
  onClearAutoPrint,
  has,
  onSelect,
  onResume,
  onDeleteSale,
  onNewSale,
  onExport,
  onClearAll,
  settings,
  onRefresh,
}: SalesViewProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentModalSale, setPaymentModalSale] = useState<Sale | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "upi" | "card" | "bank_transfer">("cash");
  const [savingPayment, setSavingPayment] = useState(false);

  const query = (localSearch || externalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (!query) return true;
      return (
        s.invoice_number.toLowerCase().includes(query) ||
        s.customers?.customer_name?.toLowerCase().includes(query) ||
        s.customers?.phone?.includes(query)
      );
    });
  }, [sales, query, statusFilter]);

  // Overall metrics
  const completedSales = useMemo(() => sales.filter((s) => s.status === "completed"), [sales]);
  const totalRevenue = useMemo(() => completedSales.reduce((sum, s) => sum + Number(s.total_amount), 0), [completedSales]);
  const totalCollected = useMemo(() => completedSales.reduce((sum, s) => sum + Number(s.paid_amount), 0), [completedSales]);
  const totalDue = useMemo(() => completedSales.reduce((sum, s) => sum + Number(s.balance_due), 0), [completedSales]);

  // Handle recording payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalSale) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return alert("Enter a valid payment amount.");

    setSavingPayment(true);
    try {
      await recordCustomerPayment(paymentModalSale.id, amount, payMethod);
      alert("Payment recorded successfully.");
      setPaymentModalSale(null);
      setPayAmount("");
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Payment recording failed.");
    } finally {
      setSavingPayment(false);
    }
  };

  const activeSaleRecord = selectedSale ? sales.find((s) => s.id === selectedSale) : null;
  const [fallbackSale, setFallbackSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (selectedSale && !sales.find((s) => s.id === selectedSale)) {
      void loadSales().then((all) => {
        const found = all.find((s) => s.id === selectedSale);
        if (found) setFallbackSale(found);
      });
    } else {
      setFallbackSale(null);
    }
  }, [selectedSale, sales]);

  const currentSale = activeSaleRecord || fallbackSale;

  return (
    <div className="space-y-4">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">Total Invoices</p>
          <p className="mt-1 text-xl font-black text-foreground">{completedSales.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">Total Invoiced</p>
          <p className="mt-1 text-xl font-black text-primary">₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">Total Collected</p>
          <p className="mt-1 text-xl font-black text-emerald-600">₹{totalCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">Outstanding Due</p>
          <p className="mt-1 text-xl font-black text-amber-600">₹{totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search invoice #, customer..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Invoices</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="draft">Saved Drafts</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {onClearAll && sales.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete ALL invoices? This cannot be undone.")) {
                  onClearAll();
                }
              }}
              className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" /> Clear All Invoices
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onExport} className="h-8 text-xs gap-1.5">
            <Download className="size-3.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={onNewSale} className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
            <Plus className="size-3.5" /> Create Bill (F1)
          </Button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Total (₹)</TableHead>
              <TableHead className="text-right">Paid (₹)</TableHead>
              <TableHead className="text-right">Balance Due (₹)</TableHead>
              <TableHead className="text-right w-36">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y">
            {filtered.length > 0 ? (
              filtered.map((sale) => {
                const total = Number(sale.total_amount);
                const paid = Number(sale.paid_amount);
                const due = Number(sale.balance_due);
                const isPaid = due <= 0.01;
                const isDraft = sale.status === "draft";
                const isCancelled = sale.status === "cancelled";

                const dateStr = new Date(sale.sale_date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <TableRow key={sale.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono font-bold text-foreground">
                      {sale.invoice_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{dateStr}</TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground">{sale.customers?.customer_name || "Walk-in Customer"}</p>
                      {sale.customers?.phone && (
                        <p className="font-mono text-[10px] text-muted-foreground">{sale.customers.phone}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={isCancelled ? "destructive" : isDraft ? "outline" : isPaid ? "secondary" : "default"}
                        className={`uppercase text-[9px] ${
                          isPaid && !isCancelled && !isDraft ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""
                        }`}
                      >
                        {isDraft ? "DRAFT" : isCancelled ? "CANCELLED" : isPaid ? "PAID" : "PARTIAL"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">₹{total.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">₹{paid.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={due > 0 ? "text-amber-600 font-bold" : "text-muted-foreground"}>
                        {due > 0 ? `₹${due.toFixed(2)}` : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isDraft ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => onResume(sale)}
                            >
                              <Play className="size-3 text-primary" /> Resume
                            </Button>
                            {onDeleteSale && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Delete Draft Invoice"
                                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (window.confirm(`Delete draft invoice ${sale.invoice_number || ""}?`)) {
                                    onDeleteSale(sale.id);
                                  }
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="View & Print Invoice"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={() => onSelect(sale.id)}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Print / Save PDF"
                              className="size-7 text-primary hover:bg-primary/10"
                              onClick={() => onSelect(sale.id)}
                            >
                              <Printer className="size-3.5" />
                            </Button>
                            {due > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                title="Collect Payment"
                                className="h-7 px-2 text-[11px] font-semibold text-amber-600 border-amber-300 hover:bg-amber-50"
                                onClick={() => {
                                  setPaymentModalSale(sale);
                                  setPayAmount(String(due));
                                }}
                              >
                                Pay
                              </Button>
                            )}
                            {onDeleteSale && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Delete Invoice"
                                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (window.confirm(`Delete invoice ${sale.invoice_number || ""}?`)) {
                                    onDeleteSale(sale.id);
                                  }
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                  {loading ? "Loading invoices..." : "No invoices found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Print & View Dialog */}
      <Dialog
        open={selectedSale !== null}
        onOpenChange={(open) => {
          if (!open) {
            onSelect(null);
            onClearAutoPrint?.();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[94vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Tax Invoice & Printing</DialogTitle>
          </DialogHeader>
          {currentSale ? (
            <InvoicePrinter
              sale={currentSale}
              settings={settings}
              autoPrint={Boolean(autoPrintSaleId && autoPrintSaleId === currentSale.id)}
              onClose={() => {
                onSelect(null);
                onClearAutoPrint?.();
              }}
            />
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading invoice details...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentModalSale !== null} onOpenChange={() => setPaymentModalSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment for {paymentModalSale?.invoice_number}</DialogTitle>
          </DialogHeader>
          {paymentModalSale && (
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1">
                <p>Customer: <strong>{paymentModalSale.customers?.customer_name || "Walk-in"}</strong></p>
                <p>Invoice Total: <strong>₹{Number(paymentModalSale.total_amount).toFixed(2)}</strong></p>
                <p>Outstanding Balance: <strong className="text-amber-600">₹{Number(paymentModalSale.balance_due).toFixed(2)}</strong></p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Payment Amount (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Amount"
                  required
                  className="h-9 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Payment Mode</label>
                <Select value={payMethod} onValueChange={(v) => setPayMethod(v as typeof payMethod)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer / NEFT</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setPaymentModalSale(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={savingPayment}>
                  {savingPayment ? "Saving..." : "Record Payment"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
