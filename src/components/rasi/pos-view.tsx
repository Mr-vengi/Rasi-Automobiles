import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search, Barcode as BarcodeIcon, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, QrCode, User, AlertCircle, Check, Printer,
  PauseCircle, ArrowRight, Sparkles, Filter, X, Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomerForm } from "./dialogs";
import { saveCustomer } from "@/lib/rasi-data";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import type { InvoiceTotals } from "@/lib/rasi-calculations";

type Product = Tables<"products">;
type Customer = Tables<"customers">;

export interface ExtraChargeState {
  enabled: boolean;
  label: string;
  amount: number;
}

export interface CustomerDetailsState {
  name: string;
  phone: string;
  gstin: string;
  address: string;
}

interface CartItem {
  productId: string;
  quantity: number;
  discountRate: number;
  product: Product;
}

interface PosViewProps {
  products: Product[];
  allProducts: Product[];
  customers: Customer[];
  cart: CartItem[];
  totals: InvoiceTotals;
  payment: { cash: string; upi: string; card: string; bank: string };
  setPayment: React.Dispatch<React.SetStateAction<{ cash: string; upi: string; card: string; bank: string }>>;
  customerId: string;
  setCustomerId: (id: string) => void;
  customerDetails: CustomerDetailsState;
  setCustomerDetails: React.Dispatch<React.SetStateAction<CustomerDetailsState>>;
  extraCharge: ExtraChargeState;
  setExtraCharge: React.Dispatch<React.SetStateAction<ExtraChargeState>>;
  interstate: boolean;
  setInterstate: (interstate: boolean) => void;
  search: string;
  setSearch: (search: string) => void;
  updateCartLine: (productId: string, changes: { quantity?: number; discountRate?: number }) => void;
  addToCart: (product: Product) => void;
  onRemove: (productId: string) => void;
  onClearCart?: () => void;
  isResumed?: boolean;
  onSaveDraft: () => void;
  onComplete: () => void;
  loading: boolean;
  onQuickAddCustomer?: (customer: Tables<"customers">) => void;
}

export function PosView({
  products,
  allProducts,
  customers,
  cart,
  totals,
  payment,
  setPayment,
  customerId,
  setCustomerId,
  customerDetails,
  setCustomerDetails,
  extraCharge,
  setExtraCharge,
  interstate,
  setInterstate,
  search,
  setSearch,
  updateCartLine,
  addToCart,
  onRemove,
  onClearCart,
  isResumed = false,
  onSaveDraft,
  onComplete,
  loading,
}: PosViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Extract unique categories for quick chips
  const categoryChips = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category_name) set.add(p.category_name);
    });
    return ["ALL", ...Array.from(set).slice(0, 8)];
  }, [allProducts]);

  // Selected customer details & credit check
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) || null,
    [customers, customerId]
  );

  const exactTotal = totals.total + (extraCharge.enabled ? Number(extraCharge.amount) : 0);
  const effectiveTotal = Math.round(exactTotal);
  const roundOff = Number((effectiveTotal - exactTotal).toFixed(2));
  const totalPaid = (Number(payment.cash) || 0) + (Number(payment.upi) || 0) + (Number(payment.card) || 0) + (Number(payment.bank) || 0);
  const changeReturn = Math.max(0, Math.round((totalPaid - effectiveTotal) * 100) / 100);
  const balanceDue = Math.max(0, Math.round((effectiveTotal - totalPaid) * 100) / 100);

  // Credit limit warning
  const exceedsCredit = useMemo(() => {
    if (!selectedCustomer || customerId === "walk-in") return false;
    const limit = Number(selectedCustomer.credit_limit || 0);
    if (limit <= 0) return false;
    return balanceDue > limit;
  }, [selectedCustomer, customerId, balanceDue]);

  // Handle direct Barcode Scanner Enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Try finding exact match by barcode or SKU
    const found = allProducts.find(
      (p) =>
        p.barcode?.toLowerCase() === query.toLowerCase() ||
        p.sku?.toLowerCase() === query.toLowerCase()
    );

    if (found) {
      addToCart(found);
      setBarcodeInput("");
    } else {
      // Set to search box
      setSearch(query);
      setBarcodeInput("");
    }
  };

  // Helper to find and autofill an existing customer by 10-digit phone number
  const lookupAndAutofillCustomer = (phoneInput: string) => {
    const cleanPhone = phoneInput.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) return false;

    // 1. Try finding in customers prop safely (avoid null/undefined crash)
    let found = customers.find((c) => {
      const p = String(c?.phone || "").replace(/\D/g, "");
      return p && (p.slice(-10) === cleanPhone || cleanPhone.slice(-10) === p);
    });

    // 2. Try finding in localStorage cached customers
    if (!found && typeof window !== "undefined") {
      try {
        const cached = JSON.parse(localStorage.getItem("rasi_customers") || "[]");
        if (Array.isArray(cached)) {
          found = cached.find((c: any) => {
            const p = String(c?.phone || "").replace(/\D/g, "");
            return p && (p.slice(-10) === cleanPhone || cleanPhone.slice(-10) === p);
          });
        }
      } catch { }
    }

    if (found) {
      setCustomerId(found.id);
      setCustomerDetails({
        name: found.customer_name || "",
        phone: cleanPhone,
        gstin: found.gstin || "",
        address: found.billing_address || "",
      });
      if (found.state && found.state !== "Tamil Nadu") {
        setInterstate(true);
      }
      toast.success(`Existing customer found: ${found.customer_name}`);
      return true;
    }

    // 3. Fallback: query backend /api/customers
    if (typeof window !== "undefined") {
      void fetch("/api/customers")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data?.customers)) {
            const match = data.customers.find((c: any) => {
              const p = String(c?.phone || "").replace(/\D/g, "");
              return p && (p.slice(-10) === cleanPhone || cleanPhone.slice(-10) === p);
            });
            if (match) {
              setCustomerId(match.id);
              setCustomerDetails({
                name: match.customer_name || "",
                phone: cleanPhone,
                gstin: match.gstin || "",
                address: match.billing_address || "",
              });
              if (match.state && match.state !== "Tamil Nadu") {
                setInterstate(true);
              }
              toast.success(`Existing customer found: ${match.customer_name}`);
            }
          }
        })
        .catch(() => { });
    }

    return false;
  };

  // Keyboard shortcut listener (F1 = focus search, F2 = focus barcode, F9 = complete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter products by category chip
  const displayedProducts = useMemo(() => {
    if (selectedCategory === "ALL") return products;
    return products.filter((p) => p.category_name === selectedCategory);
  }, [products, selectedCategory]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* =====================================================================
          LEFT SECTION: PRODUCT SEARCH, BARCODE & QUICK SELECT
          ===================================================================== */}
      <div className="space-y-4 lg:col-span-7">
        {/* Top Search & Barcode Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Text Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search part name, OEM, model... (F1)"
              className="h-10 pl-9 pr-8 text-xs font-medium shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Barcode Scanner Input */}
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <BarcodeIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={barcodeInputRef}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode / SKU (F2)..."
              className="h-10 pl-9 text-xs font-mono shadow-xs border-amber-500/50 focus-visible:ring-amber-500"
            />
          </form>
        </div>

        {/* Category Shortcut Chips */}
        <div className="flex flex-wrap gap-1.5 pb-1">
          {categoryChips.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${selectedCategory === cat
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid / List */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-h-[640px] overflow-y-auto pr-1">
          {displayedProducts.length > 0 ? (
            displayedProducts.map((product) => {
              const stock = Number(product.current_stock);
              const isOut = stock <= 0;
              const isLow = stock > 0 && stock <= Number(product.minimum_stock);

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={isOut}
                  onClick={() => addToCart(product)}
                  className={`group flex flex-col justify-between rounded-lg border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-sm ${isOut ? "opacity-50 cursor-not-allowed bg-muted/40" : "cursor-pointer"
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] text-muted-foreground truncate">{product.sku}</span>
                      <Badge
                        variant={isOut ? "destructive" : isLow ? "outline" : "secondary"}
                        className={`text-[9px] px-1.5 py-0 ${isLow ? "text-amber-600 border-amber-500" : ""}`}
                      >
                        {isOut ? "Out of Stock" : `${stock} ${product.unit}`}
                      </Badge>
                    </div>

                    <p className="mt-1 font-semibold text-xs text-foreground line-clamp-2 leading-tight group-hover:text-primary">
                      {product.product_name}
                    </p>

                    {product.brand_name && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{product.brand_name}</p>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline justify-between border-t pt-2">
                    <span className="text-sm font-black text-foreground">₹{Number(product.selling_price).toFixed(2)}</span>
                    {product.mrp && Number(product.mrp) > Number(product.selling_price) && (
                      <span className="text-[10px] text-muted-foreground line-through">₹{Number(product.mrp).toFixed(0)}</span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
              No spare parts match "{search}".
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          RIGHT SECTION: CART, CUSTOMER & TOTALS
          ===================================================================== */}
      <div className="space-y-4 lg:col-span-5 rounded-xl border bg-card p-4 shadow-sm">
        {/* Customer & Tax Settings Bar (Visible By Default Inline) */}
        <div className="space-y-2.5 pb-3 border-b">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-primary" /> Customer Details
            </span>
            <div className="flex items-center gap-3">
              {(cart.length > 0 || isResumed) && onClearCart && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-[11px] font-semibold text-destructive hover:underline"
                >
                  Clear bill
                </button>
              )}
              <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground text-xs">
                <input
                  type="checkbox"
                  checked={interstate}
                  onChange={(e) => setInterstate(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-[11px]">IGST (Inter-state)</span>
              </label>
            </div>
          </div>

          {/* Customer Selection Dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={customerId}
                onValueChange={(val) => {
                  setCustomerId(val);
                  if (val === "walk-in") {
                    setCustomerDetails({
                      name: "",
                      phone: "",
                      gstin: "",
                      address: "",
                    });
                  } else {
                    const found = customers.find((c) => c.id === val);
                    if (found) {
                      setCustomerDetails({
                        name: found.customer_name,
                        phone: found.phone ? found.phone.replace(/\D/g, "").slice(-10) : "",
                        gstin: found.gstin || "",
                        address: found.billing_address || "",
                      });
                    }
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer (Retail)</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.customer_name} {c.phone ? `(${c.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {customerId !== "walk-in" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomerId("walk-in");
                  setCustomerDetails({ name: "", phone: "", gstin: "", address: "" });
                }}
                className="h-8 text-[11px] text-muted-foreground px-2"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Default Inline Customer Input Fields (Always Displayed) */}
          <div className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Customer Name *
                  </label>
                  {customerId !== "walk-in" && (
                    <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                      ✓ Existing
                    </span>
                  )}
                </div>
                <Input
                  required
                  value={customerDetails.name}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Customer name"
                  className="h-7 text-xs bg-background"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">
                  Mobile / Phone *
                </label>
                <Input
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  required
                  value={customerDetails.phone}
                  onChange={(e) => {
                    const phone = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setCustomerDetails((prev) => ({ ...prev, phone }));
                    if (phone.length === 10) {
                      lookupAndAutofillCustomer(phone);
                    } else if (customerId !== "walk-in" && phone.length < 10) {
                      setCustomerId("walk-in");
                    }
                  }}
                  onBlur={() => {
                    if (customerDetails.phone.length === 10) {
                      lookupAndAutofillCustomer(customerDetails.phone);
                    }
                  }}
                  placeholder="10-digit mobile number"
                  className="h-7 text-xs bg-background font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">
                  GSTIN (Optional)
                </label>
                <Input
                  value={customerDetails.gstin}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                  placeholder="e.g. 33EYEPR2606P1Z1"
                  className="h-7 text-xs bg-background font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">
                  Address / City *
                </label>
                <Input
                  required
                  value={customerDetails.address}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Customer address"
                  className="h-7 text-xs bg-background"
                />
              </div>
            </div>

            {/* Quick 1-click Save to Directory if entered new customer */}
            {customerId === "walk-in" && customerDetails.name && customerDetails.name !== "Walk-in Customer" && (
              <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                <span className="text-muted-foreground text-[10px]">New customer entered</span>
                <button
                  type="button"
                  disabled={quickSaving || !customerDetails.phone.trim() || !customerDetails.address.trim()}
                  onClick={async () => {
                    setQuickSaving(true);
                    try {
                      const saved = await saveCustomer({
                        customer_name: customerDetails.name,
                        phone: customerDetails.phone,
                        gstin: customerDetails.gstin,
                        billing_address: customerDetails.address,
                        customer_type: "retail",
                      });
                      setCustomerId(saved.id);
                      toast.success(`Customer "${saved.customer_name}" saved to directory.`);
                    } catch {
                      toast.error("Failed to save customer.");
                    } finally {
                      setQuickSaving(false);
                    }
                  }}
                  className="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px]"
                >
                  <Plus className="size-3" /> Save to Directory
                </button>
              </div>
            )}
          </div>

          {exceedsCredit && (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-[11px] text-red-700 flex items-center gap-1.5">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>Warning: Balance exceeds customer credit limit (₹{selectedCustomer?.credit_limit})!</span>
            </div>
          )}
        </div>

        {/* Invoice Line Items */}
        <div className="space-y-2 min-h-[220px] max-h-[300px] overflow-y-auto pr-1">
          {cart.length > 0 ? (
            cart.map((line) => {
              const isBelowCost = Number(line.product.selling_price) < Number(line.product.purchase_price);
              return (
                <div key={line.productId} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs bg-muted/10">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{line.product.product_name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span>Rate: ₹{Number(line.product.selling_price).toFixed(2)}</span>
                      <span>GST: {Number(line.product.gst_rate)}%</span>
                      {isBelowCost && <span className="text-destructive font-bold">Below Cost!</span>}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-6 text-xs"
                      onClick={() => updateCartLine(line.productId, { quantity: Math.max(1, line.quantity - 1) })}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-8 text-center font-bold text-xs">{line.quantity}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-6 text-xs"
                      onClick={() => updateCartLine(line.productId, { quantity: line.quantity + 1 })}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="text-right shrink-0 min-w-16">
                    <p className="font-bold text-foreground">₹{(line.quantity * Number(line.product.selling_price)).toFixed(2)}</p>
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(line.productId)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <ShoppingCart className="mx-auto size-8 text-muted-foreground/40 mb-2" />
              Bill is empty. Scan barcodes or select parts from the left.
            </div>
          )}
        </div>

        {/* Extra Charge (Auto / Delivery / Freight) - Above Subtotal */}
        <div className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
              <input
                type="checkbox"
                checked={extraCharge.enabled}
                onChange={(e) => setExtraCharge((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="size-3.5 rounded border-border text-primary focus:ring-primary"
              />
              <span>Add Extra Charge (Auto / Delivery / Freight)</span>
            </label>
            {extraCharge.enabled && extraCharge.amount > 0 && (
              <Badge variant="secondary" className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-300">
                +₹{Number(extraCharge.amount).toFixed(2)}
              </Badge>
            )}
          </div>

          {extraCharge.enabled && (
            <div className="space-y-2 pt-1.5 border-t border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-7">
                  <Input
                    value={extraCharge.label}
                    onChange={(e) => setExtraCharge((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="Charge description (e.g. Auto Charge)"
                    className="h-7 text-xs bg-background"
                  />
                </div>
                <div className="sm:col-span-5 relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₹</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={extraCharge.amount === 0 ? "" : extraCharge.amount}
                    onChange={(e) => setExtraCharge((prev) => ({ ...prev, amount: Math.max(0, Number(e.target.value)) }))}
                    placeholder="Amount"
                    className="h-7 pl-6 text-xs font-mono font-bold bg-background"
                  />
                </div>
              </div>

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-muted-foreground">Quick:</span>
                {[
                  { label: "Auto Charge", amt: 50 },
                  { label: "Auto Charge", amt: 100 },
                  { label: "Delivery Charge", amt: 50 },
                  { label: "Delivery Charge", amt: 100 },
                  { label: "Fitting / Labour", amt: 150 },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setExtraCharge({ enabled: true, label: chip.label, amount: chip.amt })}
                    className="rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {chip.label} ₹{chip.amt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Totals & Calculations */}
        <div className="space-y-1.5 border-t pt-3 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
          </div>
          {extraCharge.enabled && extraCharge.amount > 0 && (
            <div className="flex justify-between text-amber-700 dark:text-amber-400 font-semibold">
              <span>{extraCharge.label || "Extra Charge"}:</span>
              <span className="font-mono">+₹{Number(extraCharge.amount).toFixed(2)}</span>
            </div>
          )}
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Total Discount:</span>
              <span className="font-mono">-₹{totals.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>GST Tax ({interstate ? "IGST" : "CGST + SGST"}):</span>
            <span className="font-mono">₹{totals.taxAmount.toFixed(2)}</span>
          </div>
          {Math.abs(roundOff) > 0.001 && (
            <div className="flex justify-between text-muted-foreground text-xs font-medium">
              <span>Round Off:</span>
              <span className="font-mono">{roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-black text-foreground">
            <span>Grand Total:</span>
            <span className="font-mono text-primary">₹{effectiveTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Split Payment Form */}
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Payment Collection</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPayment({ cash: String(effectiveTotal), upi: "", card: "", bank: "" })}
                className="text-[10px] font-semibold text-primary hover:underline"
              >
                Exact Cash
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setPayment({ cash: "", upi: String(effectiveTotal), card: "", bank: "" })}
                className="text-[10px] font-semibold text-primary hover:underline"
              >
                Full UPI
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setPayment({ cash: "", upi: "", card: "", bank: "" })}
                className="text-[10px] font-semibold text-muted-foreground hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Quick Cash Presets for Counter Cashier */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-muted-foreground">Quick Note:</span>
            {[100, 200, 500, 2000].map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => setPayment((prev) => ({ ...prev, cash: String(note) }))}
                className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono font-medium hover:bg-muted text-foreground transition-colors"
              >
                ₹{note}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded border bg-background px-2 py-1">
              <Banknote className="size-3.5 text-emerald-600" />
              <span className="text-[11px] text-muted-foreground w-10">Cash:</span>
              <Input
                type="number"
                step="0.01"
                value={payment.cash}
                onChange={(e) => setPayment((prev) => ({ ...prev, cash: e.target.value }))}
                placeholder="0.00"
                className="h-6 border-0 p-0 text-right font-mono text-xs focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded border bg-background px-2 py-1">
              <QrCode className="size-3.5 text-blue-600" />
              <span className="text-[11px] text-muted-foreground w-10">UPI:</span>
              <Input
                type="number"
                step="0.01"
                value={payment.upi}
                onChange={(e) => setPayment((prev) => ({ ...prev, upi: e.target.value }))}
                placeholder="0.00"
                className="h-6 border-0 p-0 text-right font-mono text-xs focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded border bg-background px-2 py-1">
              <CreditCard className="size-3.5 text-purple-600" />
              <span className="text-[11px] text-muted-foreground w-10">Card:</span>
              <Input
                type="number"
                step="0.01"
                value={payment.card}
                onChange={(e) => setPayment((prev) => ({ ...prev, card: e.target.value }))}
                placeholder="0.00"
                className="h-6 border-0 p-0 text-right font-mono text-xs focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded border bg-background px-2 py-1">
              <Smartphone className="size-3.5 text-amber-600" />
              <span className="text-[11px] text-muted-foreground w-10">Bank:</span>
              <Input
                type="number"
                step="0.01"
                value={payment.bank}
                onChange={(e) => setPayment((prev) => ({ ...prev, bank: e.target.value }))}
                placeholder="0.00"
                className="h-6 border-0 p-0 text-right font-mono text-xs focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Payment Status & Change Calculation Display */}
          <div className="space-y-1.5 pt-1.5 border-t border-border/60">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">Total Tendered:</span>
              <span className="font-mono font-bold text-foreground">₹{totalPaid.toFixed(2)}</span>
            </div>

            {changeReturn > 0 && (
              <div className="flex justify-between items-center rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1.5 text-emerald-800 dark:text-emerald-300">
                <span className="text-xs font-bold flex items-center gap-1">
                  💵 Change to Return:
                </span>
                <span className="font-mono text-sm font-black">
                  ₹{changeReturn.toFixed(2)}
                </span>
              </div>
            )}

            {balanceDue > 0 && (
              <div className="flex justify-between items-center rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-2.5 py-1.5 text-amber-800 dark:text-amber-300">
                <span className="text-xs font-bold">
                  ⚠️ Credit / Balance Due:
                </span>
                <span className="font-mono text-sm font-black">
                  ₹{balanceDue.toFixed(2)}
                </span>
              </div>
            )}

            {totalPaid > 0 && changeReturn === 0 && balanceDue === 0 && (
              <div className="flex justify-between items-center text-xs font-bold text-emerald-600 py-0.5">
                <span>Payment Status:</span>
                <span>✓ Exact Amount Paid</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            disabled={cart.length === 0 || loading}
            onClick={onSaveDraft}
            className="text-xs h-10 gap-1.5"
          >
            <PauseCircle className="size-4" /> Save as Draft
          </Button>

          <Button
            type="button"
            disabled={cart.length === 0 || loading}
            onClick={onComplete}
            className="text-xs h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-sm"
          >
            <Printer className="size-4" /> Complete & Print
          </Button>
        </div>
      </div>

      {/* Quick Add Customer Dialog */}
      <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            record={null}
            saving={quickSaving}
            onSubmit={async (values) => {
              setQuickSaving(true);
              try {
                const saved = await saveCustomer(values);
                setCustomerId(saved.id);
                setAddCustomerOpen(false);
                toast.success(`Customer "${saved.customer_name}" added.`);
              } catch {
                toast.error("Failed to add customer.");
              } finally {
                setQuickSaving(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
