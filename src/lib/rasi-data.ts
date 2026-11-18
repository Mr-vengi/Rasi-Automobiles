import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const RASI_BUSINESS_ID = "00000000-0000-4000-8000-000000000001";

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
};

function ensureData<T>(data: T | null, error: { message: string } | null) {
  if (error) throw new Error(error.message);
  return data as T;
}

export async function loadSettings() {
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("business_id", RASI_BUSINESS_ID)
    .single();
  return ensureData(data, error);
}

export async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", RASI_BUSINESS_ID)
    .is("archived_at", null)
    .order("product_name")
    .range(0, 499);
  return ensureData(data, error) ?? [];
}

export async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("business_id", RASI_BUSINESS_ID)
    .order("name");
  return ensureData(data, error) ?? [];
}

export async function loadBrands() {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("business_id", RASI_BUSINESS_ID)
    .order("name");
  return ensureData(data, error) ?? [];
}

export async function loadCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", RASI_BUSINESS_ID)
    .is("archived_at", null)
    .order("customer_name")
    .range(0, 499);
  return ensureData(data, error) ?? [];
}

export async function loadSuppliers() {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("business_id", RASI_BUSINESS_ID)
    .is("archived_at", null)
    .order("supplier_name")
    .range(0, 499);
  return ensureData(data, error) ?? [];
}

export async function loadSales() {
  const { data, error } = await supabase
    .from("sales")
    .select("*, customers(customer_name, phone), sale_items(id), sale_payments(payment_method, amount)")
    .eq("business_id", RASI_BUSINESS_ID)
    .order("sale_date", { ascending: false })
    .range(0, 499);
  return ensureData(data, error) ?? [];
}

export async function loadPurchases() {
  const { data, error } = await supabase
    .from("purchases")
    .select("*, suppliers(supplier_name, phone), purchase_items(id)")
    .eq("business_id", RASI_BUSINESS_ID)
    .order("purchase_date", { ascending: false })
    .range(0, 499);
  return ensureData(data, error) ?? [];
}

export async function loadMovements() {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*, products(product_name, sku)")
    .eq("business_id", RASI_BUSINESS_ID)
    .order("created_at", { ascending: false })
    .range(0, 99);
  return ensureData(data, error) ?? [];
}

export async function loadExpenses() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("business_id", RASI_BUSINESS_ID)
    .order("expense_date", { ascending: false })
    .range(0, 499);
  return ensureData(data, error) ?? [];
}

export async function loadEmployees() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, user_roles(role_id, roles(name))")
    .order("created_at");
  return ensureData(data, error) ?? [];
}

export async function updateSettings(values: Tables<"business_settings">["Insert"]) {
  const { data, error } = await supabase
    .from("business_settings")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("business_id", RASI_BUSINESS_ID)
    .select("*")
    .single();
  return ensureData(data, error);
}

export async function saveProduct(values: Tables<"products">["Insert"], id?: string) {
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

export async function saveCustomer(values: Tables<"customers">["Insert"], id?: string) {
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

export async function saveSupplier(values: Tables<"suppliers">["Insert"], id?: string) {
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

export async function saveCategory(name: string) {
  const { data, error } = await supabase
    .from("categories")
    .insert({ business_id: RASI_BUSINESS_ID, name: name.trim() })
    .select("*")
    .single();
  return ensureData(data, error);
}

export async function saveBrand(name: string) {
  const { data, error } = await supabase
    .from("brands")
    .insert({ business_id: RASI_BUSINESS_ID, name: name.trim() })
    .select("*")
    .single();
  return ensureData(data, error);
}

export async function saveExpense(values: Tables<"expenses">["Insert"]) {
  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...values, business_id: RASI_BUSINESS_ID })
    .select("*")
    .single();
  return ensureData(data, error);
}

export async function createSale(
  input: {
    items: { product_id: string; quantity: number; discount_rate: number }[];
    payments: { payment_method: string; amount: number; reference_number: string }[];
    customerId: string | null;
    interstate: boolean;
    status: "draft" | "completed";
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabase.rpc("create_sale", {
    p_items: input.items,
    p_payments: input.payments,
    p_customer_id: input.customerId,
    p_is_interstate: input.interstate,
    p_status: input.status,
    p_idempotency_key: input.idempotencyKey,
  });
  return ensureData(data, error);
}

export async function receivePurchase(input: {
  supplierId: string;
  supplierReference: string;
  purchaseDate: string;
  items: { product_id: string; quantity: number; unit_cost: number; gst_rate: number; discount_rate: number }[];
  payments: { payment_method: string; amount: number; reference_number: string }[];
  idempotencyKey: string;
}) {
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

export async function adjustInventory(productId: string, quantityDelta: number, reason: string) {
  const { data, error } = await supabase.rpc("adjust_inventory", {
    p_product_id: productId,
    p_quantity_delta: quantityDelta,
    p_reason: reason,
    p_reference: "manual adjustment",
  });
  return ensureData(data, error);
}