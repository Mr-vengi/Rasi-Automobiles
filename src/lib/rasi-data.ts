import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { RASI_BUSINESS_ID } from "./constants";
export { RASI_BUSINESS_ID };
import {
  fbLoadSettings,
  fbUpdateSettings,
  fbLoadCategories,
  fbSaveCategory,
  fbLoadBrands,
  fbSaveBrand,
  fbLoadProducts,
  fbSaveProduct,
  fbLoadCustomers,
  fbSaveCustomer,
  fbLoadSuppliers,
  fbSaveSupplier,
  fbArchiveRecord,
  fbLoadExpenses,
  fbSaveExpense,
  fbLoadMovements,
  fbAdjustInventory,
  fbLoadSales,
  fbCreateSale,
  fbRecordCustomerPayment,
  fbClearAllProducts,
  fbClearAllSales,
  fbDeleteSale,
  fbLoadPurchases,
  fbReceivePurchase,
  fbLoadEmployees,
  fbRegisterUserApproval,
  fbCheckUserApproval,
  fbAuthenticateFallback,
  fbResetUserPassword,
  fbLoadUserApprovals,
  fbSetUserApprovalStatus,
  type UserApproval,
  syncAllToFirebase,
  type FirebaseSyncResult,
} from "@/integrations/firebase/firestore-service";

export {
  syncAllToFirebase,
  fbDeleteSale,
  fbRegisterUserApproval,
  fbCheckUserApproval,
  fbAuthenticateFallback,
  fbResetUserPassword,
  fbLoadUserApprovals,
  fbSetUserApprovalStatus,
  type UserApproval,
  type FirebaseSyncResult,
};

export const rasiKeys = {
  all: ["rasi"] as const,
  dashboard: ["rasi", "dashboard"] as const,
  settings: ["rasi", "settings"] as const,
  profiles: ["rasi", "profiles"] as const,
  products: ["rasi", "products"] as const,
  categories: ["rasi", "categories"] as const,
  brands: ["rasi", "brands"] as const,
  customers: ["rasi", "customers"] as const,
  suppliers: ["rasi", "suppliers"] as const,
  sales: ["rasi", "sales"] as const,
  purchases: ["rasi", "purchases"] as const,
  movements: ["rasi", "movements"] as const,
  expenses: ["rasi", "expenses"] as const,
  notifications: ["rasi", "notifications"] as const,
};

function ensureData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export async function loadSettings(): Promise<Tables<"business_settings">> {
  try {
    return await fbLoadSettings();
  } catch (err) {
    console.warn("Falling back to Supabase for loadSettings:", err);
    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", RASI_BUSINESS_ID)
      .single();
    return ensureData(data, error);
  }
}

export async function loadProducts(): Promise<Tables<"products">[]> {
  try {
    return await fbLoadProducts();
  } catch (err) {
    console.warn("Falling back to Supabase for loadProducts:", err);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", RASI_BUSINESS_ID)
      .is("archived_at", null)
      .order("product_name")
      .range(0, 499);
    return ensureData(data, error) ?? [];
  }
}

export async function loadCategories(): Promise<Tables<"categories">[]> {
  try {
    return await fbLoadCategories();
  } catch (err) {
    console.warn("Falling back to Supabase for loadCategories:", err);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("business_id", RASI_BUSINESS_ID)
      .order("name");
    return ensureData(data, error) ?? [];
  }
}

export async function loadBrands(): Promise<Tables<"brands">[]> {
  try {
    return await fbLoadBrands();
  } catch (err) {
    console.warn("Falling back to Supabase for loadBrands:", err);
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("business_id", RASI_BUSINESS_ID)
      .order("name");
    return ensureData(data, error) ?? [];
  }
}

export async function loadCustomers(): Promise<Tables<"customers">[]> {
  try {
    return await fbLoadCustomers();
  } catch (err) {
    console.warn("Falling back to Supabase for loadCustomers:", err);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", RASI_BUSINESS_ID)
      .is("archived_at", null)
      .order("customer_name")
      .range(0, 499);
    return ensureData(data, error) ?? [];
  }
}

export async function loadSuppliers(): Promise<Tables<"suppliers">[]> {
  try {
    return await fbLoadSuppliers();
  } catch (err) {
    console.warn("Falling back to Supabase for loadSuppliers:", err);
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("business_id", RASI_BUSINESS_ID)
      .is("archived_at", null)
      .order("supplier_name")
      .range(0, 499);
    return ensureData(data, error) ?? [];
  }
}

export async function loadSales(): Promise<any[]> {
  try {
    return await fbLoadSales();
  } catch (err) {
    console.warn("Falling back to Supabase for loadSales:", err);
    const { data, error } = await supabase
      .from("sales")
      .select("*, customers(customer_name, phone, gstin, billing_address, state), sale_items(*), sale_payments(*)")
      .eq("business_id", RASI_BUSINESS_ID)
      .order("sale_date", { ascending: false })
      .range(0, 499);
    return ensureData(data, error) ?? [];
  }
}

export async function loadPurchases(): Promise<any[]> {
  try {
    return await fbLoadPurchases();
  } catch (err) {
    console.warn("Falling back to Supabase for loadPurchases:", err);
    const { data, error } = await supabase
      .from("purchases")
      .select("*, suppliers(supplier_name, phone, gstin, address), purchase_items(*), purchase_payments(*)")
      .eq("business_id", RASI_BUSINESS_ID)
      .order("purchase_date", { ascending: false })
      .range(0, 499);
    return ensureData(data, error) ?? [];
  }
}

export async function loadMovements(productId?: string): Promise<any[]> {
  try {
    return await fbLoadMovements(productId);
  } catch (err) {
    console.warn("Falling back to Supabase for loadMovements:", err);
    let q = supabase
      .from("stock_movements")
      .select("*, products(product_name, sku, part_number)")
      .eq("business_id", RASI_BUSINESS_ID)
      .order("created_at", { ascending: false })
      .range(0, 199);
    if (productId) {
      q = q.eq("product_id", productId);
    }
    const { data, error } = await q;
    return ensureData(data, error) ?? [];
  }
}

export async function loadExpenses(): Promise<Tables<"expenses">[]> {
  try {
    return await fbLoadExpenses();
  } catch (err) {
    console.warn("Falling back to Supabase for loadExpenses:", err);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("business_id", RASI_BUSINESS_ID)
      .order("expense_date", { ascending: false })
      .range(0, 499);
    return ensureData(data, error) ?? [];
  }
}

export async function loadEmployees(): Promise<any[]> {
  try {
    return await fbLoadEmployees();
  } catch (err) {
    console.warn("Falling back to Supabase for loadEmployees:", err);
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at");
    if (pErr) throw new Error(pErr.message);

    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("*, roles(name, description)");

    const employeesWithRoles = (profiles ?? []).map((prof) => {
      const roles = (userRoles ?? [])
        .filter((ur) => ur.user_id === prof.id)
        .map((ur) => ({
          role_id: ur.role_id,
          roles: ur.roles ? { name: ur.roles.name, description: ur.roles.description } : null,
        }));
      return {
        ...prof,
        user_roles: roles,
      };
    });
    return employeesWithRoles;
  }
}

export async function loadNotifications() {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("business_id", RASI_BUSINESS_ID)
      .order("created_at", { ascending: false })
      .range(0, 99);
    return ensureData(data, error) ?? [];
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("business_id", RASI_BUSINESS_ID);
    if (error) throw new Error(error.message);
  } catch {
    // ignored
  }
}

export async function updateSettings(values: TablesUpdate<"business_settings">): Promise<Tables<"business_settings">> {
  try {
    return await fbUpdateSettings(values);
  } catch (err) {
    console.warn("Falling back to Supabase for updateSettings:", err);
    const { data, error } = await supabase
      .from("business_settings")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("business_id", RASI_BUSINESS_ID)
      .select("*")
      .single();
    return ensureData(data, error);
  }
}

export async function saveProduct(values: Omit<TablesInsert<"products">, "business_id">, id?: string): Promise<Tables<"products">> {
  try {
    return await fbSaveProduct(values, id);
  } catch (err) {
    console.warn("Falling back to Supabase for saveProduct:", err);
    const result = id
      ? await supabase
        .from("products")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("business_id", RASI_BUSINESS_ID)
        .select("*")
        .single()
      : await supabase
        .from("products")
        .insert({ ...values, business_id: RASI_BUSINESS_ID })
        .select("*")
        .single();
    return ensureData(result.data, result.error);
  }
}

export async function saveCustomer(values: Omit<TablesInsert<"customers">, "business_id">, id?: string): Promise<Tables<"customers">> {
  try {
    return await fbSaveCustomer(values, id);
  } catch (err) {
    console.warn("Falling back to Supabase for saveCustomer:", err);
    const result = id
      ? await supabase
        .from("customers")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("business_id", RASI_BUSINESS_ID)
        .select("*")
        .single()
      : await supabase
        .from("customers")
        .insert({ ...values, business_id: RASI_BUSINESS_ID })
        .select("*")
        .single();
    return ensureData(result.data, result.error);
  }
}

export async function saveSupplier(values: Omit<TablesInsert<"suppliers">, "business_id">, id?: string): Promise<Tables<"suppliers">> {
  try {
    return await fbSaveSupplier(values, id);
  } catch (err) {
    console.warn("Falling back to Supabase for saveSupplier:", err);
    const result = id
      ? await supabase
        .from("suppliers")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("business_id", RASI_BUSINESS_ID)
        .select("*")
        .single()
      : await supabase
        .from("suppliers")
        .insert({ ...values, business_id: RASI_BUSINESS_ID })
        .select("*")
        .single();
    return ensureData(result.data, result.error);
  }
}

export async function deleteOrArchiveRecord(
  table: "products" | "customers" | "suppliers",
  id: string
): Promise<void> {
  try {
    await fbArchiveRecord(table, id);
  } catch (err) {
    console.warn("fbArchiveRecord error:", err);
  }

  if (typeof window !== "undefined" && table === "products") {
    try {
      void fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => { });
      void fetch("/api/delete-product", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => { });
    } catch { }
  }

  try {
    const delRes = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("business_id", RASI_BUSINESS_ID);
    if (delRes.error) {
      await supabase
        .from(table)
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id)
        .eq("business_id", RASI_BUSINESS_ID);
    }
  } catch (err) {
    console.warn("supabase archive error:", err);
  }
}

export async function saveCategory(name: string): Promise<Tables<"categories">> {
  try {
    return await fbSaveCategory(name);
  } catch (err) {
    console.warn("Falling back to Supabase for saveCategory:", err);
    const { data, error } = await supabase
      .from("categories")
      .insert({ business_id: RASI_BUSINESS_ID, name: name.trim() })
      .select("*")
      .single();
    return ensureData(data, error);
  }
}

export async function saveBrand(name: string): Promise<Tables<"brands">> {
  try {
    return await fbSaveBrand(name);
  } catch (err) {
    console.warn("Falling back to Supabase for saveBrand:", err);
    const { data, error } = await supabase
      .from("brands")
      .insert({ business_id: RASI_BUSINESS_ID, name: name.trim() })
      .select("*")
      .single();
    return ensureData(data, error);
  }
}

export async function saveExpense(values: Omit<TablesInsert<"expenses">, "business_id">): Promise<Tables<"expenses">> {
  try {
    return await fbSaveExpense(values);
  } catch (err) {
    console.warn("Falling back to Supabase for saveExpense:", err);
    const { data, error } = await supabase
      .from("expenses")
      .insert({ ...values, business_id: RASI_BUSINESS_ID })
      .select("*")
      .single();
    return ensureData(data, error);
  }
}

export async function createSale(
  input: {
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
  },
): Promise<string> {
  try {
    return await fbCreateSale(input);
  } catch (err) {
    console.warn("Falling back to Supabase for createSale:", err);
    const rpcParams: any = {
      p_items: input.items,
      p_payments: input.payments,
      p_is_interstate: input.interstate,
      p_status: input.status,
      p_idempotency_key: input.idempotencyKey,
    };
    if (input.customerId) {
      rpcParams.p_customer_id = input.customerId;
    }
    const { data, error } = await supabase.rpc("create_sale", rpcParams);
    return ensureData(data, error);
  }
}

export async function receivePurchase(input: {
  supplierId: string;
  supplierReference: string;
  purchaseDate: string;
  items: { product_id: string; quantity: number; unit_cost: number; gst_rate: number; discount_rate: number }[];
  payments: { payment_method: string; amount: number; reference_number: string }[];
  idempotencyKey: string;
}): Promise<string> {
  try {
    return await fbReceivePurchase(input);
  } catch (err) {
    console.warn("Falling back to Supabase for receivePurchase:", err);
    const { data, error } = await supabase.rpc("receive_purchase", {
      p_supplier_id: input.supplierId,
      p_supplier_reference: input.supplierReference,
      p_purchase_date: input.purchaseDate,
      p_items: input.items,
      p_payments: input.payments,
      p_idempotency_key: input.idempotencyKey,
    });
    return ensureData(data, error);
  }
}

export async function adjustInventory(productId: string, quantityDelta: number, reason: string): Promise<any> {
  try {
    return await fbAdjustInventory(productId, quantityDelta, reason);
  } catch (err) {
    console.warn("Falling back to Supabase for adjustInventory:", err);
    const { data, error } = await supabase.rpc("adjust_inventory", {
      p_product_id: productId,
      p_quantity_delta: quantityDelta,
      p_reason: reason,
      p_reference: "manual adjustment",
    });
    return ensureData(data, error);
  }
}

export async function recordCustomerPayment(
  saleId: string,
  amount: number,
  paymentMethod: "cash" | "upi" | "card" | "bank_transfer",
  referenceNumber: string = ""
) {
  try {
    await fbRecordCustomerPayment(saleId, amount, paymentMethod, referenceNumber);
  } catch (err) {
    console.warn("Falling back to Supabase for recordCustomerPayment:", err);
    const { error: payErr } = await supabase.from("sale_payments").insert({
      business_id: RASI_BUSINESS_ID,
      sale_id: saleId,
      payment_method: paymentMethod,
      amount: amount,
      reference_number: referenceNumber,
    });
    if (payErr) throw new Error(payErr.message);

    const { data: payments, error: listErr } = await supabase
      .from("sale_payments")
      .select("amount")
      .eq("sale_id", saleId);
    if (listErr) throw new Error(listErr.message);

    const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

    const { data: saleData } = await supabase
      .from("sales")
      .select("total_amount")
      .eq("id", saleId)
      .single();

    if (saleData) {
      const totalAmount = Number(saleData.total_amount);
      const balanceDue = Math.max(0, totalAmount - totalPaid);
      await supabase
        .from("sales")
        .update({
          paid_amount: totalPaid,
          balance_due: balanceDue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", saleId);
    }
  }
}

export async function clearAllProducts(): Promise<void> {
  return fbClearAllProducts();
}

export async function clearAllSales(): Promise<void> {
  return fbClearAllSales();
}
