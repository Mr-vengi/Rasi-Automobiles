import { useEffect, useState, useContext, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowDownLeft, ArrowDownToLine, ArrowLeftRight, ArrowRight, ArrowUpRight, BadgeIndianRupee,
  Bell, Boxes, BriefcaseBusiness, Check, ChevronDown, CircleHelp, Clock3, Download,
  FileBarChart2, FileText, Filter, Fuel, LayoutDashboard, LogOut, Menu, Minus,
  MoreHorizontal, PackageCheck, PackagePlus, Plus, Printer, ReceiptIndianRupee,
  Search, Settings, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal,
  Sparkles, Store, Trash2, Truck, UserRound, Users, Wallet, Wrench, X,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip,
  XAxis, YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { RasiAppContext } from "@/components/rasi/app-context";
import { calculateInvoiceTotals, getStockStatus, suggestedReorderQuantity } from "@/lib/rasi-calculations";
import {
  RASI_BUSINESS_ID, adjustInventory, createSale, loadBrands, loadCategories,
  loadCustomers, loadEmployees, loadExpenses, loadMovements, loadProducts,
  loadPurchases, loadSales, loadSettings, loadSuppliers, receivePurchase,
  rasiKeys, saveBrand, saveCategory, saveCustomer, saveExpense, saveProduct,
  saveSupplier, updateSettings,
} from "@/lib/rasi-data";
import type { Tables } from "@/integrations/supabase/types";

type Page = "dashboard" | "pos" | "sales" | "products" | "inventory" | "purchases" | "customers" | "suppliers" | "expenses" | "reports" | "employees" | "settings";
type IconComponent = typeof LayoutDashboard;
type Product = Tables<"products">;
type Customer = Tables<"customers">;
type Supplier = Tables<"suppliers">;
type Sale = Awaited<ReturnType<typeof loadSales>>[number];
type Purchase = Awaited<ReturnType<typeof loadPurchases>>[number];
type Session = { userId: string; email: string; fullName: string; roleId: string; permissions: string[] };
type NavItem = { id: Page; label: string; icon: IconComponent; permission?: string };
type CartLine = { productId: string; quantity: number; discountRate: number };
type PaymentForm = { cash: string; upi: string; card: string; bank: string };

const navItems: NavItem[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "pos", label: "New bill", icon: ShoppingCart, permission: "sales:create" },
  { id: "sales", label: "Sales & invoices", icon: ReceiptIndianRupee, permission: "sales:read" },
  { id: "products", label: "Products", icon: PackageCheck, permission: "products:read" },
  { id: "inventory", label: "Inventory", icon: Boxes, permission: "inventory:read" },
  { id: "purchases", label: "Purchases", icon: Truck, permission: "purchases:read" },
  { id: "customers", label: "Customers", icon: Users, permission: "customers:read" },
  { id: "suppliers", label: "Suppliers", icon: Store, permission: "suppliers:read" },
  { id: "expenses", label: "Expenses", icon: Wallet, permission: "expenses:read" },
  { id: "reports", label: "Reports", icon: FileBarChart2, permission: "reports:read" },
  { id: "employees", label: "Team access", icon: ShieldCheck, permission: "employees:manage" },
  { id: "settings", label: "Business settings", icon: Settings, permission: "settings:manage" },
];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
});

function rupees(value: number | string | null | undefined) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return currency.format(Number.isFinite(amount) ? amount : 0);
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
}

function todayIso() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return parts;
}

function todayStart() {
  return new Date(`${todayIso()}T00:00:00+05:30`).toISOString();
}

function readError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function initialPayment(): PaymentForm {
  return { cash: "", upi: "", card: "", bank: "" };
}

export function RasiWorkspace() {
  const rasiApp = useContext(RasiAppContext);
  if (!rasiApp) throw new Error("Rasi user session is unavailable");
  const { user } = rasiApp;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page>("dashboard");
  const [searchText, setSearchText] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dialog, setDialog] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | Customer | Supplier | null>(null);
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<string | null>(null);
  const [inventoryProduct, setInventoryProduct] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("walk-in");
  const [interstate, setInterstate] = useState(false);
  const [payment, setPayment] = useState<PaymentForm>(initialPayment);
  const [resumeSaleId, setResumeSaleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const has = (permission: string) => user.permissions.includes(permission);

  const productsQuery = useQuery({ queryKey: rasiKeys.products, queryFn: loadProducts, enabled: has("products:read") });
  const categoriesQuery = useQuery({ queryKey: rasiKeys.categories, queryFn: loadCategories, enabled: has("products:read") });
  const brandsQuery = useQuery({ queryKey: rasiKeys.brands, queryFn: loadBrands, enabled: has("products:read") });
  const customersQuery = useQuery({ queryKey: rasiKeys.customers, queryFn: loadCustomers, enabled: has("customers:read") });
  const suppliersQuery = useQuery({ queryKey: rasiKeys.suppliers, queryFn: loadSuppliers, enabled: has("suppliers:read") });
  const salesQuery = useQuery({ queryKey: rasiKeys.sales, queryFn: loadSales, enabled: has("sales:read") });
  const purchasesQuery = useQuery({ queryKey: rasiKeys.purchases, queryFn: loadPurchases, enabled: has("purchases:read") });
  const movementsQuery = useQuery({ queryKey: rasiKeys.movements, queryFn: loadMovements, enabled: has("inventory:read") });
  const expensesQuery = useQuery({ queryKey: rasiKeys.expenses, queryFn: loadExpenses, enabled: has("expenses:read") });
  const settingsQuery = useQuery({ queryKey: rasiKeys.settings, queryFn: loadSettings, enabled: has("settings:manage") });
  const employeesQuery = useQuery({ queryKey: rasiKeys.profiles, queryFn: loadEmployees, enabled: has("employees:manage") });

  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const brands = brandsQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  const sales = salesQuery.data ?? [];
  const purchases = purchasesQuery.data ?? [];
  const movements = movementsQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const settings = settingsQuery.data;
  const enabledNav = navItems.filter((item) => !item.permission || has(item.permission));
  const lowStock = products.filter((product) => ["critical", "low", "out-of-stock"].includes(getStockStatus(Number(product.current_stock), Number(product.minimum_stock), product.maximum_stock === null ? null : Number(product.maximum_stock))));
  const visibleSales = sales.filter((sale) => sale.status === "completed");
  const todaysSales = visibleSales.filter((sale) => new Date(sale.sale_date) >= new Date(todayStart()));
  const todaysPurchases = purchases.filter((purchase) => purchase.status === "received" && purchase.purchase_date >= todayIso());
  const todaysExpenses = expenses.filter((expense) => expense.expense_date === todayIso());
  const dailyRevenue = todaysSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const dailyPurchasesValue = todaysPurchases.reduce((sum, purchase) => sum + Number(purchase.total_amount), 0);
  const customerOutstanding = visibleSales.reduce((sum, sale) => sum + Number(sale.balance_due), 0);
  const supplierOutstanding = purchases.filter((purchase) => purchase.status === "received").reduce((sum, purchase) => sum + Number(purchase.balance_due), 0);
  const inventoryValue = products.reduce((sum, product) => sum + Number(product.current_stock) * Number(product.purchase_price), 0);
  const dailyCost = todaysSales.reduce((sum, sale) => {
    const items = Array.isArray(sale.sale_items) ? sale.sale_items : [];
    return sum + items.reduce((lineSum, item) => lineSum + Number(item.quantity) * Number(item.unit_cost), 0);
  }, 0);
  const dailyProfit = Math.max(0, dailyRevenue - dailyCost);
  const periodRevenue = visibleSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const monthlyExpenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const currentMonth = todayIso().slice(0, 7);
  const monthRevenue = visibleSales.filter((sale) => sale.sale_date.startsWith(currentMonth)).reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const monthExpenses = expenses.filter((expense) => expense.expense_date.startsWith(currentMonth)).reduce((sum, expense) => sum + Number(expense.amount), 0);

  useEffect(() => {
    const errors = [productsQuery.error, categoriesQuery.error, brandsQuery.error, customersQuery.error, suppliersQuery.error, salesQuery.error, purchasesQuery.error, movementsQuery.error, expensesQuery.error, settingsQuery.error, employeesQuery.error].filter(Boolean);
    if (errors.length) toast.error(readError(errors[0]));
  }, [productsQuery.error, categoriesQuery.error, brandsQuery.error, customersQuery.error, suppliersQuery.error, salesQuery.error, purchasesQuery.error, movementsQuery.error, expensesQuery.error, settingsQuery.error, employeesQuery.error]);

  function refreshAll() {
    void queryClient.invalidateQueries({ queryKey: rasiKeys.all });
  }

  function changePage(next: Page) {
    setPage(next);
    setSearchText("");
    setMobileNavOpen(false);
    setSelectedSale(null);
    setSelectedPurchase(null);
    if (next === "pos" && !resumeSaleId) {
      setCart([]);
      setPayment(initialPayment());
    }
  }

  async function submitAction(action: () => Promise<unknown>, successMessage: string) {
    setSaving(true);
    try {
      await action();
      toast.success(successMessage);
      setDialog(null);
      setEditing(null);
      refreshAll();
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    await navigate({ to: "/auth", replace: true });
  }

  function openCreate(type: string) {
    setEditing(null);
    setDialog(type);
  }

  function openEdit(type: string, record: Product | Customer | Supplier) {
    setEditing(record);
    setDialog(type);
  }

  async function archiveRecord(table: "products" | "customers" | "suppliers", record: Product | Customer | Supplier) {
    if (!window.confirm(`Archive “${"product_name" in record ? record.product_name : "customer_name" in record ? record.customer_name : record.supplier_name}”?`)) return;
    const { error } = await supabase.from(table).update({ archived_at: new Date().toISOString() }).eq("id", record.id).eq("business_id", RASI_BUSINESS_ID);
    if (error) { toast.error(error.message); return; }
    toast.success("Record archived.");
    refreshAll();
  }

  function addToCart(product: Product) {
    if (Number(product.current_stock) <= 0) {
      toast.error("This product is out of stock.");
      return;
    }
    setCart((current) => {
      const found = current.find((line) => line.productId === product.id);
      if (found) {
        if (found.quantity + 1 > Number(product.current_stock)) {
          toast.error("Not enough stock for that quantity.");
          return current;
        }
        return current.map((line) => line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      }
      return [...current, { productId: product.id, quantity: 1, discountRate: 0 }];
    });
  }

  function updateCartLine(productId: string, changes: Partial<CartLine>) {
    setCart((current) => current.map((line) => line.productId === productId ? { ...line, ...changes } : line));
  }

  const matchedProducts = products.filter((product) => {
    if (!product.is_active) return false;
    const normalized = searchText.trim().toLowerCase();
    return !normalized || [product.product_name, product.sku, product.part_number, product.oem_number, product.barcode, product.brand_name].some((value) => value?.toLowerCase().includes(normalized));
  });
  const cartRows = cart.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    return { ...line, product };
  }).filter((line): line is typeof line & { product: Product } => Boolean(line.product));
  const totals = calculateInvoiceTotals(cartRows.map(({ product, quantity, discountRate }) => ({
    quantity,
    unitPrice: Number(product.selling_price),
    discountRate,
    gstRate: Number(product.gst_rate),
  })), interstate, Boolean(settings?.tax_inclusive));
  const paidNow = [payment.cash, payment.upi, payment.card, payment.bank].reduce((sum, value) => sum + (Number(value) || 0), 0);

  async function finishSale(status: "draft" | "completed") {
    if (cartRows.length === 0) { toast.error("Add a product to this bill first."); return; }
    if (paidNow > totals.total) { toast.error("Payment amounts cannot be greater than the bill total."); return; }
    const payments = status === "draft" ? [] : ([
      ["cash", payment.cash], ["upi", payment.upi], ["card", payment.card], ["bank_transfer", payment.bank],
    ] as const).filter(([, amount]) => Number(amount) > 0).map(([payment_method, amount]) => ({ payment_method, amount: Math.round(Number(amount) * 100) / 100, reference_number: "" }));
    setSaving(true);
    try {
      const saleId = await createSale({
        items: cartRows.map((line) => ({ product_id: line.productId, quantity: line.quantity, discount_rate: line.discountRate })),
        payments,
        customerId: customerId === "walk-in" ? null : customerId,
        interstate,
        status,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(status === "draft" ? "Bill saved as a draft." : "Sale completed and stock updated.");
      setCart([]);
      setPayment(initialPayment());
      setCustomerId("walk-in");
      setResumeSaleId(null);
      refreshAll();
      if (status === "completed") setSelectedSale(saleId);
      else changePage("sales");
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setSaving(false);
    }
  }

  async function resumeDraft(sale: Sale) {
    const { data, error } = await supabase.from("sale_items").select("product_id, quantity, discount_rate").eq("sale_id", sale.id);
    if (error) { toast.error(error.message); return; }
    setCart((data ?? []).filter((item): item is { product_id: string; quantity: number; discount_rate: number } => Boolean(item.product_id)).map((item) => ({ productId: item.product_id, quantity: Number(item.quantity), discountRate: Number(item.discount_rate) })));
    setCustomerId(sale.customer_id ?? "walk-in");
    setResumeSaleId(sale.id);
    setPage("pos");
    toast.message("Draft items are on the bill. Saving a new invoice will leave the original draft intact.");
  }

  const pageTitle = enabledNav.find((item) => item.id === page)?.label ?? "Overview";
  const pageDescription: Record<Page, string> = {
    dashboard: "Here’s what’s happening in your business today.",
    pos: "Search parts, add them to the bill and take payment.",
    sales: "A clear view of every draft and completed invoice.",
    products: "Manage spare parts, prices and availability.",
    inventory: "Every adjustment and stock movement, accounted for.",
    purchases: "Record received goods and amounts paid to suppliers.",
    customers: "Keep customer details and credit balances in one place.",
    suppliers: "Supplier contacts and purchasing history.",
    expenses: "Record day-to-day business spending.",
    reports: "Useful summaries from real business records.",
    employees: "Review your team and their individual roles.",
    settings: "Set your business details before printing an invoice.",
  };

  return (
    <div className="workspace flex min-h-screen bg-background">
      {mobileNavOpen && <button className="fixed inset-0 z-30 cursor-default bg-primary/40 md:hidden" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar-nav no-print fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex h-[68px] items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><Wrench className="size-4" /></div>
          <div className="min-w-0"><p className="truncate text-[13px] font-bold tracking-[0.045em]">RASI AUTOMOBILES</p><p className="mt-0.5 text-[11px] text-sidebar-foreground/60">Parts · Billing · Stock</p></div>
        </div>
        <div className="sidebar-scroll flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/45">WORKSPACE</p>
          <nav className="space-y-1">
            {enabledNav.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} onClick={() => changePage(item.id)} className={`nav-link group flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] font-medium transition-colors ${page === item.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"}`}>
                <Icon className={`size-[17px] shrink-0 ${page === item.id ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"}`} />
                <span className="truncate">{item.label}</span>
                {item.id === "inventory" && lowStock.length > 0 && <span className="ml-auto rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-bold text-warning-foreground">{lowStock.length}</span>}
              </button>;
            })}
          </nav>
          <div className="mt-7 border-t border-sidebar-border pt-4">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/45">COUNTER</p>
            <button onClick={() => changePage("pos")} className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-[13px] font-semibold text-sidebar-primary transition-colors hover:bg-sidebar-accent"><ShoppingCart className="size-[17px]" />Create a new bill<ArrowRight className="ml-auto size-3.5" /></button>
          </div>
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-md p-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">{user.fullName.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-sidebar-foreground">{user.fullName}</p><p className="mt-0.5 truncate text-[10px] capitalize text-sidebar-foreground/55">{user.roleId.replaceAll("_", " ")}</p></div>
            <Button variant="ghost" size="icon" className="size-8 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}><LogOut /></Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[68px] items-center gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="shrink-0 md:hidden" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu /></Button>
          <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold text-foreground">{pageTitle}</h1><p className="hidden truncate text-[11px] text-muted-foreground sm:block">{pageDescription[page]}</p></div>
          <div className="relative hidden w-full max-w-[250px] md:block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search this page" placeholder="Find products, records…" value={searchText} onChange={(event) => setSearchText(event.target.value)} className="h-9 border-0 bg-muted pl-9 text-xs shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-1" /></div>
          <Button variant="ghost" size="icon" className="relative size-9 text-muted-foreground" aria-label={`Stock alerts${lowStock.length ? `, ${lowStock.length} items` : ""}`} title="Stock alerts" onClick={() => changePage("inventory")}><Bell className="size-[17px]" />{lowStock.length > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-warning ring-2 ring-background" />}</Button>
          <div className="hidden h-7 w-px bg-border sm:block" />
          <button onClick={() => changePage(has("settings:manage") ? "settings" : "dashboard")} className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-xs font-semibold text-primary" title={user.email} aria-label={`Signed in as ${user.fullName}`}>{user.fullName.slice(0, 1).toUpperCase()}</button>
        </header>

        <div className="workspace-content mx-auto w-full max-w-[1560px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
          {page === "dashboard" && <DashboardView user={user} settings={settings} loading={productsQuery.isPending || salesQuery.isPending} products={products} sales={visibleSales} purchases={purchases} customers={customers} lowStock={lowStock} todaySales={dailyRevenue} todayPurchases={dailyPurchasesValue} todayProfit={dailyProfit} customerOutstanding={customerOutstanding} supplierOutstanding={supplierOutstanding} inventoryValue={inventoryValue} todayExpenses={todaysExpenses.reduce((sum, row) => sum + Number(row.amount), 0)} monthRevenue={monthRevenue} monthExpenses={monthExpenses} onNavigate={changePage} />}
          {page === "products" && <ProductsView products={products} categories={categories} brands={brands} search={searchText} loading={productsQuery.isPending} has={has} onAdd={() => openCreate("product")} onEdit={(record) => openEdit("product", record)} onArchive={(record) => void archiveRecord("products", record)} onExport={() => exportCsv("rasi-products", products)} />}
          {page === "inventory" && <InventoryView products={products} movements={movements} lowStock={lowStock} search={searchText} loading={productsQuery.isPending || movementsQuery.isPending} has={has} onAdjust={(product) => { setInventoryProduct(product.id); setDialog("adjustment"); }} onReorder={(product) => { changePage("purchases"); setDialog("purchase"); }} />}
          {page === "pos" && <PosView products={matchedProducts} allProducts={products} customers={customers} cart={cartRows} totals={totals} payment={payment} setPayment={setPayment} customerId={customerId} setCustomerId={setCustomerId} interstate={interstate} setInterstate={setInterstate} search={searchText} setSearch={setSearchText} updateCartLine={updateCartLine} addToCart={addToCart} onRemove={(id) => setCart((current) => current.filter((line) => line.productId !== id))} onSaveDraft={() => void finishSale("draft")} onComplete={() => void finishSale("completed")} loading={saving} />}
          {page === "sales" && <SalesView sales={sales} search={searchText} loading={salesQuery.isPending} selectedSale={selectedSale} has={has} onSelect={setSelectedSale} onResume={(sale) => void resumeDraft(sale)} onNewSale={() => changePage("pos")} onExport={() => exportCsv("rasi-sales", visibleSales)} />}
          {page === "purchases" && <PurchasesView purchases={purchases} search={searchText} loading={purchasesQuery.isPending} selectedPurchase={selectedPurchase} has={has} onSelect={setSelectedPurchase} onCreate={() => openCreate("purchase")} onExport={() => exportCsv("rasi-purchases", purchases)} />}
          {page === "customers" && <PeopleView kind="customer" items={customers} search={searchText} loading={customersQuery.isPending} has={has} onAdd={() => openCreate("customer")} onEdit={(record) => openEdit("customer", record)} onArchive={(record) => void archiveRecord("customers", record)} onExport={() => exportCsv("rasi-customers", customers)} />}
          {page === "suppliers" && <PeopleView kind="supplier" items={suppliers} search={searchText} loading={suppliersQuery.isPending} has={has} onAdd={() => openCreate("supplier")} onEdit={(record) => openEdit("supplier", record)} onArchive={(record) => void archiveRecord("suppliers", record)} onExport={() => exportCsv("rasi-suppliers", suppliers)} />}
          {page === "expenses" && <ExpensesView expenses={expenses} search={searchText} loading={expensesQuery.isPending} has={has} onAdd={() => openCreate("expense")} onExport={() => exportCsv("rasi-expenses", expenses)} />}
          {page === "reports" && <ReportsView sales={visibleSales} purchases={purchases} expenses={expenses} products={products} lowStock={lowStock} inventoryValue={inventoryValue} has={has} onExport={() => exportCsv("rasi-report-sales", visibleSales)} />}
          {page === "employees" && <EmployeesView employees={employeesQuery.data ?? []} roles={employeesQuery.data?.flatMap((employee) => employee.user_roles ?? []) ?? []} loading={employeesQuery.isPending} />}
          {page === "settings" && <SettingsView settings={settings} loading={settingsQuery.isPending} has={has} saving={saving} onSave={(values) => void submitAction(() => updateSettings(values), "Business settings saved.")} />}
        </div>
      </main>

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open && !saving) { setDialog(null); setEditing(null); } }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialogTitle(dialog, editing)}</DialogTitle><DialogDescription>{dialogDescription(dialog)}</DialogDescription></DialogHeader>
          {dialog === "product" && <ProductForm record={editing && "product_name" in editing ? editing : null} categories={categories} brands={brands} suppliers={suppliers} saving={saving} onSubmit={(values) => void submitAction(async () => {
            const opening = Number(values.opening_stock);
            const { opening_stock: _openingStock, ...record } = values;
            const saved = await saveProduct(record, editing?.id);
            if (!editing && opening > 0) await adjustInventory(saved.id, opening, "Opening stock");
          }, editing ? "Product updated." : "Product added.")} onCategory={(name) => void submitAction(async () => { await saveCategory(name); refreshAll(); }, "Category added.")} onBrand={(name) => void submitAction(async () => { await saveBrand(name); refreshAll(); }, "Brand added.")} />}
          {dialog === "customer" && <CustomerForm record={editing && "customer_name" in editing ? editing : null} saving={saving} onSubmit={(values) => void submitAction(() => saveCustomer(values, editing?.id), editing ? "Customer updated." : "Customer added.")} />}
          {dialog === "supplier" && <SupplierForm record={editing && "supplier_name" in editing ? editing : null} saving={saving} onSubmit={(values) => void submitAction(() => saveSupplier(values, editing?.id), editing ? "Supplier updated." : "Supplier added.")} />}
          {dialog === "expense" && <ExpenseForm saving={saving} onSubmit={(values) => void submitAction(() => saveExpense(values), "Expense recorded.")} />}
          {dialog === "purchase" && <PurchaseForm products={products} suppliers={suppliers} saving={saving} onSubmit={(values) => void submitAction(() => receivePurchase(values), "Goods received. Stock and supplier balances updated.")} />}
          {dialog === "adjustment" && <AdjustmentForm product={products.find((item) => item.id === inventoryProduct) ?? null} saving={saving} onSubmit={(values) => void submitAction(() => adjustInventory(values.productId, values.delta, values.reason), "Stock movement recorded.")} />}
        </DialogContent>
      </Dialog>
      <div className="hidden"><span>{resumeSaleId ?? ""}</span><span>{todaysSales.length} completed sales today</span></div>
    </div>
  );
}
