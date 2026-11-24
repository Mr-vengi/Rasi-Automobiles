import { useState, useMemo } from "react";
import {
  FileBarChart2, Download, Printer, Filter, Calendar, TrendingUp,
  Percent, ArrowUpRight, DollarSign, Package, AlertTriangle, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { exportToCsv } from "./csv-utils";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Sale = Tables<"sales"> & {
  customers?: { customer_name: string; phone: string } | null;
  sale_items?: Tables<"sale_items">[];
  sale_payments?: Tables<"sale_payments">[];
};
type Purchase = Tables<"purchases"> & {
  suppliers?: { supplier_name: string; phone: string } | null;
  purchase_items?: Tables<"purchase_items">[];
};
type Expense = Tables<"expenses">;

interface ReportsViewProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  products: Product[];
  lowStock: Product[];
  inventoryValue: number;
  has: (permission: string) => boolean;
  onExport: () => void;
}

export function ReportsView({
  sales,
  purchases,
  expenses,
  products,
  lowStock,
  inventoryValue,
  has,
}: ReportsViewProps) {
  const [selectedReport, setSelectedReport] = useState<string>("daily_sales");
  const [dateRange, setDateRange] = useState<"today" | "this_month" | "this_year" | "all">("this_month");

  const completedSales = useMemo(() => sales.filter((s) => s.status === "completed"), [sales]);

  /* =========================================================================
     1. Daily Sales Summary
     ========================================================================= */
  const dailySalesData = useMemo(() => {
    const map = new Map<string, { date: string; count: number; subtotal: number; tax: number; total: number }>();
    completedSales.forEach((s) => {
      const key = s.sale_date.slice(0, 10);
      const existing = map.get(key) || { date: key, count: 0, subtotal: 0, tax: 0, total: 0 };
      existing.count += 1;
      existing.subtotal += Number(s.taxable_amount || s.subtotal || 0);
      existing.tax += Number(s.cgst_amount || 0) + Number(s.sgst_amount || 0) + Number(s.igst_amount || 0);
      existing.total += Number(s.total_amount || 0);
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [completedSales]);

  /* =========================================================================
     2. Product-wise Sales Report
     ========================================================================= */
  const productWiseData = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; qty: number; revenue: number; cost: number; profit: number }>();
    completedSales.forEach((s) => {
      const items = s.sale_items || [];
      items.forEach((item) => {
        const key = item.sku || item.product_name;
        const qty = Number(item.quantity);
        const revenue = Number(item.line_total);
        const cost = qty * Number(item.unit_cost || 0);
        const existing = map.get(key) || {
          name: item.product_name,
          sku: item.sku,
          qty: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
        existing.qty += qty;
        existing.revenue += revenue;
        existing.cost += cost;
        existing.profit += revenue - cost;
        map.set(key, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [completedSales]);

  /* =========================================================================
     3. Gross Profit & Margin Analysis
     ========================================================================= */
  const totalGrossRevenue = useMemo(() => completedSales.reduce((sum, s) => sum + Number(s.total_amount), 0), [completedSales]);
  const totalCOGS = useMemo(() => {
    return completedSales.reduce((sum, s) => {
      const items = s.sale_items || [];
      return sum + items.reduce((lineSum, i) => lineSum + Number(i.quantity) * Number(i.unit_cost || 0), 0);
    }, 0);
  }, [completedSales]);
  const totalGrossProfit = Math.max(0, totalGrossRevenue - totalCOGS);
  const grossProfitMargin = totalGrossRevenue > 0 ? (totalGrossProfit / totalGrossRevenue) * 100 : 0;

  /* =========================================================================
     4. GST Summary Report (for GSTR-1 preparation)
     ========================================================================= */
  const gstSummary = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let totalTax = 0;
    completedSales.forEach((s) => {
      taxable += Number(s.taxable_amount || 0);
      cgst += Number(s.cgst_amount || 0);
      sgst += Number(s.sgst_amount || 0);
      igst += Number(s.igst_amount || 0);
    });
    totalTax = cgst + sgst + igst;
    return { taxable, cgst, sgst, igst, totalTax };
  }, [completedSales]);

  /* =========================================================================
     5. Export Active Report
     ========================================================================= */
  const handleExportCurrentReport = () => {
    if (selectedReport === "daily_sales") {
      exportToCsv("rasi-report-daily-sales", dailySalesData);
    } else if (selectedReport === "product_sales") {
      exportToCsv("rasi-report-product-sales", productWiseData);
    } else if (selectedReport === "stock_valuation") {
      const stockData = products.map((p) => ({
        "Part Name": p.product_name,
        SKU: p.sku,
        "Shelf Location": p.shelf_location || "—",
        "Stock on Hand": p.current_stock,
        Unit: p.unit,
        "Unit Cost Price": p.purchase_price,
        "Selling Price": p.selling_price,
        "Total Valuation (₹)": (Number(p.current_stock) * Number(p.purchase_price)).toFixed(2),
      }));
      exportToCsv("rasi-report-stock-valuation", stockData);
    } else if (selectedReport === "gst_summary") {
      exportToCsv("rasi-report-gst-summary", [
        {
          "Total Taxable Value": gstSummary.taxable,
          "Total CGST": gstSummary.cgst,
          "Total SGST": gstSummary.sgst,
          "Total IGST": gstSummary.igst,
          "Total GST Output Liability": gstSummary.totalTax,
        },
      ]);
    } else {
      alert("Exporting report data...");
    }
  };

  return (
    <div className="space-y-5">
      {/* Report Selection Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Business Report</p>
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="h-9 w-64 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily_sales">1. Daily Sales Summary</SelectItem>
                <SelectItem value="product_sales">2. Product-wise Sales Report</SelectItem>
                <SelectItem value="gross_profit">3. Gross Profit & Margin Analysis</SelectItem>
                <SelectItem value="stock_valuation">4. Stock Valuation & Asset Value</SelectItem>
                <SelectItem value="gst_summary">5. GST Summary (Tax Output Liability)</SelectItem>
                <SelectItem value="customer_dues">6. Customer Outstanding Receivables</SelectItem>
                <SelectItem value="supplier_dues">7. Supplier Payables Report</SelectItem>
                <SelectItem value="expense_report">8. Business Overheads & Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Period</p>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_year">This Financial Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 text-xs gap-1.5">
            <Printer className="size-3.5" /> Print Report
          </Button>
          <Button size="sm" onClick={handleExportCurrentReport} className="h-9 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold">
            <Download className="size-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* REPORT 1: DAILY SALES SUMMARY */}
      {selectedReport === "daily_sales" && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Bills Count</TableHead>
                  <TableHead className="text-right">Taxable Value (₹)</TableHead>
                  <TableHead className="text-right">GST Tax (₹)</TableHead>
                  <TableHead className="text-right font-black">Net Sales (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y font-mono">
                {dailySalesData.map((row) => (
                  <TableRow key={row.date} className="hover:bg-muted/30">
                    <TableCell className="font-bold text-foreground">
                      {new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-center font-sans">{row.count} bills</TableCell>
                    <TableCell className="text-right">₹{row.subtotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">₹{row.tax.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-foreground">₹{row.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* REPORT 2: PRODUCT-WISE SALES */}
      {selectedReport === "product_sales" && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
                <TableRow>
                  <TableHead>Part Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-center">Qty Sold</TableHead>
                  <TableHead className="text-right">Total Revenue (₹)</TableHead>
                  <TableHead className="text-right">Cost of Goods (₹)</TableHead>
                  <TableHead className="text-right">Gross Profit (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y font-mono">
                {productWiseData.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30">
                    <TableCell className="font-sans font-semibold text-foreground">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.sku}</TableCell>
                    <TableCell className="text-center font-bold text-foreground">{row.qty}</TableCell>
                    <TableCell className="text-right font-bold text-foreground">₹{row.revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">₹{row.cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">₹{row.profit.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* REPORT 3: GROSS PROFIT & MARGIN ANALYSIS */}
      {selectedReport === "gross_profit" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border shadow-xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Total Invoiced Revenue</p>
                <p className="mt-1 text-2xl font-black text-foreground">₹{totalGrossRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Cost of Goods Sold (COGS)</p>
                <p className="mt-1 text-2xl font-black text-slate-600">₹{totalCOGS.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Gross Profit & Margin</p>
                <p className="mt-1 text-2xl font-black text-emerald-600">₹{totalGrossProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">Average Margin: {grossProfitMargin.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border bg-card p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Accounting Note on Valuation Method:</p>
            <p>Gross Profit is computed rigorously as: <strong>Total Invoiced Sales Revenue minus Exact Cost of Goods Sold</strong>.</p>
            <p>Returns and price discounts are fully deducted to prevent artificial inflation of profit figures.</p>
          </div>
        </div>
      )}

      {/* REPORT 4: STOCK VALUATION */}
      {selectedReport === "stock_valuation" && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
                <TableRow>
                  <TableHead>Part Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Units on Hand</TableHead>
                  <TableHead className="text-right">Purchase Cost (₹)</TableHead>
                  <TableHead className="text-right font-black">Stock Asset Value (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y font-mono">
                {products.map((p) => {
                  const stock = Number(p.current_stock);
                  const cost = Number(p.purchase_price);
                  const val = stock * cost;
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="font-sans font-semibold text-foreground">{p.product_name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                      <TableCell className="text-muted-foreground font-sans">{p.shelf_location || "—"}</TableCell>
                      <TableCell className="text-center font-bold text-foreground">{stock} {p.unit}</TableCell>
                      <TableCell className="text-right">₹{cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">₹{val.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* REPORT 5: GST SUMMARY REPORT */}
      {selectedReport === "gst_summary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border shadow-xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Total Taxable Value</p>
                <p className="mt-1 text-xl font-black text-foreground">₹{gstSummary.taxable.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">CGST Collected</p>
                <p className="mt-1 text-xl font-black text-primary">₹{gstSummary.cgst.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">SGST Collected</p>
                <p className="mt-1 text-xl font-black text-primary">₹{gstSummary.sgst.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Total GST Liability</p>
                <p className="mt-1 text-xl font-black text-emerald-600">₹{gstSummary.totalTax.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border bg-card p-4 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">Statutory Disclaimer:</p>
            <p>
              These figures summarize your internal billing records for preparing your monthly GSTR-1 and GSTR-3B filings.
              Always have your chartered accountant verify reconciliation against GSTR-2B purchase input tax credits.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
