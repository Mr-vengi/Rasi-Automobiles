import { useEffect, useState, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowDownLeft, ArrowDownToLine, ArrowLeftRight, ArrowRight, ArrowUpRight, BadgeIndianRupee,
  Bell, Boxes, BriefcaseBusiness, Check, ChevronDown, CircleHelp, Clock3, Download,
  FileBarChart2, FileText, Filter, Fuel, LayoutDashboard, LogOut, Menu, Minus,
  MoreHorizontal, PackageCheck, PackagePlus, Plus, Printer, ReceiptIndianRupee,
  Search, Settings, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal,
  Sparkles, Store, Trash2, Truck, UserRound, Users, Wallet, Wrench, X, CloudUpload, AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/integrations/firebase/client";
import { RasiAppContext } from "@/components/rasi/app-context";
import { calculateInvoiceTotals, getStockStatus } from "@/lib/rasi-calculations";
import {
  RASI_BUSINESS_ID, adjustInventory, createSale, loadBrands, loadCategories,
  loadCustomers, loadEmployees, loadExpenses, loadMovements, loadProducts,
  loadPurchases, loadSales, loadSettings, loadSuppliers, receivePurchase,
  rasiKeys, saveBrand, saveCategory, saveCustomer, recordCustomerBill, saveExpense, saveProduct,
  saveSupplier, updateSettings, syncAllToFirebase, deleteOrArchiveRecord,
  clearAllProducts, clearAllSales, fbDeleteSale,
} from "@/lib/rasi-data";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// Component imports
import { DashboardView } from "./dashboard-view";
import { PosView, type ExtraChargeState, type CustomerDetailsState } from "./pos-view";
import { ProductsView } from "./products-view";
import { InventoryView } from "./inventory-view";
import { SalesView } from "./sales-view";
import { PurchasesView } from "./purchases-view";
import { PeopleView } from "./people-view";
import { ExpensesView } from "./expenses-view";
import { ReportsView } from "./reports-view";
import { EmployeesView } from "./employees-view";
import { SettingsView } from "./settings-view";
import {
  ProductForm, CustomerForm, SupplierForm, ExpenseForm, PurchaseForm,
  AdjustmentForm, dialogTitle, dialogDescription,
} from "./dialogs";
import { exportToCsv } from "./csv-utils";

type Page = "dashboard" | "pos" | "sales" | "products" | "inventory" | "purchases" | "customers" | "suppliers" | "expenses" | "reports" | "employees" | "settings";
type IconComponent = typeof LayoutDashboard;
type Product = Tables<"products">;
type Customer = Tables<"customers">;
type Supplier = Tables<"suppliers">;
type Sale = Awaited<ReturnType<typeof loadSales>>[number];
type Purchase = Awaited<ReturnType<typeof loadPurchases>>[number];
type NavItem = { id: Page; label: string; icon: IconComponent; permission?: string };
type CartLine = { productId: string; quantity: number; discountRate: number; product?: Product; productName?: string; partNumber?: string };
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

export function RasiWorkspace({ initialPage }: { initialPage?: Page } = {}) {
  const rasiApp = useContext(RasiAppContext);
  if (!rasiApp) throw new Error("Rasi user session is unavailable");
  const { user } = rasiApp;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isOwnerAdmin =
    (user.email || "").toLowerCase().trim() === "ranjithselvaraj14@gmail.com" ||
    user.roleId === "administrator" ||
    user.roleId === "admin" ||
    user.roleId === "owner";

  const [page, setPage] = useState<Page>(() => {
    if (initialPage) {
      if (!isOwnerAdmin && !["pos", "products", "inventory"].includes(initialPage)) return "pos";
      return initialPage;
    }
    if (typeof window !== "undefined") {
      const path = window.location.pathname.replace(/^\/_authenticated/, "").replace(/^\//, "");
      const validPages: Page[] = ["dashboard", "pos", "sales", "products", "inventory", "purchases", "customers", "suppliers", "expenses", "reports", "employees", "settings"];
      if (validPages.includes(path as Page)) {
        if (!isOwnerAdmin && !["pos", "products", "inventory"].includes(path)) return "pos";
        return path as Page;
      }
    }
    return isOwnerAdmin ? "dashboard" : "pos";
  });

  useEffect(() => {
    if (initialPage) {
      if (!isOwnerAdmin && !["pos", "products", "inventory"].includes(initialPage)) {
        setPage("pos");
      } else {
        setPage(initialPage);
      }
    }
  }, [initialPage, isOwnerAdmin]);

  useEffect(() => {
    if (!isOwnerAdmin && !["pos", "products", "inventory"].includes(page)) {
      setPage("pos");
      if (typeof window !== "undefined" && window.location.pathname !== "/pos") {
        window.history.replaceState(null, "", "/pos");
      }
    }
  }, [isOwnerAdmin, page]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/_authenticated/, "").replace(/^\//, "");
      const validPages: Page[] = ["dashboard", "pos", "sales", "products", "inventory", "purchases", "customers", "suppliers", "expenses", "reports", "employees", "settings"];
      if (validPages.includes(path as Page)) {
        if (!isOwnerAdmin && !["pos", "products", "inventory"].includes(path)) {
          setPage("pos");
        } else {
          setPage(path as Page);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isOwnerAdmin]);
  const [searchText, setSearchText] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dialog, setDialog] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | Customer | Supplier | null>(null);
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<string | null>(null);
  const [inventoryProduct, setInventoryProduct] = useState("");
  const [cart, setCart] = useState<CartLine[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("rasi_active_cart");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed?.items)) return parsed.items;
        }
      } catch {}
    }
    return [];
  });
  const [customerId, setCustomerId] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("rasi_active_cart");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.customerId) return parsed.customerId;
        }
      } catch {}
    }
    return "walk-in";
  });
  const [customerDetails, setCustomerDetails] = useState<CustomerDetailsState>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("rasi_active_cart");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.customerDetails) {
            return {
              ...parsed.customerDetails,
              name: parsed.customerDetails.name === "Walk-in Customer" ? "" : parsed.customerDetails.name,
              phone: String(parsed.customerDetails.phone || "").replace(/\D/g, "").slice(-10),
            };
          }
        }
      } catch {}
    }
    return {
      name: "",
      phone: "",
      gstin: "",
      address: "",
    };
  });
  const [extraCharge, setExtraCharge] = useState<ExtraChargeState>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("rasi_active_cart");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.extraCharge) return parsed.extraCharge;
        }
      } catch {}
    }
    return {
      enabled: false,
      label: "Auto Charge",
      amount: 0,
    };
  });
  const [autoPrintSaleId, setAutoPrintSaleId] = useState<string | null>(null);
  const [interstate, setInterstate] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("rasi_active_cart");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed?.interstate === "boolean") return parsed.interstate;
        }
      } catch {}
    }
    return false;
  });
  const [payment, setPayment] = useState<PaymentForm>(initialPayment);
  const [resumeSaleId, setResumeSaleId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("rasi_active_cart");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.saleId) return parsed.saleId;
        }
      } catch {}
    }
    return null;
  });
  const [saving, setSaving] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [cloudNotice, setCloudNotice] = useState(false);

  async function handleManualSync() {
    setSyncingCloud(true);
    try {
      const res = await syncAllToFirebase();
      if (res.success) {
        setCloudNotice(false);
        toast.success(`Cloud Sync complete! ${res.totalSynced} items stored in Firebase Firestore.`);
        refreshAll();
      } else if (res.isPermissionDenied) {
        setCloudNotice(true);
        toast.error("Cloud Firestore rules are locked (permission-denied). In Firebase Console > Cloud Firestore > Rules, set 'allow read, write: if true;' and Publish.", { duration: 9000 });
      } else {
        toast.error(res.error || "Firebase sync failed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Sync error");
    } finally {
      setSyncingCloud(false);
    }
  }

  const has = (permission: string) => user.permissions.includes(permission);

  const productsQuery = useQuery({ queryKey: rasiKeys.products, queryFn: loadProducts, enabled: has("products:read") });
  const categoriesQuery = useQuery({ queryKey: rasiKeys.categories, queryFn: loadCategories, enabled: has("products:read") });
  const brandsQuery = useQuery({ queryKey: rasiKeys.brands, queryFn: loadBrands, enabled: has("products:read") });
  const customersQuery = useQuery({ queryKey: rasiKeys.customers, queryFn: loadCustomers, enabled: has("customers:read") });
  const suppliersQuery = useQuery({ queryKey: rasiKeys.suppliers, queryFn: loadSuppliers, enabled: has("suppliers:read") });
  const salesQuery = useQuery({ queryKey: rasiKeys.sales, queryFn: loadSales, enabled: has("sales:read") });
  const purchasesQuery = useQuery({ queryKey: rasiKeys.purchases, queryFn: loadPurchases, enabled: has("purchases:read") });
  const movementsQuery = useQuery({ queryKey: rasiKeys.movements, queryFn: () => loadMovements(), enabled: has("inventory:read") });
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

  const effectiveOwnerName = settings?.owner_name?.trim() || "RANJITH SELVARAJ";
  const displayUserName = isOwnerAdmin
    ? effectiveOwnerName
    : user.fullName.replace(/\s*\([^)]*\)/g, "").trim();
  const displayUserInitials = (displayUserName.charAt(0) || "R").toUpperCase();

  // For other users (staff), only show product, inventory, and new bill
  const enabledNav = isOwnerAdmin
    ? navItems
    : navItems.filter((item) => ["pos", "products", "inventory"].includes(item.id));
  const lowStock = products.filter((product) =>
    ["critical", "low", "out-of-stock"].includes(
      getStockStatus(Number(product.current_stock), Number(product.minimum_stock), product.maximum_stock === null ? null : Number(product.maximum_stock))
    )
  );

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
    return sum + items.reduce((lineSum: number, item: any) => lineSum + Number(item.quantity) * Number(item.unit_cost), 0);
  }, 0);
  const dailyProfit = Math.max(0, dailyRevenue - dailyCost);

  const currentMonth = todayIso().slice(0, 7);
  const monthRevenue = visibleSales.filter((sale) => sale.sale_date.startsWith(currentMonth)).reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const monthExpenses = expenses.filter((expense) => expense.expense_date.startsWith(currentMonth)).reduce((sum, expense) => sum + Number(expense.amount), 0);

  useEffect(() => {
    const errors = [
      productsQuery.error, categoriesQuery.error, brandsQuery.error, customersQuery.error,
      suppliersQuery.error, salesQuery.error, purchasesQuery.error, movementsQuery.error,
      expensesQuery.error, settingsQuery.error, employeesQuery.error,
    ].filter(Boolean);
    if (errors.length) toast.error(readError(errors[0]));
  }, [
    productsQuery.error, categoriesQuery.error, brandsQuery.error, customersQuery.error,
    suppliersQuery.error, salesQuery.error, purchasesQuery.error, movementsQuery.error,
    expensesQuery.error, settingsQuery.error, employeesQuery.error,
  ]);

  // Sync recent sales to server in-memory store so mobile invoice QR scans load immediately
  useEffect(() => {
    if (sales && sales.length > 0) {
      for (const s of sales.slice(0, 30)) {
        void fetch("/api/invoice-cache", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: s.id, sale: s, settings }),
        }).catch(() => { });
      }
    }
  }, [sales, settings]);

  // Migrate legacy store address/email in browser localStorage to current official details
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("rasi_settings");
        if (stored) {
          const parsed = JSON.parse(stored);
          let changed = false;
          if (
            parsed.address?.includes("Trichy Main Road") ||
            parsed.address?.includes("Manalurpet") ||
            parsed.address?.includes("DHURUGAM") ||
            parsed.address?.includes("RAICEMILL") ||
            !parsed.address
          ) {
            parsed.address = "Durgam Bypass Near Tollgate, Lena Morden Rice mill Opposite, Kallakurichi , 606213";
            changed = true;
          }
          if (parsed.email === "contact@rasiautomobiles.com" || !parsed.email) {
            parsed.email = "ranjithselvaraj14@gmail.com";
            changed = true;
          }
          if (
            !parsed.invoice_footer ||
            parsed.invoice_footer.includes("Drive safely") ||
            parsed.invoice_footer.includes("Thank you for choosing") ||
            parsed.invoice_footer.includes("Thank you for your business")
          ) {
            parsed.invoice_footer = "Your Satisfaction, Our Priority – Thank You for Visiting Rasi Automobiles!";
            changed = true;
          }
          if (changed) {
            localStorage.setItem("rasi_settings", JSON.stringify(parsed));
            void queryClient.invalidateQueries({ queryKey: rasiKeys.settings });
          }
        }
      } catch { }

      // Clean slate migration: remove old sample products ("1", "2", "3", "4", "prod-1", etc.) and sample sales
      try {
        const WIPE_KEY = "rasi_wipe_all_demo_data_v1";
        if (!localStorage.getItem(WIPE_KEY)) {
          localStorage.setItem("rasi_products", "[]");
          localStorage.setItem("rasi_sales", "[]");
          localStorage.setItem("rasi_movements", "[]");
          localStorage.setItem("rasi_purchases", "[]");
          localStorage.setItem(WIPE_KEY, "true");
          void fetch("/api/clear-all", { method: "POST" }).catch(() => { });
          void queryClient.invalidateQueries({ queryKey: rasiKeys.all });
        }
      } catch { }
    }
  }, [queryClient]);

  const handleClearAllProducts = async () => {
    try {
      await clearAllProducts();
      await queryClient.refetchQueries({ queryKey: rasiKeys.products });
      await queryClient.invalidateQueries({ queryKey: rasiKeys.all });
      toast.success("All products have been removed from your catalog.");
    } catch (err) {
      toast.error(readError(err));
    }
  };

  const handleClearAllSales = async () => {
    try {
      await clearAllSales();
      await queryClient.refetchQueries({ queryKey: rasiKeys.sales });
      await queryClient.invalidateQueries({ queryKey: rasiKeys.all });
      setSelectedSale(null);
      setAutoPrintSaleId(null);
      toast.success("All invoices have been removed.");
    } catch (err) {
      toast.error(readError(err));
    }
  };

  function refreshAll() {
    void queryClient.invalidateQueries({ queryKey: rasiKeys.all });
  }

  function clearActiveCart() {
    setCart([]);
    setPayment(initialPayment());
    setCustomerId("walk-in");
    setCustomerDetails({ name: "", phone: "", gstin: "", address: "" });
    setExtraCharge({ enabled: false, label: "Auto Charge", amount: 0 });
    setInterstate(false);
    setResumeSaleId(null);
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem("rasi_active_cart"); } catch {}
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (cart.length === 0) {
      try { sessionStorage.removeItem("rasi_active_cart"); } catch {}
      if (resumeSaleId) {
        setResumeSaleId(null);
      }
      return;
    }
    if (resumeSaleId) {
      try {
        sessionStorage.setItem(
          "rasi_active_cart",
          JSON.stringify({
            saleId: resumeSaleId,
            items: cart,
            customerId,
            customerDetails,
            extraCharge,
            interstate,
          })
        );
      } catch {}
    }
  }, [cart, resumeSaleId, customerId, customerDetails, extraCharge, interstate]);

  function changePage(next: Page, preserveSelection = false) {
    if (!isOwnerAdmin && !["pos", "products", "inventory"].includes(next)) {
      next = "pos";
    }
    setPage(next);
    setSearchText("");
    setMobileNavOpen(false);
    if (!preserveSelection) {
      setSelectedSale(null);
      setSelectedPurchase(null);
    }
    if (typeof window !== "undefined") {
      const targetUrl = next === "dashboard" ? "/dashboard" : `/${next}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState(null, "", targetUrl);
      }
    }
    if (next === "pos" && !preserveSelection) {
      clearActiveCart();
    }
  }

  async function submitAction(action: () => Promise<unknown>, successMessage: string) {
    setSaving(true);
    try {
      await Promise.race([
        action(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Operation timed out.")), 4000)),
      ]);
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("rasi_staff_session");
    }
    try {
      await auth.signOut();
    } catch {
      // Ignored
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignored
    }
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
    const name = "product_name" in record ? record.product_name : "customer_name" in record ? record.customer_name : record.supplier_name;
    const kindLabel = table === "products" ? "product" : table === "customers" ? "customer" : "supplier";
    if (!window.confirm(`Are you sure you want to delete this ${kindLabel} “${name}”?`)) return;
    try {
      if (table === "products") {
        queryClient.setQueryData<Product[]>(rasiKeys.products, (old) => (old || []).filter((p) => p.id !== record.id));
        setCart((current) => current.filter((line) => line.productId !== record.id));
      } else if (table === "customers") {
        queryClient.setQueryData<Customer[]>(rasiKeys.customers, (old) => (old || []).filter((c) => c.id !== record.id));
      } else if (table === "suppliers") {
        queryClient.setQueryData<Supplier[]>(rasiKeys.suppliers, (old) => (old || []).filter((s) => s.id !== record.id));
      }
      await deleteOrArchiveRecord(table, record.id);
      toast.success(`${kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1)} deleted successfully.`);
      refreshAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete record.");
      refreshAll();
    }
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
      return [...current, { productId: product.id, quantity: 1, discountRate: 0, product }];
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
    let product = products.find((item) => item.id === line.productId);
    if (!product && line.product) {
      product = line.product;
    }
    if (!product) {
      product = products.find(
        (p) =>
          (line.productId && p.sku === line.productId) ||
          (line.partNumber && p.part_number === line.partNumber) ||
          (line.productName && p.product_name?.toLowerCase() === line.productName.toLowerCase())
      );
    }
    if (!product) {
      product = {
        id: line.productId || `prod-item-${Date.now()}`,
        business_id: RASI_BUSINESS_ID,
        product_name: (line as any).productName || "Spare part",
        sku: (line as any).partNumber || "",
        part_number: (line as any).partNumber || "",
        oem_number: "",
        barcode: "",
        brand_id: null,
        brand_name: "",
        category_id: null,
        category_name: "",
        description: "",
        unit: "Nos",
        purchase_price: (line as any).unitCost || 0,
        selling_price: (line as any).unitPrice || 0,
        wholesale_price: (line as any).unitPrice || 0,
        mrp: (line as any).unitPrice || 0,
        gst_rate: (line as any).gstRate || 18,
        hsn_code: (line as any).hsnCode || "8708",
        current_stock: 999,
        minimum_stock: 0,
        maximum_stock: null,
        shelf_location: "",
        supplier_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: null,
      };
    }
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
    if (status === "completed") {
      const missingCustomerDetails = [
        !customerDetails.name.trim() && "customer name",
        !/^\d{10}$/.test(customerDetails.phone) && "10-digit mobile number",
        !customerDetails.address.trim() && "address",
      ].filter(Boolean);
      if (missingCustomerDetails.length > 0) {
        toast.error(`Enter ${missingCustomerDetails.join(", ")} before completing the bill.`);
        return;
      }
    }

    const exactTotal = totals.total + (extraCharge.enabled ? Number(extraCharge.amount) : 0);
    const effectiveGrandTotal = Math.round(exactTotal);
    const tenderedTotal = Math.round(paidNow * 100) / 100;
    const changeReturn = Math.max(0, Math.round((tenderedTotal - effectiveGrandTotal) * 100) / 100);
    const appliedPaid = Math.min(effectiveGrandTotal, tenderedTotal);

    // Allocate payment methods ensuring applied payments do not exceed bill total
    let remainingToAllocate = appliedPaid;
    const rawPayments = status === "draft" ? [] : ([
      ["cash", payment.cash], ["upi", payment.upi], ["card", payment.card], ["bank_transfer", payment.bank],
    ] as const).filter(([, amount]) => Number(amount) > 0);

    const payments = rawPayments.map(([payment_method, amount]) => {
      const num = Number(amount);
      const allocated = Math.min(remainingToAllocate, num);
      remainingToAllocate = Math.max(0, remainingToAllocate - allocated);
      return {
        payment_method,
        amount: Math.round(allocated * 100) / 100,
        reference_number: "",
      };
    }).filter((p) => p.amount > 0);

    // Fallback if appliedPaid > 0 but payments ended empty
    if (status === "completed" && payments.length === 0 && appliedPaid > 0) {
      payments.push({
        payment_method: "cash",
        amount: Math.round(appliedPaid * 100) / 100,
        reference_number: "",
      });
    }

    setSaving(true);
    try {
      let billingCustomerId = customerId === "walk-in" ? null : customerId;
      if (status === "completed") {
        const mobile = customerDetails.phone.replace(/\D/g, "").slice(-10);
        const existingCustomer = customers.find(
          (customer) => customer.phone.replace(/\D/g, "").slice(-10) === mobile
        ) || customers.find((customer) => customer.id === billingCustomerId);
        const savedCustomer = await saveCustomer(
          {
            customer_name: customerDetails.name.trim(),
            phone: mobile,
            email: existingCustomer?.email || "",
            gstin: customerDetails.gstin.trim(),
            billing_address: customerDetails.address.trim(),
            customer_type: existingCustomer?.customer_type || "retail",
            credit_limit: existingCustomer?.credit_limit || 0,
            state: existingCustomer?.state || "Tamil Nadu",
            notes: existingCustomer?.notes || "",
          },
          existingCustomer?.id || billingCustomerId || undefined
        );
        billingCustomerId = savedCustomer.id;
      }

      const saleId = await createSale({
        items: cartRows.map((line) => ({ product_id: line.productId, quantity: line.quantity, discount_rate: line.discountRate })),
        payments,
        customerId: billingCustomerId,
        customerDetails: customerDetails.name
          ? {
            customer_name: customerDetails.name,
            phone: customerDetails.phone,
            gstin: customerDetails.gstin,
            billing_address: customerDetails.address,
          }
          : null,
        extraCharge: extraCharge.enabled && extraCharge.amount > 0 ? { label: extraCharge.label || "Auto Charge", amount: Number(extraCharge.amount) } : null,
        interstate,
        status,
        idempotencyKey: crypto.randomUUID(),
        tenderedAmount: tenderedTotal,
        changeReturned: changeReturn,
      });
      if (status === "completed" && billingCustomerId) {
        await recordCustomerBill(billingCustomerId);
      }
      toast.success(
        status === "draft"
          ? "Bill saved as a draft."
          : changeReturn > 0
            ? `Sale completed! Return change ₹${changeReturn.toFixed(2)} to customer.`
            : "Sale completed and stock updated."
      );
      setCart([]);
      setPayment(initialPayment());
      setCustomerId("walk-in");
      setCustomerDetails({ name: "", phone: "", gstin: "", address: "" });
      setExtraCharge({ enabled: false, label: "Auto Charge", amount: 0 });
      if (typeof window !== "undefined") {
        try { sessionStorage.removeItem("rasi_active_cart"); } catch {}
      }
      if (resumeSaleId && resumeSaleId !== saleId && status === "completed") {
        void fbDeleteSale(resumeSaleId).catch(() => { });
      }
      setResumeSaleId(null);
      await queryClient.refetchQueries({ queryKey: rasiKeys.sales });
      await queryClient.invalidateQueries({ queryKey: rasiKeys.all });
      if (status === "completed") {
        changePage("sales", true);
        setSelectedSale(saleId);
        setAutoPrintSaleId(saleId);
      } else {
        changePage("sales");
      }
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setSaving(false);
    }
  }

  async function resumeDraft(sale: Sale) {
    const rawItems = (sale as any).sale_items || (sale as any).items || [];
    let items: CartLine[] = [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      items = rawItems
        .filter((item: any) => Boolean(item.product_id || item.productId || item.product_name))
        .map((item: any) => {
          const pid = item.product_id || item.productId || `prod-draft-${Date.now()}`;
          const matched = products.find(
            (p) =>
              p.id === pid ||
              (item.part_number && p.part_number === item.part_number) ||
              (item.sku && p.sku === item.sku) ||
              (item.product_name && p.product_name?.toLowerCase() === item.product_name.toLowerCase())
          );
          const fallbackProduct: Product = matched || {
            id: pid,
            business_id: RASI_BUSINESS_ID,
            product_name: item.product_name || "Spare part",
            sku: item.sku || item.part_number || "",
            part_number: item.part_number || "",
            oem_number: item.oem_number || "",
            barcode: item.barcode || item.part_number || "",
            brand_id: null,
            brand_name: item.brand_name || "",
            category_id: null,
            category_name: item.category_name || "",
            description: "",
            unit: "Nos",
            purchase_price: Number(item.unit_cost) || 0,
            selling_price: Number(item.unit_price) || 0,
            wholesale_price: Number(item.unit_price) || 0,
            mrp: Number(item.mrp) || Number(item.unit_price) || 0,
            gst_rate: Number(item.gst_rate) || 18,
            hsn_code: item.hsn_code || "8708",
            current_stock: 999,
            minimum_stock: 0,
            maximum_stock: null,
            shelf_location: "",
            supplier_id: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            archived_at: null,
          };

          return {
            productId: matched ? matched.id : pid,
            quantity: Number(item.quantity) || 1,
            discountRate: Number(item.discount_rate) || 0,
            product: fallbackProduct,
            productName: item.product_name || "",
            partNumber: item.part_number || "",
          };
        });
    }

    // If items were not directly attached and sale.id is a UUID, try querying Supabase
    if (items.length === 0 && sale.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sale.id)) {
      try {
        const { data } = await supabase.from("sale_items").select("*").eq("sale_id", sale.id);
        if (data && data.length > 0) {
          items = data.map((item: any) => {
            const matched = products.find((p) => p.id === item.product_id);
            const fallbackProduct: Product = matched || {
              id: item.product_id,
              business_id: RASI_BUSINESS_ID,
              product_name: item.product_name || "Spare part",
              sku: item.part_number || "",
              part_number: item.part_number || "",
              oem_number: "",
              barcode: "",
              brand_id: null,
              brand_name: "",
              category_id: null,
              category_name: "",
              description: "",
              unit: "Nos",
              purchase_price: Number(item.unit_cost) || 0,
              selling_price: Number(item.unit_price) || 0,
              wholesale_price: Number(item.unit_price) || 0,
              mrp: Number(item.unit_price) || 0,
              gst_rate: Number(item.gst_rate) || 18,
              hsn_code: item.hsn_code || "8708",
              current_stock: 999,
              minimum_stock: 0,
              maximum_stock: null,
              shelf_location: "",
              supplier_id: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              archived_at: null,
            };
            return {
              productId: item.product_id,
              quantity: Number(item.quantity) || 1,
              discountRate: Number(item.discount_rate) || 0,
              product: fallbackProduct,
            };
          });
        }
      } catch { }
    }

    // If items still empty, try loading directly from Firestore by sale.id
    if (items.length === 0 && sale.id) {
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const { db } = await import("@/integrations/firebase/client");
        const snap = await getDoc(doc(db, "sales", sale.id));
        if (snap.exists()) {
          const fbSale = snap.data() as any;
          const fbItems = fbSale.sale_items || fbSale.items || [];
          if (Array.isArray(fbItems) && fbItems.length > 0) {
            items = fbItems
              .filter((item: any) => Boolean(item.product_id || item.product_name))
              .map((item: any) => {
                const pid = item.product_id || `prod-draft-${Date.now()}`;
                const matched = products.find(
                  (p) =>
                    p.id === pid ||
                    (item.part_number && p.part_number === item.part_number) ||
                    (item.product_name && p.product_name?.toLowerCase() === item.product_name.toLowerCase())
                );
                const fallbackProduct: Product = matched || {
                  id: pid,
                  business_id: RASI_BUSINESS_ID,
                  product_name: item.product_name || "Spare part",
                  sku: item.sku || item.part_number || "",
                  part_number: item.part_number || "",
                  oem_number: "",
                  barcode: "",
                  brand_id: null,
                  brand_name: item.brand_name || "",
                  category_id: null,
                  category_name: item.category_name || "",
                  description: "",
                  unit: "Nos",
                  purchase_price: Number(item.unit_cost) || 0,
                  selling_price: Number(item.unit_price) || 0,
                  wholesale_price: Number(item.unit_price) || 0,
                  mrp: Number(item.mrp) || Number(item.unit_price) || 0,
                  gst_rate: Number(item.gst_rate) || 18,
                  hsn_code: item.hsn_code || "8708",
                  current_stock: 999,
                  minimum_stock: 0,
                  maximum_stock: null,
                  shelf_location: "",
                  supplier_id: null,
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  archived_at: null,
                };
                return {
                  productId: matched ? matched.id : pid,
                  quantity: Number(item.quantity) || 1,
                  discountRate: Number(item.discount_rate) || 0,
                  product: fallbackProduct,
                  productName: item.product_name || "",
                  partNumber: item.part_number || "",
                };
              });
          }
        }
      } catch { }
    }

    const targetCustomerDetails = sale.customers
      ? {
          name: sale.customers.customer_name === "Walk-in Customer" ? "" : sale.customers.customer_name || "",
          phone: sale.customers.phone ? sale.customers.phone.replace(/\D/g, "").slice(-10) : "",
          gstin: sale.customers.gstin || "",
          address: sale.customers.billing_address || "",
        }
      : {
          name: "",
          phone: "",
          gstin: "",
          address: "",
        };

    const targetExtraCharge =
      sale.extra_charge_amount && Number(sale.extra_charge_amount) > 0
        ? {
            enabled: true,
            label: sale.extra_charge_label || "Auto Charge",
            amount: Number(sale.extra_charge_amount),
          }
        : { enabled: false, label: "Auto Charge", amount: 0 };

    const targetInterstate = Boolean(sale.is_interstate);

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "rasi_active_cart",
          JSON.stringify({
            saleId: sale.id,
            items,
            customerId: sale.customer_id ?? "walk-in",
            customerDetails: targetCustomerDetails,
            extraCharge: targetExtraCharge,
            interstate: targetInterstate,
          })
        );
      } catch {}
    }

    setResumeSaleId(sale.id);
    setCart(items);
    setCustomerId(sale.customer_id ?? "walk-in");
    setCustomerDetails(targetCustomerDetails);
    setExtraCharge(targetExtraCharge);
    setInterstate(targetInterstate);
    changePage("pos", true);
    toast.success(`Draft invoice ${sale.invoice_number || ""} loaded onto counter!`);
  }

  // Bulk import products handler
  async function handleBulkImportProducts(items: Omit<TablesInsert<"products">, "business_id">[]) {
    setSaving(true);
    try {
      for (const item of items) {
        await saveProduct(item);
      }
      toast.success(`Imported ${items.length} spare parts.`);
      refreshAll();
    } catch (err: unknown) {
      toast.error(readError(err));
      throw err;
    } finally {
      setSaving(false);
    }
  }

  const pageTitle = enabledNav.find((item) => item.id === page)?.label ?? "Overview";
  const pageDescription: Record<Page, string> = {
    dashboard: "Here’s what’s happening in your business today.",
    pos: "Search parts, scan barcodes, and generate invoices.",
    sales: "A clear view of every completed invoice and saved draft.",
    products: "Manage spare parts catalog, prices, and stock levels.",
    inventory: "Audited stock movements and low-stock reorder alerts.",
    purchases: "Receive spare parts and record supplier payables.",
    customers: "Customer CRM, ledgers, and credit limits.",
    suppliers: "Automobile parts distributors and supplier statements.",
    expenses: "Track operational overheads and daily cash drawer.",
    reports: "Comprehensive accounting summaries from stored records.",
    employees: "Team roster and role-based permissions matrix.",
    settings: "Configure business profile, GSTIN, UPI QR, and invoices.",
  };

  return (
    <div className="workspace min-h-screen bg-background">
      {mobileNavOpen && <button className="fixed inset-0 z-30 cursor-default bg-primary/40 md:hidden" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar-nav no-print fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex h-[72px] items-center gap-3 border-b border-sidebar-border px-4">
          <img
            src="/rasi-logo.png"
            alt="Rasi Automobiles Billing"
            className="size-11 shrink-0 rounded-full border border-sidebar-border bg-white shadow-xs object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black tracking-[0.03em] text-sidebar-foreground">
              RASI AUTOMOBILES
            </p>
            <p className="mt-0.5 text-[10.5px] font-semibold text-primary">
              Drive · Service · Bill Smartly
            </p>
          </div>
        </div>
        <div className="sidebar-scroll flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/45">WORKSPACE</p>
          <nav className="space-y-1">
            {enabledNav.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} onClick={() => changePage(item.id)} className={`nav-link group flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] font-medium transition-colors ${page === item.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"}`}>
                <Icon className={`size-[17px] shrink-0 ${page === item.id ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"}`} />
                <span className="truncate">{item.label}</span>
                {item.id === "inventory" && lowStock.length > 0 && <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">{lowStock.length}</span>}
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
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">{displayUserInitials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{displayUserName}</p>
              <p className="mt-0.5 truncate text-[10px] capitalize text-sidebar-foreground/55">{isOwnerAdmin ? "Administrator" : "Counter Staff"}</p>
            </div>
            <Button variant="ghost" size="icon" className="size-8 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}><LogOut /></Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" className="shrink-0" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
              <Menu />
            </Button>
            <img
              src="/rasi-logo.png"
              alt="Rasi Automobiles"
              className="size-8 rounded-full border bg-white object-cover shadow-xs"
            />
          </div>
          <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold text-foreground">{pageTitle}</h1><p className="hidden truncate text-[11px] text-muted-foreground sm:block">{pageDescription[page]}</p></div>
          <div className="relative hidden w-full max-w-[250px] md:block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search this page" placeholder="Find products, records…" value={searchText} onChange={(event) => setSearchText(event.target.value)} className="h-9 border-0 bg-muted pl-9 text-xs shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-1" /></div>
          <Button variant="ghost" size="icon" className="relative size-9 text-muted-foreground" aria-label={`Stock alerts${lowStock.length ? `, ${lowStock.length} items` : ""}`} title="Stock alerts" onClick={() => changePage("inventory")}><Bell className="size-[17px]" />{lowStock.length > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-amber-500 ring-2 ring-background" />}</Button>
          <div className="hidden h-7 w-px bg-border sm:block" />
          <button onClick={() => changePage(has("settings:manage") ? "settings" : "dashboard")} className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-xs font-semibold text-primary" title={user.email} aria-label={`Signed in as ${displayUserName}`}>{displayUserInitials}</button>
        </header>

        {cloudNotice && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="truncate">
                <strong>Cloud Firestore Locked:</strong> Firebase rejected writes (permission-denied). Go to <strong>Firebase Console &gt; Cloud Firestore &gt; Rules</strong>, set <code className="bg-amber-100 dark:bg-amber-950 px-1 py-0.5 rounded font-mono font-bold">allow read, write: if true;</code> and click <strong>Publish</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] bg-background font-semibold" onClick={() => void handleManualSync()}>
                Retry Sync
              </Button>
              <button onClick={() => setCloudNotice(false)} className="text-muted-foreground hover:text-foreground text-xs p-1" title="Dismiss">✕</button>
            </div>
          </div>
        )}

        <div className="workspace-content mx-auto w-full max-w-[1560px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
          {page === "dashboard" && (
            <DashboardView
              user={user}
              settings={settings}
              loading={productsQuery.isPending || salesQuery.isPending}
              products={products}
              sales={visibleSales}
              purchases={purchases}
              customers={customers}
              lowStock={lowStock}
              todaySales={dailyRevenue}
              todayPurchases={dailyPurchasesValue}
              todayProfit={dailyProfit}
              customerOutstanding={customerOutstanding}
              supplierOutstanding={supplierOutstanding}
              inventoryValue={inventoryValue}
              todayExpenses={todaysExpenses.reduce((sum, row) => sum + Number(row.amount), 0)}
              monthRevenue={monthRevenue}
              monthExpenses={monthExpenses}
              onNavigate={changePage}
            />
          )}
          {page === "products" && (
            <ProductsView
              products={products}
              categories={categories}
              brands={brands}
              search={searchText}
              loading={productsQuery.isPending}
              has={has}
              onAdd={() => openCreate("product")}
              onEdit={(record) => openEdit("product", record)}
              onArchive={(record) => void archiveRecord("products", record)}
              onExport={() => exportToCsv("rasi-products", products)}
              onClearAll={handleClearAllProducts}
              onImportBulk={handleBulkImportProducts}
            />
          )}
          {page === "inventory" && (
            <InventoryView
              products={products}
              movements={movements as any}
              lowStock={lowStock}
              search={searchText}
              loading={productsQuery.isPending || movementsQuery.isPending}
              has={has}
              onAdjust={(product) => { setInventoryProduct(product.id); setDialog("adjustment"); }}
              onReorder={(_product) => { changePage("purchases"); setDialog("purchase"); }}
            />
          )}
          {page === "pos" && (
            <PosView
              products={matchedProducts}
              allProducts={products}
              customers={customers}
              cart={cartRows}
              totals={totals}
              payment={payment}
              setPayment={setPayment}
              customerId={customerId}
              setCustomerId={setCustomerId}
              customerDetails={customerDetails}
              setCustomerDetails={setCustomerDetails}
              extraCharge={extraCharge}
              setExtraCharge={setExtraCharge}
              interstate={interstate}
              setInterstate={setInterstate}
              search={searchText}
              setSearch={setSearchText}
              updateCartLine={updateCartLine}
              addToCart={addToCart}
              onRemove={(id) => setCart((current) => current.filter((line) => line.productId !== id))}
              onClearCart={clearActiveCart}
              isResumed={Boolean(resumeSaleId)}
              onSaveDraft={() => void finishSale("draft")}
              onComplete={() => void finishSale("completed")}
              loading={saving}
            />
          )}
          {page === "sales" && (
            <SalesView
              sales={sales}
              search={searchText}
              loading={salesQuery.isPending}
              selectedSale={selectedSale}
              autoPrintSaleId={autoPrintSaleId}
              onClearAutoPrint={() => setAutoPrintSaleId(null)}
              has={has}
              onSelect={(val) => {
                setSelectedSale(val);
                if (!val) setAutoPrintSaleId(null);
              }}
              onResume={(sale) => void resumeDraft(sale as Sale)}
              onNewSale={() => changePage("pos")}
              onExport={() => exportToCsv("rasi-sales", visibleSales)}
              onClearAll={handleClearAllSales}
              settings={settings}
              onRefresh={refreshAll}
            />
          )}
          {page === "purchases" && (
            <PurchasesView
              purchases={purchases}
              search={searchText}
              loading={purchasesQuery.isPending}
              selectedPurchase={selectedPurchase}
              has={has}
              onSelect={setSelectedPurchase}
              onCreate={() => openCreate("purchase")}
              onExport={() => exportToCsv("rasi-purchases", purchases)}
            />
          )}
          {page === "customers" && (
            <PeopleView
              kind="customer"
              items={customers}
              search={searchText}
              loading={customersQuery.isPending}
              has={has}
              onAdd={() => openCreate("customer")}
              onEdit={(record) => openEdit("customer", record)}
              onArchive={(record) => void archiveRecord("customers", record)}
              onExport={() => exportToCsv("rasi-customers", customers)}
            />
          )}
          {page === "suppliers" && (
            <PeopleView
              kind="supplier"
              items={suppliers}
              search={searchText}
              loading={suppliersQuery.isPending}
              has={has}
              onAdd={() => openCreate("supplier")}
              onEdit={(record) => openEdit("supplier", record)}
              onArchive={(record) => void archiveRecord("suppliers", record)}
              onExport={() => exportToCsv("rasi-suppliers", suppliers)}
            />
          )}
          {page === "expenses" && (
            <ExpensesView
              expenses={expenses}
              search={searchText}
              loading={expensesQuery.isPending}
              has={has}
              onAdd={() => openCreate("expense")}
              onExport={() => exportToCsv("rasi-expenses", expenses)}
            />
          )}
          {page === "reports" && (
            <ReportsView
              sales={visibleSales}
              purchases={purchases}
              expenses={expenses}
              products={products}
              lowStock={lowStock}
              inventoryValue={inventoryValue}
              has={has}
              onExport={() => exportToCsv("rasi-report-sales", visibleSales)}
            />
          )}
          {page === "employees" && (
            <EmployeesView
              employees={employeesQuery.data ?? []}
              roles={employeesQuery.data?.flatMap((employee) => employee.user_roles ?? []) ?? []}
              loading={employeesQuery.isPending}
            />
          )}
          {page === "settings" && (
            <SettingsView
              settings={settings}
              loading={settingsQuery.isPending}
              has={has}
              saving={saving}
              onSave={(values) => void submitAction(async () => {
                await updateSettings(values);
                if (typeof window !== "undefined") {
                  const saved = localStorage.getItem("rasi_staff_session");
                  if (saved) {
                    try {
                      const parsed = JSON.parse(saved);
                      if (parsed.roleId === "administrator" || parsed.roleId === "admin" || parsed.roleId === "owner") {
                        parsed.fullName = values.owner_name?.trim() || "RANJITH SELVARAJ";
                        localStorage.setItem("rasi_staff_session", JSON.stringify(parsed));
                      }
                    } catch { }
                  }
                }
                refreshAll();
              }, "Business settings saved.")}
            />
          )}
        </div>
      </main>

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open && !saving) { setDialog(null); setEditing(null); } }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle(dialog, editing)}</DialogTitle>
            <DialogDescription>{dialogDescription(dialog)}</DialogDescription>
          </DialogHeader>
          {dialog === "product" && (
            <ProductForm
              record={editing && "product_name" in editing ? editing : null}
              categories={categories}
              brands={brands}
              suppliers={suppliers}
              saving={saving}
              onSubmit={(values) => void submitAction(async () => {
                const opening = Number(values.opening_stock);
                const { opening_stock: _openingStock, ...record } = values;
                const saved = await saveProduct(record, editing?.id);
                if (!editing && opening > 0) await adjustInventory(saved.id, opening, "Opening stock");
              }, editing ? "Product updated." : "Product added.")}
              onCategory={(name) => void submitAction(async () => { await saveCategory(name); refreshAll(); }, "Category added.")}
              onBrand={(name) => void submitAction(async () => { await saveBrand(name); refreshAll(); }, "Brand added.")}
            />
          )}
          {dialog === "customer" && (
            <CustomerForm
              record={editing && "customer_name" in editing ? editing : null}
              saving={saving}
              onSubmit={(values) => void submitAction(() => saveCustomer(values, editing?.id), editing ? "Customer updated." : "Customer added.")}
            />
          )}
          {dialog === "supplier" && (
            <SupplierForm
              record={editing && "supplier_name" in editing ? editing : null}
              saving={saving}
              onSubmit={(values) => void submitAction(() => saveSupplier(values, editing?.id), editing ? "Supplier updated." : "Supplier added.")}
            />
          )}
          {dialog === "expense" && (
            <ExpenseForm
              saving={saving}
              onSubmit={(values) => void submitAction(() => saveExpense(values), "Expense recorded.")}
            />
          )}
          {dialog === "purchase" && (
            <PurchaseForm
              products={products}
              suppliers={suppliers}
              saving={saving}
              onSubmit={(values) => void submitAction(() => receivePurchase(values), "Goods received. Stock and supplier balances updated.")}
            />
          )}
          {dialog === "adjustment" && (
            <AdjustmentForm
              product={products.find((item) => item.id === inventoryProduct) ?? null}
              saving={saving}
              onSubmit={(values) => void submitAction(() => adjustInventory(values.productId, values.delta, values.reason), "Stock movement recorded.")}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
