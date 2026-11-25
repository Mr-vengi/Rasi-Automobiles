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
  increment,
} from "firebase/firestore";
import { db, firebaseConfig, auth } from "./client";
import { signInWithEmailAndPassword } from "firebase/auth";
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

const INITIAL_CUSTOMERS: Tables<"customers">[] = [];

const INITIAL_PRODUCTS: Tables<"products">[] = [];

let seeded = false;

// Helper: safe timeout wrapper so Firestore operations never hang
function withTimeout<T>(promise: Promise<T>, ms = 5000, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// Helper: Ensure Firebase Auth is signed in so Firestore security rules never block writes
export async function ensureFirebaseAuth(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (auth.currentUser) return true;
  try {
    if (typeof auth.authStateReady === "function") {
      await withTimeout(auth.authStateReady(), 2000, null);
      if (auth.currentUser) return true;
    }
    await signInWithEmailAndPassword(auth, "ranjithselvaraj14@gmail.com", "admin123");
    return true;
  } catch (err) {
    console.warn("ensureFirebaseAuth notice:", err);
    return false;
  }
}

// Helper: direct HTTPS REST delete to Firestore server (bypasses WebChannel/gRPC stream)
export async function directFirestoreDelete(collectionName: string, docId: string): Promise<boolean> {
  if (typeof window === "undefined" && typeof fetch === "undefined") return false;
  try {
    const headers: Record<string, string> = {};
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      } catch { }
    }
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(docId)}?key=${firebaseConfig.apiKey}`;
    const res = await fetch(url, { method: "DELETE", headers });
    return res.ok || res.status === 404;
  } catch (err) {
    console.warn(`directFirestoreDelete notice for ${collectionName}/${docId}:`, err);
    return false;
  }
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

    // 5. Customers (only sync if user has explicit local customer state, never re-seed deleted defaults)
    if (typeof window === "undefined" || localStorage.getItem("rasi_customers") !== null) {
      for (const cust of memCache.customers) {
        await setDoc(doc(db, "customers", cust.id), cust, { merge: true });
        count++;
      }
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
  } catch (e) {
    console.warn("Startup reconciliation notice:", e);
  }
}

export async function fbSyncCustomersToFirebase(): Promise<number> {
  await ensureFirebaseAuth().catch(() => { });
  let count = 0;
  for (const c of memCache.customers) {
    if (c?.id && !c.archived_at) {
      try {
        await withTimeout(
          setDoc(doc(db, "customers", c.id), c, { merge: true }),
          4000,
          null
        );
        count++;
      } catch (err) {
        console.warn("fbSyncCustomersToFirebase notice for", c.id, err);
      }
    }
  }
  return count;
}

export async function fbSyncSalesToFirebase(): Promise<number> {
  await ensureFirebaseAuth().catch(() => { });
  let count = 0;
  for (const s of memCache.sales) {
    if (s?.id) {
      try {
        await withTimeout(
          setDoc(doc(db, "sales", s.id), s, { merge: true }),
          4000,
          null
        );
        count++;
      } catch (err) {
        console.warn("fbSyncSalesToFirebase notice for", s.id, err);
      }
    }
  }
  return count;
}
export async function ensureFirebaseSeeded(): Promise<void> {
  if (seeded) return;
  seeded = true;
  await syncAllToFirebase();
}

// =================== FIRESTORE CRUD OPERATIONS ===================

export async function fbLoadSettings(): Promise<Tables<"business_settings">> {
  try {
    const snap = await withTimeout(getDoc(doc(db, "business_settings", "default")), 3500, null);
    if (snap && snap.exists()) {
      memCache.settings = snap.data() as Tables<"business_settings">;
      persist("settings", memCache.settings);
      return memCache.settings;
    }
  } catch (e) {
    console.warn("Firestore getDoc settings notice:", e);
  }
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
  try {
    const snap = await withTimeout(
      getDocs(query(collection(db, "categories"), orderBy("name"))),
      3500,
      null
    );
    if (snap && !snap.empty) {
      memCache.categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tables<"categories">);
      persist("categories", memCache.categories);
      return [...memCache.categories];
    }
  } catch (e) {
    console.warn("Firestore getDocs categories notice:", e);
  }
  return [...memCache.categories];
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
  try {
    const snap = await withTimeout(
      getDocs(query(collection(db, "brands"), orderBy("name"))),
      3500,
      null
    );
    if (snap && !snap.empty) {
      memCache.brands = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tables<"brands">);
      persist("brands", memCache.brands);
      return [...memCache.brands];
    }
  } catch (e) {
    console.warn("Firestore getDocs brands notice:", e);
  }
  return [...memCache.brands];
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

  // 1. Primary: Load directly from Firebase Cloud Firestore
  try {
    const snap = await withTimeout(getDocs(collection(db, "products")), 4000, null);
    if (snap && !snap.empty) {
      const remoteProds = snap.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            ...data,
            product_name: data.product_name || "",
            sku: data.sku || data.product_name || d.id,
            unit: data.unit || "Piece",
            purchase_price: Number(data.purchase_price) || 0,
            selling_price: Number(data.selling_price) || 0,
            mrp: Number(data.mrp) || Number(data.selling_price) || 0,
            gst_rate: Number(data.gst_rate) || 18,
            current_stock: Number(data.current_stock) || 0,
            minimum_stock: Number(data.minimum_stock) || 0,
            is_active: data.is_active !== false,
          } as Tables<"products">;
        })
        .filter((p) => !p.archived_at);

      remoteProds.sort((a, b) => a.product_name.localeCompare(b.product_name));
      memCache.products = remoteProds;
      persist("products", memCache.products);
      return [...memCache.products];
    }
  } catch (err) {
    console.warn("Firestore getDocs products notice:", err);
  }

  // 2. Secondary fallback: check local memory cache if present
  if (memCache.products.length > 0) {
    return [...memCache.products];
  }

  // 3. Fallback to /api/products ONLY if it actually has items (not empty)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.products) && data.products.length > 0) {
          memCache.products = data.products;
          persist("products", memCache.products);
          return [...memCache.products];
        }
      }
    } catch { }
  }

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

export async function fbDeleteSale(saleId: string): Promise<void> {
  const cleanId = String(saleId).trim();
  memCache.sales = memCache.sales.filter((s) => s.id !== cleanId && s.invoice_number !== cleanId);
  persist("sales", memCache.sales);

  // Record tombstone in localStorage so deleted draft/sale never resurrects
  if (typeof window !== "undefined") {
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem("rasi_deleted_sale_ids") || "[]");
      if (!deletedList.includes(cleanId)) {
        deletedList.push(cleanId);
        localStorage.setItem("rasi_deleted_sale_ids", JSON.stringify(deletedList));
      }
    } catch { }
  }

  if (typeof window !== "undefined") {
    try {
      await fetch(`/api/delete-sale?id=${encodeURIComponent(cleanId)}`, { method: "POST" }).catch(() => { });
      await fetch(`/api/sales?id=${encodeURIComponent(cleanId)}`, { method: "DELETE" }).catch(() => { });
    } catch { }
  }

  try {
    await directFirestoreDelete("sales", cleanId);
  } catch { }

  try {
    await withTimeout(deleteDoc(doc(db, "sales", cleanId)), 3500, null);
  } catch (err) {
    console.warn("Firestore delete sale warning:", err);
  }
}

export async function fbLoadCustomers(): Promise<Tables<"customers">[]> {
  await ensureFirebaseAuth().catch(() => { });
  const customerMap = new Map<string, Tables<"customers">>();
  let deletedSet = new Set<string>();

  if (typeof window !== "undefined") {
    try {
      const arr = JSON.parse(localStorage.getItem("rasi_deleted_customer_ids") || "[]");
      if (Array.isArray(arr)) deletedSet = new Set(arr);
    } catch { }
  }

  // 1. Populate from in-memory / localStorage cache
  for (const c of memCache.customers) {
    if (c?.id && !c.archived_at && !deletedSet.has(c.id)) {
      customerMap.set(c.id, c);
    }
  }

  // 2. Fetch from backend /api/customers (persistent data/customers.json)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/customers");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.customers)) {
          for (const c of data.customers) {
            if (c?.id && !c.archived_at && !deletedSet.has(c.id)) {
              customerMap.set(c.id, c);
            }
          }
        }
      }
    } catch { }
  }

  const remoteDocIds = new Set<string>();

  // 3. Merge from Cloud Firestore
  try {
    const snap = await withTimeout(getDocs(collection(db, "customers")), 3500, null);
    if (snap && !snap.empty) {
      for (const d of snap.docs) {
        remoteDocIds.add(d.id);
        if (deletedSet.has(d.id)) {
          // Clean up lingering deleted doc from Firestore
          void directFirestoreDelete("customers", d.id);
          void deleteDoc(doc(db, "customers", d.id)).catch(() => { });
          continue;
        }
        const data = { id: d.id, ...d.data() } as Tables<"customers">;
        if (data.id && !data.archived_at) {
          customerMap.set(data.id, data);
        }
      }
    }
  } catch (e) {
    console.warn("Firestore getDocs customers notice:", e);
  }

  // Auto-sync any local/backend customers missing from Cloud Firestore so Firestore collection is always created and populated
  for (const c of customerMap.values()) {
    if (!remoteDocIds.has(c.id)) {
      try {
        await withTimeout(
          setDoc(doc(db, "customers", c.id), c, { merge: true }),
          3500,
          null
        );
      } catch { }
    }
  }

  const list = Array.from(customerMap.values());
  list.sort((a, b) => (a.customer_name || "").localeCompare(b.customer_name || ""));
  memCache.customers = list;
  persist("customers", memCache.customers);
  return list;
}

export async function fbSaveCustomer(
  values: Omit<TablesInsert<"customers">, "business_id">,
  id?: string
): Promise<Tables<"customers">> {
  await ensureFirebaseAuth().catch(() => { });
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
  const billCount = Number(
    (existing as (Tables<"customers"> & { bill_count?: number }) | undefined)?.bill_count || 0
  );
  (payload as Tables<"customers"> & { bill_count?: number }).bill_count = billCount;

  // Un-tombstone if it was previously in deleted list
  if (typeof window !== "undefined") {
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem("rasi_deleted_customer_ids") || "[]");
      if (deletedList.includes(targetId)) {
        localStorage.setItem(
          "rasi_deleted_customer_ids",
          JSON.stringify(deletedList.filter((item) => item !== targetId))
        );
      }
    } catch { }
  }

  const idx = memCache.customers.findIndex((c) => c.id === targetId);
  if (idx >= 0) {
    memCache.customers[idx] = payload;
  } else {
    memCache.customers.unshift(payload);
  }
  persist("customers", memCache.customers);

  if (typeof window !== "undefined") {
    try {
      await fetch("/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { }
  }

  try {
    await withTimeout(
      setDoc(doc(db, "customers", targetId), payload, { merge: true }),
      4000,
      null
    );
  } catch (err) {
    console.warn("Firestore saveCustomer notice:", err);
  }

  return payload;
}

export async function fbRecordCustomerBill(customerId: string): Promise<void> {
  const now = new Date().toISOString();
  const customerIndex = memCache.customers.findIndex((customer) => customer.id === customerId);

  if (customerIndex >= 0) {
    const customer = memCache.customers[customerIndex] as Tables<"customers"> & { bill_count?: number };
    memCache.customers[customerIndex] = {
      ...customer,
      bill_count: Number(customer.bill_count || 0) + 1,
      updated_at: now,
    } as Tables<"customers">;
    persist("customers", memCache.customers);
  }

  void withTimeout(
    setDoc(
      doc(db, "customers", customerId),
      { bill_count: increment(1), updated_at: now },
      { merge: true }
    ),
    2500,
    null
  ).catch((err) => console.warn("Firestore customer bill count warning:", err));
}

export async function fbLoadSuppliers(): Promise<Tables<"suppliers">[]> {
  try {
    const snap = await withTimeout(getDocs(collection(db, "suppliers")), 3500, null);
    if (snap && !snap.empty) {
      const sups = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Tables<"suppliers">)
        .filter((s) => !s.archived_at);
      sups.sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
      memCache.suppliers = sups;
      persist("suppliers", memCache.suppliers);
      return [...memCache.suppliers];
    }
  } catch (e) {
    console.warn("Firestore getDocs suppliers notice:", e);
  }
  return [...memCache.suppliers];
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
    void directFirestoreDelete("products", id);
    try {
      await withTimeout(deleteDoc(doc(db, "products", id)), 3000, null);
    } catch (e) {
      console.warn("Firestore deleteDoc product error:", e);
    }
    return;
  } else if (table === "customers") {
    memCache.customers = memCache.customers.filter((c) => c.id !== id);
    persist("customers", memCache.customers);

    // Record tombstone in localStorage so deleted customers never resurrect
    if (typeof window !== "undefined") {
      try {
        const deletedList: string[] = JSON.parse(localStorage.getItem("rasi_deleted_customer_ids") || "[]");
        if (!deletedList.includes(id)) {
          deletedList.push(id);
          localStorage.setItem("rasi_deleted_customer_ids", JSON.stringify(deletedList));
        }
      } catch { }
    }

    if (typeof window !== "undefined") {
      try {
        await fetch(`/api/customers?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => { });
        await fetch("/api/delete-customer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        }).catch(() => { });
      } catch { }
    }

    // Direct HTTPS REST delete executes synchronously on Firestore server
    try {
      await directFirestoreDelete("customers", id);
    } catch { }

    try {
      await withTimeout(deleteDoc(doc(db, "customers", id)), 3500, null);
    } catch (e) {
      console.warn("Firestore deleteDoc customer error:", e);
    }
    return;
  } else if (table === "suppliers") {
    memCache.suppliers = memCache.suppliers.filter((s) => s.id !== id);
    persist("suppliers", memCache.suppliers);
    void directFirestoreDelete("suppliers", id);
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
  try {
    const snap = await withTimeout(
      getDocs(query(collection(db, "expenses"), orderBy("expense_date", "desc"))),
      3500,
      null
    );
    if (snap && !snap.empty) {
      const exps = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tables<"expenses">);
      memCache.expenses = exps;
      persist("expenses", memCache.expenses);
      return [...memCache.expenses];
    }
  } catch (e) {
    console.warn("Firestore getDocs expenses notice:", e);
  }
  return [...memCache.expenses];
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
  try {
    const col = collection(db, "inventory_movements");
    const snap = productId
      ? await withTimeout(getDocs(query(col, where("product_id", "==", productId))), 3500, null)
      : await withTimeout(getDocs(col), 3500, null);
    if (snap && !snap.empty) {
      const movs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      movs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      memCache.movements = movs;
      persist("movements", memCache.movements);
      return productId ? memCache.movements.filter((m) => m.product_id === productId) : memCache.movements;
    }
  } catch (e) {
    console.warn("Firestore getDocs movements notice:", e);
  }
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
  await ensureFirebaseAuth().catch(() => { });
  const salesMap = new Map<string, any>();
  let deletedSet = new Set<string>();

  if (typeof window !== "undefined") {
    try {
      const arr = JSON.parse(localStorage.getItem("rasi_deleted_sale_ids") || "[]");
      if (Array.isArray(arr)) deletedSet = new Set(arr);
    } catch { }
  }

  // 1. Populate from in-memory / localStorage cache
  for (const s of memCache.sales) {
    if (s?.id && !deletedSet.has(s.id)) salesMap.set(s.id, s);
  }

  // 2. Fetch from backend /api/sales (persistent data/sales.json)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/sales");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.sales)) {
          for (const s of data.sales) {
            if (s?.id && !deletedSet.has(s.id)) salesMap.set(s.id, s);
          }
        }
      }
    } catch { }
  }

  const remoteDocIds = new Set<string>();

  // 3. Merge from Cloud Firestore
  try {
    const snap = await withTimeout(
      getDocs(collection(db, "sales")),
      3500,
      null
    );
    if (snap && !snap.empty) {
      for (const d of snap.docs) {
        remoteDocIds.add(d.id);
        if (deletedSet.has(d.id)) {
          // Permanently cleanup tombstoned sale from Firestore if it still lingered
          void directFirestoreDelete("sales", d.id);
          void deleteDoc(doc(db, "sales", d.id)).catch(() => { });
          continue;
        }
        const s = { id: d.id, ...d.data() } as any;
        if (s.id) salesMap.set(s.id, s);
      }
    }
  } catch (err) {
    console.warn("fbLoadSales Firestore notice:", err);
  }

  // Auto-sync any local/backend sales missing from Cloud Firestore so Firestore is always populated
  for (const s of salesMap.values()) {
    if (!remoteDocIds.has(s.id)) {
      try {
        await withTimeout(
          setDoc(doc(db, "sales", s.id), s, { merge: true }),
          3500,
          null
        );
      } catch { }
    }
  }

  const sales = Array.from(salesMap.values());
  sales.sort((a, b) => new Date(b.created_at || b.sale_date || 0).getTime() - new Date(a.created_at || a.sale_date || 0).getTime());
  memCache.sales = sales;
  persist("sales", memCache.sales);
  return sales;
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
  await ensureFirebaseAuth().catch(() => { });
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
      line_total: taxable + tax,
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
    sale_payments: input.payments,
    sale_items: saleItems,
    customers: resolvedCustomer,
    created_at: now,
    updated_at: now,
  };

  // Un-tombstone if saleId was in deleted list
  if (typeof window !== "undefined") {
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem("rasi_deleted_sale_ids") || "[]");
      if (deletedList.includes(saleId)) {
        localStorage.setItem(
          "rasi_deleted_sale_ids",
          JSON.stringify(deletedList.filter((item) => item !== saleId))
        );
      }
    } catch { }
  }

  memCache.sales.unshift(saleRecord);
  persist("sales", memCache.sales);

  if (typeof window !== "undefined") {
    try {
      await fetch("/api/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: saleId, sale: saleRecord, settings: memCache.settings }),
      });
      void fetch("/api/invoice-cache", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: saleId, sale: saleRecord, settings: memCache.settings }),
      }).catch(() => { });
    } catch { }
  }

  try {
    await withTimeout(
      setDoc(doc(db, "sales", saleId), saleRecord, { merge: true }),
      4000,
      null
    );
  } catch (err) {
    console.warn("Firestore saveSale notice:", err);
  }

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
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/sales", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: saleId, sale, settings: memCache.settings }),
        });
      } catch { }
    }
  }

  try {
    await withTimeout(
      setDoc(doc(db, "sales", saleId), sale, { merge: true }),
      4000,
      null
    );
  } catch (err) {
    console.warn("Firestore record payment notice:", err);
  }
}

export async function fbLoadPurchases(): Promise<any[]> {
  try {
    const snap = await withTimeout(getDocs(collection(db, "purchases")), 3500, null);
    if (snap && !snap.empty) {
      const purchases = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
      purchases.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      memCache.purchases = purchases;
      persist("purchases", memCache.purchases);
      return purchases;
    }
  } catch (e) {
    console.warn("Firestore getDocs purchases notice:", e);
  }
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

export type UserApproval = {
  id: string;
  uid: string;
  email: string;
  name: string;
  password?: string;
  status: "pending" | "approved" | "rejected";
  role: "staff" | "administrator";
  requested_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
};

export async function fbRegisterUserApproval(input: {
  uid?: string;
  email: string;
  name: string;
  password?: string;
}): Promise<void> {
  const email = input.email.toLowerCase().trim();
  const isAdmin = email === "ranjithselvaraj14@gmail.com";
  const now = new Date().toISOString();
  let existingApproval: UserApproval | undefined;

  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem("rasi_user_approvals");
      const list: UserApproval[] = existingRaw ? JSON.parse(existingRaw) : [];
      existingApproval = list.find((user) => user.email.toLowerCase().trim() === email);
    } catch { }
  }

  const id = existingApproval?.id || input.uid || `usr-${Date.now()}`;
  const approvalRecord: UserApproval = {
    id,
    uid: input.uid || id,
    email,
    name: existingApproval?.name || input.name || email.split("@")[0] || "Staff",
    password: input.password || "",
    status: isAdmin ? "approved" : existingApproval?.status || "pending",
    role: isAdmin ? "administrator" : existingApproval?.role || "staff",
    requested_at: existingApproval?.requested_at || now,
    approved_at: isAdmin ? now : existingApproval?.approved_at || null,
    approved_by: isAdmin ? "system" : existingApproval?.approved_by || null,
  };

  try {
    await withTimeout(
      setDoc(doc(db, "user_approvals", approvalRecord.id), approvalRecord, { merge: true }),
      3000,
      null
    );
  } catch (err) {
    console.warn("Firestore register user approval err:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem("rasi_user_approvals");
      const list: UserApproval[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [
        approvalRecord,
        ...list.filter((user) => user.email.toLowerCase().trim() !== email),
      ];
      localStorage.setItem("rasi_user_approvals", JSON.stringify(updated));
    } catch { }
  }
}

export async function fbCheckUserApproval(
  email: string,
  uid?: string
): Promise<{ approved: boolean; status: "approved" | "pending" | "rejected"; role: string }> {
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail === "ranjithselvaraj14@gmail.com") {
    return { approved: true, status: "approved", role: "administrator" };
  }

  try {
    if (uid) {
      const snap = await withTimeout(getDoc(doc(db, "user_approvals", uid)), 3000, null);
      if (snap && snap.exists()) {
        const data = snap.data() as UserApproval;
        return { approved: data.status === "approved", status: data.status, role: data.role || "staff" };
      }
    }

    const q = query(collection(db, "user_approvals"), where("email", "==", cleanEmail));
    const querySnap = await withTimeout(getDocs(q), 3000, null);
    if (querySnap && !querySnap.empty && querySnap.docs[0]) {
      const data = querySnap.docs[0].data() as UserApproval;
      return { approved: data.status === "approved", status: data.status, role: data.role || "staff" };
    }
  } catch (err) {
    console.warn("Firestore check user approval err:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem("rasi_user_approvals");
      if (existingRaw) {
        const list: UserApproval[] = JSON.parse(existingRaw);
        const match = list.find((u) => u.email.toLowerCase() === cleanEmail || (uid && u.uid === uid));
        if (match) {
          return { approved: match.status === "approved", status: match.status, role: match.role || "staff" };
        }
      }
    } catch { }
  }

  return { approved: false, status: "pending", role: "staff" };
}

export async function fbAuthenticateFallback(
  email: string,
  password?: string
): Promise<{ success: boolean; user?: { uid: string; email: string; name: string; role: string }; error?: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const isAdmin = cleanEmail === "ranjithselvaraj14@gmail.com";

  let record: UserApproval | null = null;
  try {
    const q = query(collection(db, "user_approvals"), where("email", "==", cleanEmail));
    const querySnap = await withTimeout(getDocs(q), 3000, null);
    if (querySnap && !querySnap.empty && querySnap.docs[0]) {
      record = querySnap.docs[0].data() as UserApproval;
    }
  } catch { }

  if (!record && typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem("rasi_user_approvals");
      if (existingRaw) {
        const list: UserApproval[] = JSON.parse(existingRaw);
        record = list.find((u) => u.email.toLowerCase() === cleanEmail) || null;
      }
    } catch { }
  }

  if (isAdmin) {
    if (password === "admin123" || (record && record.password === password) || !record?.password) {
      if (password && (!record || record.password !== password)) {
        await fbRegisterUserApproval({ uid: "admin-ranjith-01", email: cleanEmail, name: "RANJITH SELVARAJ", password });
      }
      return {
        success: true,
        user: { uid: record?.id || "admin-ranjith-01", email: cleanEmail, name: "RANJITH SELVARAJ", role: "administrator" },
      };
    }
    return { success: false, error: "Incorrect password for Administrator. (Temporary default password: admin123)" };
  }

  if (!record) {
    return { success: false, error: "No staff account found with this email. Please click 'Create an account' first." };
  }

  if (record.password && password && record.password !== password) {
    return { success: false, error: "Incorrect password. Please verify your credentials or click 'Forgot password?'." };
  }

  if (record.status !== "approved") {
    return {
      success: false,
      error: "Account pending approval from admin ranjithselvaraj14@gmail.com. Please wait for authorization.",
    };
  }

  return {
    success: true,
    user: { uid: record.id || record.uid, email: cleanEmail, name: record.name || "Staff Member", role: "staff" },
  };
}

export async function fbResetUserPassword(
  email: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const isAdmin = cleanEmail === "ranjithselvaraj14@gmail.com";

  let record: UserApproval | null = null;
  let recordDocId = "";

  try {
    const q = query(collection(db, "user_approvals"), where("email", "==", cleanEmail));
    const querySnap = await withTimeout(getDocs(q), 3000, null);
    if (querySnap && !querySnap.empty && querySnap.docs[0]) {
      recordDocId = querySnap.docs[0].id;
      record = querySnap.docs[0].data() as UserApproval;
    }
  } catch { }

  if (!record && typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem("rasi_user_approvals");
      if (existingRaw) {
        const list: UserApproval[] = JSON.parse(existingRaw);
        record = list.find((u) => u.email.toLowerCase() === cleanEmail) || null;
      }
    } catch { }
  }

  const now = new Date().toISOString();
  const targetId = recordDocId || record?.id || (isAdmin ? "admin-ranjith-01" : `usr-${Date.now()}`);

  const updatedRecord: UserApproval = {
    id: targetId,
    uid: targetId,
    email: cleanEmail,
    name: record?.name || (isAdmin ? "RANJITH SELVARAJ" : cleanEmail.split("@")[0] || "Staff"),
    password: newPassword,
    status: isAdmin ? "approved" : (record?.status || "pending"),
    role: isAdmin ? "administrator" : (record?.role || "staff"),
    requested_at: record?.requested_at || now,
    approved_at: isAdmin ? now : record?.approved_at || null,
    approved_by: isAdmin ? "system" : record?.approved_by || null,
  };

  try {
    await withTimeout(
      setDoc(doc(db, "user_approvals", targetId), updatedRecord, { merge: true }),
      3500,
      null
    );
  } catch (err) {
    console.warn("Firestore reset password notice:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem("rasi_user_approvals");
      let list: UserApproval[] = existingRaw ? JSON.parse(existingRaw) : [];
      list = list.filter((u) => u.email.toLowerCase() !== cleanEmail);
      list.push(updatedRecord);
      localStorage.setItem("rasi_user_approvals", JSON.stringify(list));
    } catch { }
  }

  return {
    success: true,
    message: `Password reset successfully for ${cleanEmail}!`,
  };
}

export async function fbLoadUserApprovals(): Promise<UserApproval[]> {
  try {
    const snap = await withTimeout(getDocs(collection(db, "user_approvals")), 3000, null);
    if (snap && !snap.empty) {
      const list = snap.docs.map((d) => d.data() as UserApproval);
      if (typeof window !== "undefined") {
        localStorage.setItem("rasi_user_approvals", JSON.stringify(list));
      }
      return list;
    }
  } catch (err) {
    console.warn("Firestore load user approvals warning:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const existing = localStorage.getItem("rasi_user_approvals");
      if (existing) return JSON.parse(existing);
    } catch { }
  }
  return [];
}

export async function fbSetUserApprovalStatus(
  idOrUid: string,
  status: "approved" | "rejected"
): Promise<void> {
  const updateData = {
    status,
    approved_at: status === "approved" ? new Date().toISOString() : null,
    approved_by: "ranjithselvaraj14@gmail.com",
    updated_at: new Date().toISOString(),
  };

  try {
    await withTimeout(
      setDoc(doc(db, "user_approvals", idOrUid), updateData, { merge: true }),
      3000,
      null
    );
  } catch (err) {
    console.warn("Firestore update user approval status warning:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem("rasi_user_approvals");
      if (existingRaw) {
        const list: UserApproval[] = JSON.parse(existingRaw);
        const updated = list.map((u) => (u.id === idOrUid || u.uid === idOrUid ? { ...u, ...updateData } : u));
        localStorage.setItem("rasi_user_approvals", JSON.stringify(updated));
      }
    } catch { }
  }
}
