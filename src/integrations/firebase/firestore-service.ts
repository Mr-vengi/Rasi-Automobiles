import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from "firebase/firestore";
import { db } from "./client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
// Inline to avoid circular-import TDZ during SSR module evaluation
const RASI_BUSINESS_ID = "00000000-0000-4000-8000-000000000001";

export const DEFAULT_BUSINESS_SETTINGS: Tables<"business_settings"> = {
  business_id: RASI_BUSINESS_ID,
  business_name: "Rasi Automobiles",
  owner_name: "RANJITH SELVARAJ",
  email: "ranjithselvaraj14@gmail.com",
  mobile: "+91 98765 43210",
  address: "Durgam Bypass Near Tollgate, Lena Morden Rice mill Opposite, Kallakurichi , 606213",
  state: "Tamil Nadu",
  state_code: "33",
  gstin: "33AAAAA0000A1Z5",
  invoice_prefix: "RA-2026-",
  invoice_footer: "Your Satisfaction, Our Priority – Thank You for Visiting Rasi Automobiles!",
  logo_url: null,
  tax_inclusive: false,
  timezone: "Asia/Kolkata",
  currency_code: "INR",
  updated_at: new Date().toISOString(),
};

// Initial Seed Data for Rasi Automobiles
const INITIAL_CATEGORIES: Tables<"categories">[] = [
  { id: "cat-1", business_id: RASI_BUSINESS_ID, name: "Engine & Mechanical", description: "Pistons, rings, valves, gaskets, engine components", created_at: new Date().toISOString() },
  { id: "cat-2", business_id: RASI_BUSINESS_ID, name: "Braking System", description: "Brake pads, shoes, discs, drums, master cylinders", created_at: new Date().toISOString() },
  { id: "cat-3", business_id: RASI_BUSINESS_ID, name: "Lubricants & Fluids", description: "4T engine oils, gear oils, brake fluids, coolant", created_at: new Date().toISOString() },
  { id: "cat-4", business_id: RASI_BUSINESS_ID, name: "Transmission & Clutch", description: "Clutch plates, pressure plates, cables, drive chains", created_at: new Date().toISOString() },
  { id: "cat-5", business_id: RASI_BUSINESS_ID, name: "Electrical & Lighting", description: "Spark plugs, headlights, horns, indicators, relays", created_at: new Date().toISOString() },
  { id: "cat-6", business_id: RASI_BUSINESS_ID, name: "Filters", description: "Air filters, oil filters, fuel filter elements", created_at: new Date().toISOString() },
  { id: "cat-7", business_id: RASI_BUSINESS_ID, name: "Suspension & Steering", description: "Shock absorbers, fork oil, fork seals, ball bearings", created_at: new Date().toISOString() },
  { id: "cat-8", business_id: RASI_BUSINESS_ID, name: "Body & Accessories", description: "Mirrors, levers, guards, footrests, grip covers", created_at: new Date().toISOString() },
];

const INITIAL_BRANDS: Tables<"brands">[] = [
  { id: "br-1", business_id: RASI_BUSINESS_ID, name: "Castrol", created_at: new Date().toISOString() },
  { id: "br-2", business_id: RASI_BUSINESS_ID, name: "Bosch", created_at: new Date().toISOString() },
  { id: "br-3", business_id: RASI_BUSINESS_ID, name: "NGK", created_at: new Date().toISOString() },
  { id: "br-4", business_id: RASI_BUSINESS_ID, name: "Lucas TVS", created_at: new Date().toISOString() },
  { id: "br-5", business_id: RASI_BUSINESS_ID, name: "Motul", created_at: new Date().toISOString() },
  { id: "br-6", business_id: RASI_BUSINESS_ID, name: "Gabriel", created_at: new Date().toISOString() },
  { id: "br-7", business_id: RASI_BUSINESS_ID, name: "Uno Minda", created_at: new Date().toISOString() },
  { id: "br-8", business_id: RASI_BUSINESS_ID, name: "Lumax", created_at: new Date().toISOString() },
  { id: "br-9", business_id: RASI_BUSINESS_ID, name: "Hero Genuine", created_at: new Date().toISOString() },
  { id: "br-10", business_id: RASI_BUSINESS_ID, name: "Bajaj Genuine", created_at: new Date().toISOString() },
  { id: "br-11", business_id: RASI_BUSINESS_ID, name: "TVS Genuine", created_at: new Date().toISOString() },
];

const INITIAL_SUPPLIERS: Tables<"suppliers">[] = [
  {
    id: "sup-1",
    business_id: RASI_BUSINESS_ID,
    supplier_name: "Sri Murugan Auto Distributors",
    contact_person: "M. Shanmugam",
    phone: "+91 94432 10987",
    email: "shanmugam@muruganauto.com",
    address: "45, Car Street, Salem, Tamil Nadu",
    gstin: "33AAACM1234D1Z8",
    state: "Tamil Nadu",
    credit_terms_days: 30,
    notes: "Primary distributor for Castrol & Motul lubricants",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
  },
  {
    id: "sup-2",
    business_id: RASI_BUSINESS_ID,
    supplier_name: "South India Spares Agency",
    contact_person: "K. Rajagopal",
    phone: "+91 98421 55678",
    email: "rajagopal@southindiaspares.com",
    address: "88, Omalur Main Road, Salem, Tamil Nadu",
    gstin: "33AABCS5678E1Z4",
    state: "Tamil Nadu",
    credit_terms_days: 21,
    notes: "Distributor for Bosch, NGK, and Uno Minda parts",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
  },
];

const INITIAL_CUSTOMERS: Tables<"customers">[] = [
  {
    id: "cust-walkin",
    business_id: RASI_BUSINESS_ID,
    customer_name: "Walk-in Customer",
    phone: "9999999999",
    email: "walkin@rasiautomobiles.com",
    billing_address: "Counter Sale, Salem",
    gstin: "",
    customer_type: "retail",
    credit_limit: 0,
    state: "Tamil Nadu",
    notes: "Default walk-in retail counter sales",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
  },
  {
    id: "cust-1",
    business_id: RASI_BUSINESS_ID,
    customer_name: "Kavin Two Wheeler Workshop",
    phone: "+91 97890 12345",
    email: "kavinworkshop@gmail.com",
    billing_address: "12, Meyyanur Bypass Road, Salem",
    gstin: "33AAHFK4321B1Z2",
    customer_type: "workshop",
    credit_limit: 25000,
    state: "Tamil Nadu",
    notes: "Regular mechanic workshop, settlement on Saturdays",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
  },
];

const INITIAL_PRODUCTS: Tables<"products">[] = [];

let seeded = false;

// Helper: safe timeout wrapper so Firestore operations never hang
function withTimeout<T>(promise: Promise<T>, ms = 5000, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// In-memory + LocalStorage cache for instant UI response and resilient offline operation
const memCache = {
  settings: DEFAULT_BUSINESS_SETTINGS,
  categories: [...INITIAL_CATEGORIES],
  brands: [...INITIAL_BRANDS],
  suppliers: [...INITIAL_SUPPLIERS],
  customers: [...INITIAL_CUSTOMERS],
  products: [] as Tables<"products">[],
  sales: [] as any[],
  purchases: [] as any[],
  expenses: [] as Tables<"expenses">[],
  movements: [] as any[],
};

if (typeof window !== "undefined") {
  try {
    const WIPE_KEY = "rasi_wipe_all_demo_data_v1";
    if (!localStorage.getItem(WIPE_KEY)) {
      localStorage.setItem("rasi_products", "[]");
      localStorage.setItem("rasi_sales", "[]");
      localStorage.setItem("rasi_movements", "[]");
      localStorage.setItem("rasi_purchases", "[]");
      localStorage.setItem(WIPE_KEY, "true");
      void fetch("/api/clear-all", { method: "POST" }).catch(() => { });
    }

    const load = (key: string) => {
      const v = localStorage.getItem(`rasi_${key}`);
      return v ? JSON.parse(v) : null;
    };
    if (load("settings")) {
      const s = load("settings");
      if (
        s.address?.includes("Trichy Main Road") ||
        s.address?.includes("Manalurpet") ||
        s.address?.includes("DHURUGAM") ||
        s.address?.includes("RAICEMILL") ||
        !s.address
      ) {
        s.address = "Durgam Bypass Near Tollgate, Lena Morden Rice mill Opposite, Kallakurichi , 606213";
      }
      if (s.email === "contact@rasiautomobiles.com" || !s.email) {
        s.email = "ranjithselvaraj14@gmail.com";
      }
      if (!s.invoice_footer || s.invoice_footer.includes("Drive safely") || s.invoice_footer.includes("Thank you for choosing") || s.invoice_footer.includes("Thank you for your business")) {
        s.invoice_footer = "Your Satisfaction, Our Priority – Thank You for Visiting Rasi Automobiles!";
      }
      memCache.settings = s;
      persist("settings", s);
    }
    if (load("categories")) memCache.categories = load("categories");
    if (load("brands")) memCache.brands = load("brands");
    if (load("suppliers")) memCache.suppliers = load("suppliers");
    if (load("customers")) memCache.customers = load("customers");
    if (load("products")) memCache.products = load("products");
    if (load("sales")) memCache.sales = load("sales");
    if (load("purchases")) memCache.purchases = load("purchases");
    if (load("expenses")) memCache.expenses = load("expenses");
    if (load("movements")) memCache.movements = load("movements");
  } catch (e) {
    console.warn("Local storage cache load notice:", e);
  }
}

function persist(key: string, data: any) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`rasi_${key}`, JSON.stringify(data));
    } catch { }
  }
}

// Reconcile completed sales and movements against product stock on startup and on load
export function reconcileCompletedSales(): void {
  let modified = false;

  // 1. First, synchronize product stock with the latest audited movement if one exists
  for (const prod of memCache.products) {
    const prodMovements = memCache.movements.filter((m) => m.product_id === prod.id);
    if (prodMovements.length > 0) {
      const latest = [...prodMovements].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )[0];
      if (latest && latest.quantity_after !== undefined && latest.quantity_after !== null) {
        const auditedStock = Number(latest.quantity_after);
        if (Number(prod.current_stock) !== auditedStock) {
          prod.current_stock = auditedStock;
          prod.updated_at = new Date().toISOString();
          void withTimeout(
            setDoc(doc(db, "products", prod.id), { current_stock: auditedStock, updated_at: prod.updated_at }, { merge: true }),
            2500,
            null
          ).catch(() => { });
          modified = true;
        }
      }
    }
  }

  // 2. Next, check if any completed sales have not had movements recorded yet
  if (memCache.sales.length) {
    const soldByProduct = new Map<string, number>();
    for (const sale of memCache.sales) {
      if (sale.status === "completed" && Array.isArray(sale.sale_items)) {
        for (const item of sale.sale_items) {
          const pid = item.product_id;
          const qty = Number(item.quantity || 0);
          soldByProduct.set(pid, (soldByProduct.get(pid) || 0) + qty);
        }
      }
    }

    const movementsOutByProduct = new Map<string, number>();
    for (const m of memCache.movements) {
      if (m.reference_type === "sale" && m.movement_type === "out") {
        const pid = m.product_id;
        movementsOutByProduct.set(pid, (movementsOutByProduct.get(pid) || 0) + Number(m.quantity_change || 0));
      }
    }

    for (const [productId, soldQty] of soldByProduct.entries()) {
      const prod = memCache.products.find((p) => p.id === productId);
      if (!prod) continue;
      const recordedMovementQty = movementsOutByProduct.get(productId) || 0;
      const unappliedQty = soldQty - recordedMovementQty;

      if (unappliedQty > 0) {
        const cur = Number(prod.current_stock || 0);
        const nextStock = Math.max(0, cur - unappliedQty);
        prod.current_stock = nextStock;
        prod.updated_at = new Date().toISOString();

        memCache.movements.unshift({
          id: `mov-${Date.now()}-${productId}`,
          business_id: RASI_BUSINESS_ID,
          product_id: productId,
          movement_type: "out",
          quantity_change: unappliedQty,
          quantity_after: nextStock,
          unit_cost: prod.purchase_price ?? 0,
          reference_type: "sale",
          reference_id: "reconcile",
          reason: `Reconciled sold units (${unappliedQty})`,
          created_at: new Date().toISOString(),
        });

        void withTimeout(
          setDoc(doc(db, "products", prod.id), { current_stock: nextStock, updated_at: prod.updated_at }, { merge: true }),
          2500,
          null
        ).catch(() => { });
        modified = true;
      }
    }
  }

  if (modified) {
    persist("products", memCache.products);
    persist("movements", memCache.movements);
  }
}

export interface FirebaseSyncResult {
  success: boolean;
  totalSynced: number;
  error?: string;
  isPermissionDenied?: boolean;
}

// Master Cloud Sync: pushes all cached records directly into Firebase Cloud Firestore collections
export async function syncAllToFirebase(): Promise<FirebaseSyncResult> {
  let count = 0;
  let isPermissionDenied = false;

  try {
    // 1. Settings
    if (memCache.settings) {
      await setDoc(doc(db, "business_settings", "default"), memCache.settings, { merge: true });
      count++;
    }

    // 2. Categories
    for (const cat of memCache.categories) {
      await setDoc(doc(db, "categories", cat.id), cat, { merge: true });
      count++;
    }

    // 3. Brands
    for (const br of memCache.brands) {
      await setDoc(doc(db, "brands", br.id), br, { merge: true });
      count++;
    }

    // 4. Suppliers
    for (const sup of memCache.suppliers) {
      await setDoc(doc(db, "suppliers", sup.id), sup, { merge: true });
      count++;
    }

    // 5. Customers
    for (const cust of memCache.customers) {
      await setDoc(doc(db, "customers", cust.id), cust, { merge: true });
      count++;
    }

    // 6. Products
    for (const prod of memCache.products) {
      await setDoc(doc(db, "products", prod.id), prod, { merge: true });
      count++;
    }

    // 7. Sales
    for (const sale of memCache.sales) {
      await setDoc(doc(db, "sales", sale.id), sale, { merge: true });
      count++;
    }

    // 8. Purchases
    for (const purch of memCache.purchases) {
      await setDoc(doc(db, "purchases", purch.id), purch, { merge: true });
      count++;
    }

    // 9. Expenses
    for (const exp of memCache.expenses) {
      await setDoc(doc(db, "expenses", exp.id), exp, { merge: true });
      count++;
    }

    // 10. Movements
    for (const mov of memCache.movements) {
      await setDoc(doc(db, "movements", mov.id), mov, { merge: true });
      count++;
    }

    return { success: true, totalSynced: count };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (
      err?.code === "permission-denied" ||
      msg.includes("permission-denied") ||
      msg.includes("Missing or insufficient permissions")
    ) {
      isPermissionDenied = true;
    }
    console.warn("syncAllToFirebase notice:", msg);
    return {
      success: false,
      totalSynced: count,
      error: msg,
      isPermissionDenied,
    };
  }
}

if (typeof window !== "undefined") {
  try {
    reconcileCompletedSales();
    void syncAllToFirebase().then((res) => {
      if (!res.success && res.isPermissionDenied) {
        console.warn("Cloud Firestore rules appear locked (permission-denied).");
      }
    });
  } catch (e) {
    console.warn("Startup sync notice:", e);
  }
}

// Auto-seed Firebase collections if empty
export async function ensureFirebaseSeeded(): Promise<void> {
  if (seeded) return;
  seeded = true;
  await syncAllToFirebase();
}

// =================== FIRESTORE CRUD OPERATIONS ===================

export async function fbLoadSettings(): Promise<Tables<"business_settings">> {
  void withTimeout(
    getDoc(doc(db, "business_settings", "default")).then((snap) => {
      if (snap.exists()) {
        memCache.settings = snap.data() as Tables<"business_settings">;
        persist("settings", memCache.settings);
      }
    }),
    2000,
    null
  );
  return memCache.settings;
}

export async function fbUpdateSettings(values: TablesUpdate<"business_settings">): Promise<Tables<"business_settings">> {
  const updated = { ...memCache.settings, ...values, updated_at: new Date().toISOString() };
  memCache.settings = updated;
  persist("settings", updated);
  const ref = doc(db, "business_settings", "default");
  void withTimeout(setDoc(ref, updated, { merge: true }), 2500, null).catch(() => { });
  return updated;
}

export async function fbLoadCategories(): Promise<Tables<"categories">[]> {
  void withTimeout(
    getDocs(query(collection(db, "categories"), orderBy("name"))).then((snap) => {
      if (!snap.empty) {
        memCache.categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tables<"categories">);
        persist("categories", memCache.categories);
      }
    }),
    2000,
    null
  );
  return memCache.categories;
}

export async function fbSaveCategory(name: string): Promise<Tables<"categories">> {
  const targetId = `cat-${Date.now()}`;
  const newCat: Tables<"categories"> = {
    id: targetId,
    name: name.trim(),
    business_id: RASI_BUSINESS_ID,
    description: "",
    created_at: new Date().toISOString(),
  };
  memCache.categories = [...memCache.categories, newCat];
  persist("categories", memCache.categories);
  void withTimeout(addDoc(collection(db, "categories"), newCat), 2500, null).catch(() => { });
  return newCat;
}

export async function fbLoadBrands(): Promise<Tables<"brands">[]> {
  void withTimeout(
    getDocs(query(collection(db, "brands"), orderBy("name"))).then((snap) => {
      if (!snap.empty) {
        memCache.brands = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tables<"brands">);
        persist("brands", memCache.brands);
      }
    }),
    2000,
    null
  );
  return memCache.brands;
}

export async function fbSaveBrand(name: string): Promise<Tables<"brands">> {
  const targetId = `br-${Date.now()}`;
  const newBrand: Tables<"brands"> = {
    id: targetId,
    name: name.trim(),
    business_id: RASI_BUSINESS_ID,
    created_at: new Date().toISOString(),
  };
  memCache.brands = [...memCache.brands, newBrand];
  persist("brands", memCache.brands);
  void withTimeout(addDoc(collection(db, "brands"), newBrand), 2500, null).catch(() => { });
  return newBrand;
}

export async function fbLoadProducts(): Promise<Tables<"products">[]> {
  try {
    reconcileCompletedSales();
  } catch { }

  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.products)) {
          memCache.products = data.products;
          persist("products", memCache.products);
          return [...memCache.products];
        }
      }
    } catch { }
  }

  void withTimeout(
    getDocs(collection(db, "products")).then((snap) => {
      if (!snap.empty) {
        const remoteProds = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Tables<"products">)
          .filter((p) => !p.archived_at);

        remoteProds.sort((a, b) => a.product_name.localeCompare(b.product_name));
        memCache.products = remoteProds;
        persist("products", memCache.products);
      }
    }),
    2000,
    null
  );
  return [...memCache.products];
}

export async function fbSaveProduct(
  values: Omit<TablesInsert<"products">, "business_id">,
  id?: string
): Promise<Tables<"products">> {
  const targetId = id || `prod-${Date.now()}`;
  const now = new Date().toISOString();
  const existing = memCache.products.find((p) => p.id === targetId);
  const payload: Tables<"products"> = {
    id: targetId,
    business_id: RASI_BUSINESS_ID,
    product_name: values.product_name,
    sku: values.sku,
    part_number: values.part_number || "",
    oem_number: values.oem_number || "",
    barcode: values.barcode || "",
    brand_id: values.brand_id || null,
    brand_name: values.brand_name || "",
    category_id: values.category_id || null,
    category_name: values.category_name || "",
    description: values.description || "",
    unit: values.unit || "Piece",
    purchase_price: Number(values.purchase_price || 0),
    selling_price: Number(values.selling_price || 0),
    wholesale_price: Number(values.wholesale_price || 0),
    mrp: Number(values.mrp || 0),
    gst_rate: Number(values.gst_rate || 18),
    hsn_code: values.hsn_code || "8708",
    current_stock: Number(values.current_stock ?? existing?.current_stock ?? 0),
    minimum_stock: Number(values.minimum_stock || 0),
    maximum_stock: values.maximum_stock !== null && values.maximum_stock !== undefined ? Number(values.maximum_stock) : null,
    shelf_location: values.shelf_location || "",
    supplier_id: values.supplier_id || null,
    is_active: values.is_active ?? true,
    created_at: existing?.created_at || now,
    updated_at: now,
    archived_at: null,
  };

  const idx = memCache.products.findIndex((p) => p.id === targetId);
  if (idx >= 0) {
    memCache.products[idx] = payload;
  } else {
    memCache.products.unshift(payload);
  }
  persist("products", memCache.products);

  if (typeof window !== "undefined") {
    void fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ product: payload }),
    }).catch(() => { });
  }

  void withTimeout(
    setDoc(doc(db, "products", targetId), payload, { merge: true }),
    2500,
    null
  ).catch((err) => console.warn("Firestore saveProduct bg warning:", err));

  return payload;
}

export async function fbClearAllProducts(): Promise<void> {
  memCache.products = [];
  persist("products", []);
  if (typeof window !== "undefined") {
    void fetch("/api/clear-products", { method: "POST" }).catch(() => { });
    try {
      const snap = await getDocs(collection(db, "products"));
      for (const d of snap.docs) {
        void deleteDoc(doc(db, "products", d.id)).catch(() => { });
      }
    } catch { }
  }
}

export async function fbClearAllSales(): Promise<void> {
  memCache.sales = [];
  persist("sales", []);
  if (typeof window !== "undefined") {
    void fetch("/api/clear-sales", { method: "POST" }).catch(() => { });
    try {
      const snap = await getDocs(collection(db, "sales"));
      for (const d of snap.docs) {
        void deleteDoc(doc(db, "sales", d.id)).catch(() => { });
      }
    } catch { }
  }
}

export async function fbLoadCustomers(): Promise<Tables<"customers">[]> {
  void withTimeout(
    getDocs(collection(db, "customers")).then((snap) => {
      if (!snap.empty) {
        const custs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Tables<"customers">)
          .filter((c) => !c.archived_at);
        custs.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
        memCache.customers = custs;
        persist("customers", memCache.customers);
      }
    }),
    2000,
    null
  );
  return memCache.customers;
}

export async function fbSaveCustomer(
  values: Omit<TablesInsert<"customers">, "business_id">,
  id?: string
): Promise<Tables<"customers">> {
  const targetId = id || `cust-${Date.now()}`;
  const now = new Date().toISOString();
  const existing = memCache.customers.find((c) => c.id === targetId);
  const payload: Tables<"customers"> = {
    id: targetId,
    business_id: RASI_BUSINESS_ID,
    customer_name: values.customer_name,
    phone: values.phone || "",
    email: values.email || "",
    billing_address: values.billing_address || "",
    gstin: values.gstin || "",
    customer_type: values.customer_type || "retail",
    credit_limit: Number(values.credit_limit || 0),
    state: values.state || "Tamil Nadu",
    notes: values.notes || "",
    created_at: existing?.created_at || now,
    updated_at: now,
    archived_at: null,
  };

  const idx = memCache.customers.findIndex((c) => c.id === targetId);
  if (idx >= 0) {
    memCache.customers[idx] = payload;
  } else {
    memCache.customers.unshift(payload);
  }
  persist("customers", memCache.customers);

  void withTimeout(
    setDoc(doc(db, "customers", targetId), payload, { merge: true }),
    2500,
    null
  ).catch((err) => console.warn("Firestore saveCustomer bg warning:", err));

  return payload;
}

export async function fbLoadSuppliers(): Promise<Tables<"suppliers">[]> {
  void withTimeout(
    getDocs(collection(db, "suppliers")).then((snap) => {
      if (!snap.empty) {
        const sups = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Tables<"suppliers">)
          .filter((s) => !s.archived_at);
        sups.sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
        memCache.suppliers = sups;
        persist("suppliers", memCache.suppliers);
      }
    }),
    2000,
    null
  );
  return memCache.suppliers;
}

export async function fbSaveSupplier(
  values: Omit<TablesInsert<"suppliers">, "business_id">,
  id?: string
): Promise<Tables<"suppliers">> {
  const targetId = id || `sup-${Date.now()}`;
  const now = new Date().toISOString();
  const existing = memCache.suppliers.find((s) => s.id === targetId);
  const payload: Tables<"suppliers"> = {
    id: targetId,
    business_id: RASI_BUSINESS_ID,
    supplier_name: values.supplier_name,
    contact_person: values.contact_person || "",
    phone: values.phone || "",
    email: values.email || "",
    address: values.address || "",
    gstin: values.gstin || "",
    state: values.state || "Tamil Nadu",
    credit_terms_days: Number(values.credit_terms_days || 30),
    notes: values.notes || "",
    created_at: existing?.created_at || now,
    updated_at: now,
    archived_at: null,
  };

  const idx = memCache.suppliers.findIndex((s) => s.id === targetId);
  if (idx >= 0) {
    memCache.suppliers[idx] = payload;
  } else {
    memCache.suppliers.unshift(payload);
  }
  persist("suppliers", memCache.suppliers);

  void withTimeout(
    setDoc(doc(db, "suppliers", targetId), payload, { merge: true }),
    2500,
    null
  ).catch((err) => console.warn("Firestore saveSupplier bg warning:", err));

  return payload;
}

export async function fbArchiveRecord(
  table: "products" | "customers" | "suppliers",
  id: string
): Promise<void> {
  const now = new Date().toISOString();
  if (table === "products") {
    memCache.products = memCache.products.filter((p) => p.id !== id);
    persist("products", memCache.products);
    if (typeof window !== "undefined") {
      void fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => { });
      void fetch("/api/delete-product", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => { });
    }
    try {
      await withTimeout(deleteDoc(doc(db, "products", id)), 3000, null);
    } catch (e) {
      console.warn("Firestore deleteDoc product error:", e);
    }
    return;
  } else if (table === "customers") {
    memCache.customers = memCache.customers.filter((c) => c.id !== id);
    persist("customers", memCache.customers);
    try {
      await withTimeout(deleteDoc(doc(db, "customers", id)), 3000, null);
    } catch { }
    return;
  } else if (table === "suppliers") {
    memCache.suppliers = memCache.suppliers.filter((s) => s.id !== id);
    persist("suppliers", memCache.suppliers);
    try {
      await withTimeout(deleteDoc(doc(db, "suppliers", id)), 3000, null);
    } catch { }
    return;
  }

  void withTimeout(
    setDoc(doc(db, table, id), { archived_at: now, updated_at: now }, { merge: true }),
    2500,
    null
  ).catch((err) => console.warn(`Firestore archive ${table} warning:`, err));
}

export async function fbLoadExpenses(): Promise<Tables<"expenses">[]> {
  void withTimeout(
    getDocs(collection(db, "expenses")).then((snap) => {
      if (!snap.empty) {
        const exps = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tables<"expenses">);
        exps.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
        memCache.expenses = exps;
        persist("expenses", memCache.expenses);
      }
    }),
    2000,
    null
  );
  return memCache.expenses;
}

export async function fbSaveExpense(
  values: Omit<TablesInsert<"expenses">, "business_id">
): Promise<Tables<"expenses">> {
  const now = new Date().toISOString();
  const payload: Tables<"expenses"> = {
    id: `exp-${Date.now()}`,
    business_id: RASI_BUSINESS_ID,
    category: values.category,
    amount: Number(values.amount),
    payment_method: values.payment_method || "cash",
    expense_date: values.expense_date || now.slice(0, 10),
    description: values.description || "",
    reference_number: values.reference_number || "",
    created_by: values.created_by || null,
    created_at: now,
    updated_at: now,
  };
  memCache.expenses.unshift(payload);
  persist("expenses", memCache.expenses);
  void withTimeout(addDoc(collection(db, "expenses"), payload), 2500, null).catch(() => { });
  return payload;
}

export async function fbLoadMovements(productId?: string): Promise<any[]> {
  void withTimeout(
    (async () => {
      const col = collection(db, "inventory_movements");
      const snap = productId
        ? await getDocs(query(col, where("product_id", "==", productId)))
        : await getDocs(col);
      if (!snap.empty) {
        const movs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
        movs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        memCache.movements = movs;
        persist("movements", memCache.movements);
      }
    })(),
    2000,
    null
  );
  return productId ? memCache.movements.filter((m) => m.product_id === productId) : memCache.movements;
}

export async function fbAdjustInventory(
  productId: string,
  quantityDelta: number,
  reason: string
): Promise<{ success: boolean; newStock: number }> {
  const prod = memCache.products.find((p) => p.id === productId);
  const currentStock = prod ? Number(prod.current_stock || 0) : 0;
  const newStock = Math.max(0, currentStock + quantityDelta);
  if (prod) {
    prod.current_stock = newStock;
    prod.updated_at = new Date().toISOString();
    persist("products", memCache.products);
  }

  const movPayload = {
    id: `mov-${Date.now()}`,
    business_id: RASI_BUSINESS_ID,
    product_id: productId,
    movement_type: quantityDelta >= 0 ? "in" : "out",
    quantity_change: Math.abs(quantityDelta),
    quantity_after: newStock,
    unit_cost: prod?.purchase_price ?? 0,
    reference_type: "adjustment",
    reference_id: "manual",
    reason: reason || "Manual stock adjustment",
    notes: null,
    created_at: new Date().toISOString(),
  };
  memCache.movements.unshift(movPayload);
  persist("movements", memCache.movements);

  void withTimeout(
    setDoc(doc(db, "products", productId), { current_stock: newStock, updated_at: new Date().toISOString() }, { merge: true }),
    2500,
    null
  ).catch(() => { });

  return { success: true, newStock };
}

export async function fbLoadSales(): Promise<any[]> {
  // 1. Primary: fetch persisted sales from local backend database
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/sales");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.sales)) {
          memCache.sales = data.sales;
          persist("sales", memCache.sales);
          return memCache.sales;
        }
      }
    } catch { }
  }

  // 2. Secondary fallback: Firestore if configured/accessible
  try {
    const snap = await withTimeout(
      getDocs(collection(db, "sales")),
      3000,
      null
    );
    if (snap && !snap.empty) {
      const sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
      sales.sort((a, b) => new Date(b.created_at || b.sale_date || 0).getTime() - new Date(a.created_at || a.sale_date || 0).getTime());
      memCache.sales = sales;
      persist("sales", memCache.sales);
      return sales;
    }
  } catch (err) {
    console.warn("fbLoadSales fetch warning:", err);
  }
  return memCache.sales;
}

export async function fbCreateSale(input: {
  items: { product_id: string; quantity: number; discount_rate: number }[];
  payments: { payment_method: string; amount: number; reference_number: string }[];
  customerId: string | null;
  customerDetails?: { customer_name: string; phone?: string; gstin?: string; billing_address?: string; state?: string } | null;
  extraCharge?: { label: string; amount: number } | null;
  interstate: boolean;
  status: "draft" | "completed";
  idempotencyKey: string;
  tenderedAmount?: number;
  changeReturned?: number;
}): Promise<string> {
  const saleId = `sale-${Date.now()}`;
  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  const productMap = new Map<string, Tables<"products">>();
  for (const p of memCache.products) {
    productMap.set(p.id, p);
  }

  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const saleItems = input.items.map((item, index) => {
    const prod = productMap.get(item.product_id);
    const unitPrice = prod ? Number(prod.selling_price) : 0;
    const unitCost = prod ? Number(prod.purchase_price) : 0;
    const gstRate = prod ? Number(prod.gst_rate) : 18;
    const gross = item.quantity * unitPrice;
    const disc = gross * ((item.discount_rate || 0) / 100);
    const taxable = gross - disc;
    const tax = taxable * (gstRate / 100);

    subtotal += gross;
    totalDiscount += disc;
    totalTax += tax;

    if (input.interstate) {
      igst += tax;
    } else {
      cgst += tax / 2;
      sgst += tax / 2;
    }

    return {
      id: `item-${saleId}-${index + 1}`,
      sale_id: saleId,
      product_id: item.product_id,
      product_name: prod?.product_name || "Spare part",
      part_number: prod?.part_number || "",
      hsn_code: prod?.hsn_code || "8708",
      quantity: item.quantity,
      unit_price: unitPrice,
      unit_cost: unitCost,
      discount_rate: item.discount_rate || 0,
      discount_amount: disc,
      taxable_amount: taxable,
      gst_rate: gstRate,
      cgst_amount: input.interstate ? 0 : tax / 2,
      sgst_amount: input.interstate ? 0 : tax / 2,
      igst_amount: input.interstate ? tax : 0,
      total_amount: taxable + tax,
    };
  });

  const extraChargeAmount = input.extraCharge && input.extraCharge.amount > 0 ? Number(input.extraCharge.amount) : 0;
  const extraChargeLabel = input.extraCharge?.label || "Extra Charge";

  const exactTotal = subtotal - totalDiscount + totalTax + extraChargeAmount;
  const roundedTotal = Math.round(exactTotal);
  const roundOff = Number((roundedTotal - exactTotal).toFixed(2));

  const rawPaidAmount = input.payments.reduce((s, p) => s + Number(p.amount), 0);
  const tenderedAmount = input.tenderedAmount !== undefined ? Number(input.tenderedAmount) : rawPaidAmount;
  const changeReturned = input.changeReturned !== undefined ? Number(input.changeReturned) : Math.max(0, tenderedAmount - roundedTotal);
  const appliedPaid = Math.min(roundedTotal, rawPaidAmount > 0 ? rawPaidAmount : tenderedAmount);
  const balanceDue = Math.max(0, roundedTotal - appliedPaid);

  const invoiceNum = `RA-${year}-${String(memCache.sales.length + 1001).padStart(4, "0")}`;

  const customer = input.customerId ? memCache.customers.find((c) => c.id === input.customerId) || null : null;
  const resolvedCustomer = customer
    ? {
      customer_name: customer.customer_name,
      phone: customer.phone,
      gstin: customer.gstin,
      billing_address: customer.billing_address,
      state: customer.state,
    }
    : input.customerDetails
      ? {
        customer_name: input.customerDetails.customer_name || "Walk-in Customer",
        phone: input.customerDetails.phone || "",
        gstin: input.customerDetails.gstin || "",
        billing_address: input.customerDetails.billing_address || "",
        state: input.customerDetails.state || "Tamil Nadu",
      }
      : null;

  if (input.status === "completed") {
    for (const line of input.items) {
      const p = memCache.products.find((prod) => prod.id === line.product_id);
      if (p) {
        const nextStock = Math.max(0, Number(p.current_stock ?? 0) - Number(line.quantity));
        p.current_stock = nextStock;
        p.updated_at = now;

        // Persist stock reduction directly to Firestore document
        void withTimeout(
          setDoc(doc(db, "products", p.id), { current_stock: nextStock, updated_at: now }, { merge: true }),
          2500,
          null
        ).catch(() => { });

        memCache.movements.unshift({
          id: `mov-${Date.now()}-${line.product_id}`,
          business_id: RASI_BUSINESS_ID,
          product_id: line.product_id,
          movement_type: "out",
          quantity_change: Number(line.quantity),
          quantity_after: nextStock,
          unit_cost: p.purchase_price ?? 0,
          reference_type: "sale",
          reference_id: saleId,
          reason: `Invoice ${invoiceNum}`,
          created_at: now,
        });
      }
    }
    persist("products", memCache.products);
    persist("movements", memCache.movements);

    if (customer && balanceDue > 0) {
      (customer as any).outstanding_balance = Number((customer as any).outstanding_balance || 0) + balanceDue;
      persist("customers", memCache.customers);
    }
  }

  const defaultPaymentMethod = input.payments?.[0]?.payment_method ?? "cash";

  const saleRecord = {
    id: saleId,
    business_id: RASI_BUSINESS_ID,
    invoice_number: invoiceNum,
    sale_date: now,
    status: input.status,
    customer_id: input.customerId,
    is_interstate: input.interstate,
    subtotal,
    taxable_amount: subtotal - totalDiscount,
    discount_amount: totalDiscount,
    cgst_amount: cgst,
    sgst_amount: sgst,
    igst_amount: igst,
    round_off: roundOff,
    total_amount: roundedTotal,
    paid_amount: appliedPaid,
    balance_due: balanceDue,
    tendered_amount: tenderedAmount,
    change_returned: changeReturned,
    extra_charge_label: extraChargeAmount > 0 ? extraChargeLabel : null,
    extra_charge_amount: extraChargeAmount > 0 ? extraChargeAmount : 0,
    payment_method: defaultPaymentMethod,
    payments: input.payments,
    sale_items: saleItems,
    customers: resolvedCustomer,
    created_at: now,
    updated_at: now,
  };

  memCache.sales.unshift(saleRecord);
  persist("sales", memCache.sales);

  if (typeof window !== "undefined") {
    void fetch("/api/sales", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: saleId, sale: saleRecord, settings: memCache.settings }),
    }).catch(() => { });
    void fetch("/api/invoice-cache", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: saleId, sale: saleRecord, settings: memCache.settings }),
    }).catch(() => { });
  }

  void withTimeout(
    setDoc(doc(db, "sales", saleId), saleRecord),
    2500,
    null
  ).catch((err) => console.warn("Firestore saveSale bg warning:", err));

  return saleId;
}

export async function fbRecordCustomerPayment(
  saleId: string,
  amount: number,
  paymentMethod: string,
  referenceNumber: string = ""
): Promise<void> {
  const sale = memCache.sales.find((s) => s.id === saleId);
  if (sale) {
    const prevPaid = Number(sale.paid_amount ?? 0);
    const total = Number(sale.total_amount ?? 0);
    const newPaid = prevPaid + amount;
    const newBalance = Math.max(0, total - newPaid);
    sale.paid_amount = newPaid;
    sale.balance_due = newBalance;
    sale.payments = Array.isArray(sale.payments) ? sale.payments : [];
    sale.payments.push({
      payment_method: paymentMethod,
      amount,
      reference_number: referenceNumber,
      created_at: new Date().toISOString(),
    });
    persist("sales", memCache.sales);

    if (sale.customer_id && sale.customer_id !== "walk-in") {
      const cust = memCache.customers.find((c) => c.id === sale.customer_id);
      if (cust) {
        const curBal = Number((cust as any).outstanding_balance ?? 0);
        (cust as any).outstanding_balance = Math.max(0, curBal - amount);
        persist("customers", memCache.customers);
      }
    }
  }

  void withTimeout(
    setDoc(doc(db, "sales", saleId), sale, { merge: true }),
    2500,
    null
  ).catch(() => { });
}

export async function fbLoadPurchases(): Promise<any[]> {
  void withTimeout(
    getDocs(collection(db, "purchases")).then((snap) => {
      if (!snap.empty) {
        const purchases = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
        purchases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        memCache.purchases = purchases;
        persist("purchases", memCache.purchases);
      }
    }),
    2000,
    null
  );
  return memCache.purchases;
}

export async function fbReceivePurchase(input: {
  supplierId: string;
  supplierReference: string;
  purchaseDate: string;
  items: { product_id: string; quantity: number; unit_cost: number; gst_rate: number; discount_rate: number }[];
  payments: { payment_method: string; amount: number; reference_number: string }[];
  idempotencyKey: string;
}): Promise<string> {
  const purchaseId = `po-${Date.now()}`;
  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  let subtotal = 0;
  let totalTax = 0;

  const purchaseItems = input.items.map((item, index) => {
    const gross = item.quantity * item.unit_cost;
    const disc = gross * ((item.discount_rate || 0) / 100);
    const taxable = gross - disc;
    const tax = taxable * ((item.gst_rate || 18) / 100);

    subtotal += taxable;
    totalTax += tax;

    return {
      id: `po-item-${purchaseId}-${index + 1}`,
      purchase_id: purchaseId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      discount_rate: item.discount_rate || 0,
      taxable_amount: taxable,
      gst_rate: item.gst_rate || 18,
      tax_amount: tax,
      total_amount: taxable + tax,
    };
  });

  const totalAmount = Math.round(subtotal + totalTax);
  const paidAmount = input.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  const billNum = `PO-${year}-${String(memCache.purchases.length + 101).padStart(3, "0")}`;

  for (const item of input.items) {
    const prod = memCache.products.find((p) => p.id === item.product_id);
    if (prod) {
      const nextStock = Number(prod.current_stock ?? 0) + item.quantity;
      prod.current_stock = nextStock;
      prod.purchase_price = item.unit_cost;
      prod.updated_at = now;

      memCache.movements.unshift({
        id: `mov-${Date.now()}-${item.product_id}`,
        business_id: RASI_BUSINESS_ID,
        product_id: item.product_id,
        movement_type: "in",
        quantity_change: item.quantity,
        quantity_after: nextStock,
        unit_cost: item.unit_cost,
        reference_type: "purchase",
        reference_id: purchaseId,
        reason: `Goods receipt ${billNum}`,
        created_at: now,
      });
    }
  }
  persist("products", memCache.products);
  persist("movements", memCache.movements);

  const sup = memCache.suppliers.find((s) => s.id === input.supplierId) || null;
  if (sup && balanceDue > 0) {
    (sup as any).outstanding_payable = Number((sup as any).outstanding_payable || 0) + balanceDue;
    persist("suppliers", memCache.suppliers);
  }

  const purchaseRecord = {
    id: purchaseId,
    business_id: RASI_BUSINESS_ID,
    bill_number: billNum,
    purchase_date: input.purchaseDate || now,
    status: "received",
    supplier_id: input.supplierId,
    supplier_reference: input.supplierReference,
    subtotal,
    tax_amount: totalTax,
    round_off: 0,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    balance_due: balanceDue,
    payments: input.payments,
    purchase_items: purchaseItems,
    suppliers: sup ? { supplier_name: sup.supplier_name, phone: sup.phone } : null,
    created_at: now,
    updated_at: now,
  };

  memCache.purchases.unshift(purchaseRecord);
  persist("purchases", memCache.purchases);

  void withTimeout(
    setDoc(doc(db, "purchases", purchaseId), purchaseRecord),
    2500,
    null
  ).catch((err) => console.warn("Firestore savePurchase bg warning:", err));

  return purchaseId;
}

export async function fbLoadEmployees(): Promise<any[]> {
  void ensureFirebaseSeeded();
  const ownerName = memCache.settings?.owner_name?.trim() || "RANJITH SELVARAJ";
  const defaultOwner = {
    id: "owner-1",
    full_name: ownerName,
    email: memCache.settings?.email || "ranjithselvaraj14@gmail.com",
    phone: memCache.settings?.mobile || "+91 98765 43210",
    roles: ["administrator"],
    created_at: new Date().toISOString(),
  };
  return [defaultOwner];
}
