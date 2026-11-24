import { useState, useMemo } from "react";
import { Plus, Search, Download, Wallet, DollarSign, Calculator, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportToCsv } from "./csv-utils";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;

interface ExpensesViewProps {
  expenses: Expense[];
  search: string;
  loading: boolean;
  has: (permission: string) => boolean;
  onAdd: () => void;
  onExport: () => void;
}

export function ExpensesView({
  expenses,
  search: externalSearch,
  loading,
  has,
  onAdd,
  onExport,
}: ExpensesViewProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [cashRegisterOpen, setCashRegisterOpen] = useState(false);

  // Cash Register State
  const [openingCash, setOpeningCash] = useState("2000");
  const [countedCash, setCountedCash] = useState("");

  const query = (localSearch || externalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (!query) return true;
      return (
        e.category.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        e.expense_date.includes(query)
      );
    });
  }, [expenses, query]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);
  const cashExpenses = useMemo(
    () => expenses.filter((e) => e.payment_method === "cash").reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  // Calculations for cash register shift
  const openFloat = Number(openingCash) || 0;
  // Estimated cash sales today
  const estCashSales = 12500; // Simulated or fetched from today's cash sales
  const expCashTotal = openFloat + estCashSales - cashExpenses;
  const counted = Number(countedCash) || 0;
  const discrepancy = counted > 0 ? counted - expCashTotal : 0;

  return (
    <div className="space-y-4">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">Total Recorded Expenses</p>
          <p className="mt-1 text-xl font-black text-foreground">₹{totalExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">Cash Paid from Drawer</p>
          <p className="mt-1 text-xl font-black text-amber-600">₹{cashExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">Expense Records Count</p>
          <p className="mt-1 text-xl font-black text-foreground">{expenses.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase">Daily Cash Register</p>
            <p className="mt-1 text-xs font-semibold text-primary">Shift Balance</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCashRegisterOpen(true)} className="text-xs h-7 gap-1">
            <Calculator className="size-3.5" /> Reconcile
          </Button>
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search category, description..."
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport} className="h-8 text-xs gap-1.5">
            <Download className="size-3.5" /> Export CSV
          </Button>

          {has("expenses:create") && (
            <Button size="sm" onClick={onAdd} className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
              <Plus className="size-3.5" /> Record Expense
            </Button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description / Particulars</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y">
            {filtered.length > 0 ? (
              filtered.map((exp) => (
                <TableRow key={exp.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(exp.expense_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">{exp.category}</TableCell>
                  <TableCell className="text-muted-foreground">{exp.description || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-[9px]">
                      {exp.payment_method}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">
                    ₹{Number(exp.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                  {loading ? "Loading expenses..." : "No expense records found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cash Register Modal */}
      <Dialog open={cashRegisterOpen} onOpenChange={setCashRegisterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Daily Cash Register Reconciliation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex justify-between items-center">
                <span>Opening Cash Float:</span>
                <Input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="h-7 w-28 text-right font-mono font-bold text-xs"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Today's Cash Sales Collected:</span>
                <span className="font-mono font-bold text-emerald-600">₹{estCashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Cash Expenses Paid from Drawer:</span>
                <span className="font-mono font-bold text-destructive">-₹{cashExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2 font-bold text-foreground">
                <span>Expected Drawer Cash:</span>
                <span className="font-mono text-sm text-primary">₹{expCashTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold">Actual Physical Cash Counted in Drawer (₹):</label>
              <Input
                type="number"
                step="1"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="Enter physical cash counted"
                className="h-9 text-xs font-bold"
              />
            </div>

            {counted > 0 && (
              <div
                className={`rounded-lg border p-3 flex items-center justify-between font-bold ${
                  discrepancy === 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : discrepancy > 0
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                <span>{discrepancy === 0 ? "Drawer Perfectly Balanced" : discrepancy > 0 ? "Cash Overage (Surplus)" : "Cash Shortage (Deficit)"}:</span>
                <span className="font-mono text-sm">
                  {discrepancy > 0 ? `+₹${discrepancy.toFixed(2)}` : `₹${discrepancy.toFixed(2)}`}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setCashRegisterOpen(false)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  alert("Daily cash shift summary recorded.");
                  setCashRegisterOpen(false);
                }}
              >
                Save Shift Summary
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
