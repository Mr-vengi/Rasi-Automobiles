import { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, ShoppingBag, Truck, Users, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Package, Receipt, IndianRupee, Layers,
  Calendar, Clock, ShieldAlert, Sparkles, Filter, ChevronRight
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
type Customer = Tables<"customers">;

interface DashboardViewProps {
  user: { fullName: string; roleId: string };
  settings: Tables<"business_settings"> | null | undefined;
  loading: boolean;
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  customers: Customer[];
  lowStock: Product[];
  todaySales: number;
  todayPurchases: number;
  todayProfit: number;
  customerOutstanding: number;
  supplierOutstanding: number;
  inventoryValue: number;
  todayExpenses: number;
  monthRevenue: number;
  monthExpenses: number;
  onNavigate: (page: "pos" | "sales" | "products" | "inventory" | "purchases" | "customers" | "suppliers" | "expenses" | "reports" | "settings") => void;
}

const COLORS = ["#0284c7", "#f97316", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];

export function DashboardView({
  user,
  settings,
  loading,
  products,
  sales,
  purchases,
  customers,
  lowStock,
  todaySales,
  todayPurchases,
  todayProfit,
  customerOutstanding,
  supplierOutstanding,
  inventoryValue,
  todayExpenses,
  monthRevenue,
  monthExpenses,
  onNavigate,
}: DashboardViewProps) {
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "year">("month");

  const completedSales = useMemo(() => sales.filter((s) => s.status === "completed"), [sales]);
  const outOfStockCount = useMemo(() => products.filter((p) => Number(p.current_stock) <= 0).length, [products]);
  const criticalStockCount = useMemo(
    () => products.filter((p) => Number(p.current_stock) > 0 && Number(p.current_stock) <= Number(p.minimum_stock) / 2).length,
    [products]
  );

  // 30-Day Sales Trend Data
  const salesTrendData = useMemo(() => {
    const map = new Map<string, { date: string; sales: number; profit: number }>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      map.set(key, { date: label, sales: 0, profit: 0 });
    }

    completedSales.forEach((s) => {
      const key = s.sale_date.slice(0, 10);
      if (map.has(key)) {
        const item = map.get(key)!;
        const total = Number(s.total_amount);
        item.sales += total;
        item.profit += total * 0.22;
      }
    });

    return Array.from(map.values());
  }, [completedSales]);

  // Payment method distribution
  const paymentMethodData = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let card = 0;
    let bank = 0;
    let credit = 0;

    completedSales.forEach((s) => {
      const payments = s.sale_payments || [];
      if (payments.length > 0) {
        payments.forEach((p) => {
          const method = p.payment_method;
          const amt = Number(p.amount) || 0;
          if (method === "cash") cash += amt;
          else if (method === "upi") upi += amt;
          else if (method === "card") card += amt;
          else if (method === "bank_transfer") bank += amt;
          else credit += amt;
        });
      } else {
        cash += Number(s.paid_amount) || 0;
      }
      if (Number(s.balance_due) > 0) {
        credit += Number(s.balance_due);
      }
    });

    const entries = [
      { name: "Cash", value: cash },
      { name: "UPI", value: upi },
      { name: "Card", value: card },
      { name: "Bank Transfer", value: bank },
      { name: "Credit", value: credit },
    ];

    return entries.filter((e) => e.value > 0);
  }, [completedSales]);

  // Top selling spare parts
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    completedSales.forEach((s) => {
      const items = s.sale_items || [];
      items.forEach((item) => {
        const name = item.product_name || "Spare Part";
        const rawQty = Number(item.quantity);
        const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
        const rawTotal = (item as any).line_total ?? (item as any).total_amount ?? (item as any).total ?? (qty * Number(item.unit_price || 0));
        const parsedTotal = Number(rawTotal);
        const total = Number.isFinite(parsedTotal) ? parsedTotal : 0;
        if (!map.has(name)) {
          map.set(name, { name, qty, revenue: total });
        } else {
          const existing = map.get(name)!;
          existing.qty += qty;
          existing.revenue += total;
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [completedSales]);

  const estimatedNetProfit = Math.max(0, monthRevenue * 0.24 - monthExpenses);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 rounded-xl border bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            src="/rasi-logo.png"
            alt="Rasi Automobiles Billing"
            className="size-16 rounded-full border-2 border-white/20 shadow-md bg-white object-cover shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                <Sparkles className="size-3" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                Live Automobile Business Metrics
              </span>
            </div>
            <h2 className="mt-0.5 text-xl font-black tracking-tight">
              Welcome, {((user.roleId === "administrator" || user.roleId === "admin" || user.roleId === "owner") && settings?.owner_name?.trim()) ? settings.owner_name.trim() : (user.fullName || "Store Manager")}
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              {settings?.business_name || "Rasi Automobiles"} · Drive · Service · Bill Smartly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onNavigate("pos")}
            className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400 gap-1.5 shadow-xs"
          >
            <ShoppingBag className="size-4" /> Start New Bill (F1)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate("inventory")}
            className="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700 text-xs"
          >
            Stock Alerts ({lowStock.length})
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales */}
        <Card className="border shadow-xs hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Today's Sales
            </CardTitle>
            <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-600">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              ₹{todaySales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">₹{todayProfit.toFixed(0)}</span> est. gross profit today
            </p>
          </CardContent>
        </Card>

        {/* Customer Outstanding */}
        <Card className="border shadow-xs hover:border-amber-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Customer Dues (Receivables)
            </CardTitle>
            <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-600">
              <Users className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">
              ₹{customerOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Across credit customers & workshops
            </p>
          </CardContent>
        </Card>

        {/* Supplier Payables */}
        <Card className="border shadow-xs hover:border-red-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Supplier Payables
            </CardTitle>
            <div className="rounded-md bg-rose-500/10 p-1.5 text-rose-600">
              <Truck className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600">
              ₹{supplierOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Total pending supplier bills
            </p>
          </CardContent>
        </Card>

        {/* Total Inventory Valuation */}
        <Card className="border shadow-xs hover:border-indigo-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Stock Valuation (Cost)
            </CardTitle>
            <div className="rounded-md bg-indigo-500/10 p-1.5 text-indigo-600">
              <Package className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-indigo-600">
              ₹{inventoryValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {products.length} catalogued spare parts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Quick Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-xs">
          <div className="flex size-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <Receipt className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Month's Revenue</p>
            <p className="text-sm font-bold text-foreground">₹{monthRevenue.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-xs">
          <div className="flex size-9 items-center justify-center rounded-md bg-purple-50 text-purple-600">
            <TrendingUp className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Est. Net Profit</p>
            <p className="text-sm font-bold text-foreground">₹{estimatedNetProfit.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-xs">
          <div className="flex size-9 items-center justify-center rounded-md bg-amber-50 text-amber-600">
            <AlertTriangle className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Low Stock Alert</p>
            <p className="text-sm font-bold text-amber-600">{lowStock.length} items</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-xs">
          <div className="flex size-9 items-center justify-center rounded-md bg-red-50 text-red-600">
            <ShieldAlert className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Out of Stock</p>
            <p className="text-sm font-bold text-destructive">{outOfStockCount} items</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales & Profit 30-Day Trend */}
        <Card className="border lg:col-span-2 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold">Sales & Gross Profit (Last 30 Days)</CardTitle>
              <CardDescription className="text-xs">Continuous daily performance trend</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Live Data
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, ""]}
                    contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" name="Sales Revenue" />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" name="Gross Profit" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Payment Methods</CardTitle>
            <CardDescription className="text-xs">Cash vs UPI vs Card vs Credit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentMethodData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, ""]} contentStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {paymentMethodData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-muted-foreground">{entry.name}:</span>
                  <span className="font-semibold text-foreground">₹{entry.value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lower Row: Top Selling Parts & Low Stock Alert List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Products */}
        <Card className="border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Best Selling Spare Parts</CardTitle>
              <CardDescription className="text-xs">Ranked by overall sales revenue</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("reports")} className="text-xs gap-1">
              View All <ChevronRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.length > 0 ? (
                topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-2 text-xs">
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.qty} units sold</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground">
                        ₹{Number.isFinite(p.revenue) ? p.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No completed sales yet. Invoices completed in POS will rank here.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                Critical & Low Stock Items
              </CardTitle>
              <CardDescription className="text-xs">Immediate reorder recommended</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("inventory")} className="text-xs gap-1">
              Restock All <ChevronRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {lowStock.length > 0 ? (
                lowStock.slice(0, 6).map((item) => {
                  const current = Number(item.current_stock);
                  const min = Number(item.minimum_stock);
                  const isOut = current <= 0;
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border p-2.5 text-xs bg-muted/20">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-foreground truncate">{item.product_name}</p>
                        <p className="text-[10px] text-muted-foreground">SKU: {item.sku} · Shelf: {item.shelf_location || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={isOut ? "destructive" : "secondary"} className="font-mono text-[10px]">
                          {current} / {min} {item.unit}
                        </Badge>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => onNavigate("purchases")}>
                          Reorder
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-emerald-600 font-medium">
                  ✓ All spare parts stock levels are healthy!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
