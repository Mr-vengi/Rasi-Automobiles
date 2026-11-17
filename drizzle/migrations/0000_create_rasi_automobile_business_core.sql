CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.business_settings (
  business_id uuid PRIMARY KEY DEFAULT '00000000-0000-4000-8000-000000000001',
  business_name text NOT NULL DEFAULT 'Rasi Automobiles',
  owner_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  mobile text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  gstin text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  state_code text NOT NULL DEFAULT '',
  invoice_prefix text NOT NULL DEFAULT 'RA',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  currency_code text NOT NULL DEFAULT 'INR',
  invoice_footer text NOT NULL DEFAULT '',
  tax_inclusive boolean NOT NULL DEFAULT false,
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_settings TO authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  state_code text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.roles (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.permissions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  role_id text NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id text NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES public.roles(id),
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.user_business_id(p_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.profiles WHERE id = p_user_id
$$;

CREATE FUNCTION public.has_role(p_role text, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p_user_id AND ur.role_id = p_role)
$$;

CREATE FUNCTION public.has_permission(p_permission text, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id AND rp.permission_id = p_permission
  )
$$;

CREATE FUNCTION public.initialize_rasi_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_business_id uuid := '00000000-0000-4000-8000-000000000001';
  v_first_user boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('rasi-automobiles-first-owner'));
  v_first_user := NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1);

  INSERT INTO public.business_settings (business_id) VALUES (v_business_id)
  ON CONFLICT (business_id) DO NOTHING;

  INSERT INTO public.branches (business_id, name)
  VALUES (v_business_id, 'Main branch')
  ON CONFLICT (business_id, name) DO NOTHING;

  INSERT INTO public.profiles (id, business_id, full_name, email)
  VALUES (
    NEW.id,
    v_business_id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (NEW.id, CASE WHEN v_first_user THEN 'owner' ELSE 'billing_staff' END)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_initialize_rasi
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.initialize_rasi_user();

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  customer_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  billing_address text NOT NULL DEFAULT '',
  gstin text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  customer_type text NOT NULL DEFAULT 'retail' CHECK (customer_type IN ('retail', 'wholesale', 'workshop', 'dealer', 'other')),
  credit_limit numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  notes text NOT NULL DEFAULT '',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX customers_business_name_idx ON public.customers (business_id, customer_name);

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  supplier_name text NOT NULL,
  contact_person text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  gstin text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  credit_terms_days integer NOT NULL DEFAULT 0 CHECK (credit_terms_days >= 0),
  notes text NOT NULL DEFAULT '',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE INDEX suppliers_business_name_idx ON public.suppliers (business_id, supplier_name);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  sku text NOT NULL,
  barcode text NOT NULL DEFAULT '',
  part_number text NOT NULL DEFAULT '',
  oem_number text NOT NULL DEFAULT '',
  brand_name text NOT NULL DEFAULT '',
  category_name text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'pcs',
  purchase_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  mrp numeric(14,2) NOT NULL DEFAULT 0 CHECK (mrp >= 0),
  wholesale_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (wholesale_price >= 0),
  gst_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (gst_rate >= 0 AND gst_rate <= 100),
  hsn_code text NOT NULL DEFAULT '',
  current_stock numeric(14,3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock numeric(14,3) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  maximum_stock numeric(14,3) CHECK (maximum_stock IS NULL OR maximum_stock >= minimum_stock),
  shelf_location text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, sku)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX products_business_name_idx ON public.products (business_id, product_name);
CREATE INDEX products_business_barcode_idx ON public.products (business_id, barcode) WHERE barcode <> '';
CREATE INDEX products_business_category_idx ON public.products (business_id, category_id);

CREATE FUNCTION public.prevent_direct_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.current_stock <> 0 THEN
    RAISE EXCEPTION 'Opening stock must be added through an audited stock adjustment';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.current_stock IS DISTINCT FROM OLD.current_stock
     AND current_setting('app.allow_stock_write', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Stock may only change through an audited inventory operation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER products_stock_guard
BEFORE INSERT OR UPDATE OF current_stock ON public.products
FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_stock_change();

CREATE TABLE public.invoice_sequences (
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  financial_year text NOT NULL,
  current_number bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, financial_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_sequences TO authenticated;
GRANT ALL ON public.invoice_sequences TO service_role;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  idempotency_key uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'completed', 'cancelled')),
  sale_date timestamptz NOT NULL DEFAULT now(),
  is_interstate boolean NOT NULL DEFAULT false,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  taxable_amount numeric(14,2) NOT NULL DEFAULT 0,
  cgst_amount numeric(14,2) NOT NULL DEFAULT 0,
  sgst_amount numeric(14,2) NOT NULL DEFAULT 0,
  igst_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  balance_due numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, invoice_number),
  UNIQUE (business_id, idempotency_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE INDEX sales_business_date_idx ON public.sales (business_id, sale_date DESC);
CREATE INDEX sales_business_status_idx ON public.sales (business_id, status);

CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  sku text NOT NULL,
  hsn_code text NOT NULL DEFAULT '',
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  discount_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 100),
  gst_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (gst_rate >= 0 AND gst_rate <= 100),
  taxable_amount numeric(14,2) NOT NULL,
  cgst_amount numeric(14,2) NOT NULL DEFAULT 0,
  sgst_amount numeric(14,2) NOT NULL DEFAULT 0,
  igst_amount numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX sale_items_sale_idx ON public.sale_items (sale_id);

CREATE TABLE public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  reference_number text NOT NULL DEFAULT '',
  received_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_payments TO authenticated;
GRANT ALL ON public.sale_payments TO service_role;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX sale_payments_sale_idx ON public.sale_payments (sale_id);

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  supplier_reference text,
  idempotency_key uuid NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'cancelled')),
  purchase_date date NOT NULL DEFAULT current_date,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  taxable_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  balance_due numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, idempotency_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX purchases_supplier_reference_idx ON public.purchases (business_id, supplier_id, supplier_reference) WHERE supplier_reference IS NOT NULL AND supplier_reference <> '';
CREATE INDEX purchases_business_date_idx ON public.purchases (business_id, purchase_date DESC);

CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  sku text NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0),
  discount_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 100),
  gst_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (gst_rate >= 0 AND gst_rate <= 100),
  taxable_amount numeric(14,2) NOT NULL,
  tax_amount numeric(14,2) NOT NULL,
  line_total numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;
GRANT ALL ON public.purchase_items TO service_role;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX purchase_items_purchase_idx ON public.purchase_items (purchase_id);

CREATE TABLE public.purchase_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  reference_number text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_payments TO authenticated;
GRANT ALL ON public.purchase_payments TO service_role;
ALTER TABLE public.purchase_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX purchase_payments_purchase_idx ON public.purchase_payments (purchase_id);

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  movement_type text NOT NULL CHECK (movement_type IN ('adjustment', 'sale', 'purchase', 'return', 'damage')),
  quantity_delta numeric(14,3) NOT NULL CHECK (quantity_delta <> 0),
  stock_after numeric(14,3) NOT NULL CHECK (stock_after >= 0),
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  reference_type text NOT NULL DEFAULT '',
  reference_id uuid,
  reason text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE INDEX stock_movements_product_date_idx ON public.stock_movements (business_id, product_id, created_at DESC);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  expense_date date NOT NULL DEFAULT current_date,
  reference_number text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE INDEX expenses_business_date_idx ON public.expenses (business_id, expense_date DESC);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  category text NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  related_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX notifications_business_date_idx ON public.notifications (business_id, created_at DESC);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_settings(business_id),
  actor_id uuid,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX audit_logs_business_date_idx ON public.audit_logs (business_id, created_at DESC);

CREATE FUNCTION public.record_business_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_record_id uuid;
BEGIN
  v_business_id := COALESCE(NEW.business_id, OLD.business_id);
  v_record_id := COALESCE(NEW.id, OLD.id);
  INSERT INTO public.audit_logs (business_id, actor_id, table_name, record_id, action, old_data, new_data)
  VALUES (
    v_business_id,
    auth.uid(),
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.record_business_audit();
CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.record_business_audit();
CREATE TRIGGER audit_suppliers AFTER INSERT OR UPDATE OR DELETE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.record_business_audit();
CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.record_business_audit();
CREATE TRIGGER audit_purchases AFTER INSERT OR UPDATE OR DELETE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.record_business_audit();
CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.record_business_audit();
CREATE TRIGGER audit_stock_movements AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.record_business_audit();
CREATE TRIGGER audit_business_settings AFTER UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.record_business_audit();

CREATE FUNCTION public.create_sale(
  p_items jsonb,
  p_payments jsonb DEFAULT '[]'::jsonb,
  p_customer_id uuid DEFAULT NULL,
  p_is_interstate boolean DEFAULT false,
  p_status text DEFAULT 'completed',
  p_idempotency_key uuid DEFAULT gen_random_uuid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_business_id uuid := public.user_business_id(auth.uid());
  v_sale_id uuid;
  v_customer record;
  v_product record;
  v_item jsonb;
  v_payment jsonb;
  v_item_qty numeric(14,3);
  v_unit_price numeric(14,2);
  v_unit_cost numeric(14,2);
  v_gst_rate numeric(5,2);
  v_discount numeric(5,2);
  v_taxable numeric(14,2);
  v_tax numeric(14,2);
  v_cgst numeric(14,2);
  v_sgst numeric(14,2);
  v_igst numeric(14,2);
  v_line_total numeric(14,2);
  v_subtotal numeric(14,2) := 0;
  v_discount_total numeric(14,2) := 0;
  v_taxable_total numeric(14,2) := 0;
  v_cgst_total numeric(14,2) := 0;
  v_sgst_total numeric(14,2) := 0;
  v_igst_total numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
  v_paid numeric(14,2) := 0;
  v_financial_start integer;
  v_financial_year text;
  v_sequence bigint;
  v_prefix text;
  v_invoice text;
BEGIN
  IF auth.uid() IS NULL OR v_business_id IS NULL OR NOT public.has_permission('sales:create') THEN
    RAISE EXCEPTION 'You do not have permission to create sales';
  END IF;
  IF p_status NOT IN ('draft', 'completed') THEN RAISE EXCEPTION 'Invalid sale status'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 200 THEN
    RAISE EXCEPTION 'A sale must contain between 1 and 200 items';
  END IF;
  IF p_payments IS NULL OR jsonb_typeof(p_payments) <> 'array' THEN RAISE EXCEPTION 'Invalid payments'; END IF;
  IF p_status = 'draft' AND jsonb_array_length(p_payments) > 0 THEN RAISE EXCEPTION 'Draft bills cannot record payments'; END IF;

  SELECT id INTO v_sale_id FROM public.sales WHERE business_id = v_business_id AND idempotency_key = p_idempotency_key;
  IF v_sale_id IS NOT NULL THEN RETURN v_sale_id; END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM public.customers WHERE id = p_customer_id AND business_id = v_business_id AND archived_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;
  END IF;

  FOR v_product IN
    SELECT pr.id, pr.current_stock, COALESCE(SUM((it.value ->> 'quantity')::numeric), 0) AS requested_qty
    FROM public.products pr
    JOIN jsonb_array_elements(p_items) AS it(value) ON pr.id = (it.value ->> 'product_id')::uuid
    WHERE pr.business_id = v_business_id AND pr.is_active = true AND pr.archived_at IS NULL
    GROUP BY pr.id, pr.current_stock
    ORDER BY pr.id
    FOR UPDATE OF pr
  LOOP
    IF p_status = 'completed' AND v_product.current_stock < v_product.requested_qty THEN
      RAISE EXCEPTION 'Insufficient stock for one or more items';
    END IF;
  END LOOP;
  IF (SELECT COUNT(DISTINCT (value ->> 'product_id')::uuid) FROM jsonb_array_elements(p_items)) <>
     (SELECT COUNT(DISTINCT pr.id) FROM public.products pr WHERE pr.id IN (SELECT (value ->> 'product_id')::uuid FROM jsonb_array_elements(p_items)) AND pr.business_id = v_business_id AND pr.is_active = true AND pr.archived_at IS NULL) THEN
    RAISE EXCEPTION 'One or more products are unavailable';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_item_qty := (v_item ->> 'quantity')::numeric;
    IF v_item_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item ->> 'product_id')::uuid AND business_id = v_business_id;
    v_unit_price := v_product.selling_price;
    v_unit_cost := v_product.purchase_price;
    v_gst_rate := v_product.gst_rate;
    v_discount := COALESCE((v_item ->> 'discount_rate')::numeric, 0);
    IF v_discount < 0 OR v_discount > 100 THEN RAISE EXCEPTION 'Discount must be between 0 and 100 percent'; END IF;
    v_subtotal := v_subtotal + round(v_item_qty * v_unit_price, 2);
    v_taxable := round(v_item_qty * v_unit_price * (1 - v_discount / 100), 2);
    v_tax := round(v_taxable * v_gst_rate / 100, 2);
    v_cgst := CASE WHEN p_is_interstate THEN 0 ELSE round(v_tax / 2, 2) END;
    v_sgst := CASE WHEN p_is_interstate THEN 0 ELSE v_tax - v_cgst END;
    v_igst := CASE WHEN p_is_interstate THEN v_tax ELSE 0 END;
    v_line_total := v_taxable + v_tax;
    v_discount_total := v_discount_total + round(v_item_qty * v_unit_price, 2) - v_taxable;
    v_taxable_total := v_taxable_total + v_taxable;
    v_cgst_total := v_cgst_total + v_cgst;
    v_sgst_total := v_sgst_total + v_sgst;
    v_igst_total := v_igst_total + v_igst;
    v_total := v_total + v_line_total;
  END LOOP;

  IF p_status = 'completed' THEN
    FOR v_payment IN SELECT value FROM jsonb_array_elements(p_payments) LOOP
      IF COALESCE((v_payment ->> 'amount')::numeric, 0) <= 0 THEN RAISE EXCEPTION 'Payment amounts must be greater than zero'; END IF;
      IF COALESCE(v_payment ->> 'payment_method', '') NOT IN ('cash', 'upi', 'card', 'bank_transfer', 'other') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
      v_paid := v_paid + round((v_payment ->> 'amount')::numeric, 2);
    END LOOP;
    IF v_paid > v_total THEN RAISE EXCEPTION 'Payments cannot exceed the invoice total'; END IF;
  END IF;

  v_financial_start := CASE WHEN EXTRACT(MONTH FROM now() AT TIME ZONE 'Asia/Kolkata') >= 4 THEN EXTRACT(YEAR FROM now() AT TIME ZONE 'Asia/Kolkata')::integer ELSE EXTRACT(YEAR FROM now() AT TIME ZONE 'Asia/Kolkata')::integer - 1 END;
  v_financial_year := 'FY' || right(v_financial_start::text, 2) || right((v_financial_start + 1)::text, 2);
  SELECT invoice_prefix INTO v_prefix FROM public.business_settings WHERE business_id = v_business_id;
  INSERT INTO public.invoice_sequences (business_id, financial_year, current_number)
  VALUES (v_business_id, v_financial_year, 1)
  ON CONFLICT (business_id, financial_year) DO UPDATE SET current_number = public.invoice_sequences.current_number + 1
  RETURNING current_number INTO v_sequence;
  v_invoice := COALESCE(NULLIF(v_prefix, ''), 'RA') || '-' || v_financial_year || '-' || lpad(v_sequence::text, 5, '0');

  INSERT INTO public.sales (business_id, customer_id, invoice_number, idempotency_key, status, is_interstate, subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_due, created_by)
  VALUES (v_business_id, p_customer_id, v_invoice, p_idempotency_key, p_status, COALESCE(p_is_interstate, false), v_subtotal, v_discount_total, v_taxable_total, v_cgst_total, v_sgst_total, v_igst_total, v_total, v_paid, v_total - v_paid, auth.uid())
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_item_qty := (v_item ->> 'quantity')::numeric;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item ->> 'product_id')::uuid AND business_id = v_business_id;
    v_unit_price := v_product.selling_price;
    v_unit_cost := v_product.purchase_price;
    v_gst_rate := v_product.gst_rate;
    v_discount := COALESCE((v_item ->> 'discount_rate')::numeric, 0);
    v_taxable := round(v_item_qty * v_unit_price * (1 - v_discount / 100), 2);
    v_tax := round(v_taxable * v_gst_rate / 100, 2);
    v_cgst := CASE WHEN p_is_interstate THEN 0 ELSE round(v_tax / 2, 2) END;
    v_sgst := CASE WHEN p_is_interstate THEN 0 ELSE v_tax - v_cgst END;
    v_igst := CASE WHEN p_is_interstate THEN v_tax ELSE 0 END;
    v_line_total := v_taxable + v_tax;
    INSERT INTO public.sale_items (sale_id, product_id, product_name, sku, hsn_code, quantity, unit_price, unit_cost, discount_rate, gst_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, line_total)
    VALUES (v_sale_id, v_product.id, v_product.product_name, v_product.sku, v_product.hsn_code, v_item_qty, v_unit_price, v_unit_cost, v_discount, v_gst_rate, v_taxable, v_cgst, v_sgst, v_igst, v_line_total);
  END LOOP;

  IF p_status = 'completed' THEN
    PERFORM set_config('app.allow_stock_write', 'true', true);
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
      v_item_qty := (v_item ->> 'quantity')::numeric;
      SELECT * INTO v_product FROM public.products WHERE id = (v_item ->> 'product_id')::uuid AND business_id = v_business_id;
      UPDATE public.products SET current_stock = current_stock - v_item_qty, updated_at = now() WHERE id = v_product.id;
      INSERT INTO public.stock_movements (business_id, product_id, movement_type, quantity_delta, stock_after, unit_cost, reference_type, reference_id, reason, created_by)
      VALUES (v_business_id, v_product.id, 'sale', -v_item_qty, v_product.current_stock - v_item_qty, v_product.purchase_price, 'sale', v_sale_id, 'Sale ' || v_invoice, auth.uid());
    END LOOP;
    FOR v_payment IN SELECT value FROM jsonb_array_elements(p_payments) LOOP
      INSERT INTO public.sale_payments (business_id, sale_id, payment_method, amount, reference_number, received_by)
      VALUES (v_business_id, v_sale_id, v_payment ->> 'payment_method', round((v_payment ->> 'amount')::numeric, 2), COALESCE(v_payment ->> 'reference_number', ''), auth.uid());
    END LOOP;
  END IF;

  RETURN v_sale_id;
END;
$$;

CREATE FUNCTION public.receive_purchase(
  p_supplier_id uuid,
  p_supplier_reference text,
  p_purchase_date date,
  p_items jsonb,
  p_payments jsonb DEFAULT '[]'::jsonb,
  p_idempotency_key uuid DEFAULT gen_random_uuid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_business_id uuid := public.user_business_id(auth.uid());
  v_purchase_id uuid;
  v_supplier record;
  v_product record;
  v_item jsonb;
  v_payment jsonb;
  v_qty numeric(14,3);
  v_cost numeric(14,2);
  v_discount numeric(5,2);
  v_gst numeric(5,2);
  v_taxable numeric(14,2);
  v_tax numeric(14,2);
  v_subtotal numeric(14,2) := 0;
  v_discount_total numeric(14,2) := 0;
  v_taxable_total numeric(14,2) := 0;
  v_tax_total numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
  v_paid numeric(14,2) := 0;
BEGIN
  IF auth.uid() IS NULL OR v_business_id IS NULL OR NOT public.has_permission('purchases:receive') THEN RAISE EXCEPTION 'You do not have permission to receive purchases'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 200 THEN RAISE EXCEPTION 'A purchase must contain between 1 and 200 items'; END IF;
  IF jsonb_typeof(COALESCE(p_payments, '[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'Invalid payments'; END IF;
  SELECT id INTO v_purchase_id FROM public.purchases WHERE business_id = v_business_id AND idempotency_key = p_idempotency_key;
  IF v_purchase_id IS NOT NULL THEN RETURN v_purchase_id; END IF;
  SELECT * INTO v_supplier FROM public.suppliers WHERE id = p_supplier_id AND business_id = v_business_id AND archived_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Supplier not found'; END IF;

  FOR v_product IN
    SELECT pr.id FROM public.products pr
    JOIN jsonb_array_elements(p_items) AS it(value) ON pr.id = (it.value ->> 'product_id')::uuid
    WHERE pr.business_id = v_business_id AND pr.is_active = true AND pr.archived_at IS NULL
    GROUP BY pr.id ORDER BY pr.id FOR UPDATE OF pr
  LOOP NULL; END LOOP;
  IF (SELECT COUNT(DISTINCT (value ->> 'product_id')::uuid) FROM jsonb_array_elements(p_items)) <>
     (SELECT COUNT(DISTINCT pr.id) FROM public.products pr WHERE pr.id IN (SELECT (value ->> 'product_id')::uuid FROM jsonb_array_elements(p_items)) AND pr.business_id = v_business_id AND pr.is_active = true AND pr.archived_at IS NULL) THEN RAISE EXCEPTION 'One or more products are unavailable'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item ->> 'quantity')::numeric;
    v_cost := (v_item ->> 'unit_cost')::numeric;
    v_discount := COALESCE((v_item ->> 'discount_rate')::numeric, 0);
    v_gst := COALESCE((v_item ->> 'gst_rate')::numeric, 0);
    IF v_qty <= 0 OR v_cost < 0 OR v_discount < 0 OR v_discount > 100 OR v_gst < 0 OR v_gst > 100 THEN RAISE EXCEPTION 'Check purchase quantities, prices, and tax rates'; END IF;
    v_subtotal := v_subtotal + round(v_qty * v_cost, 2);
    v_taxable := round(v_qty * v_cost * (1 - v_discount / 100), 2);
    v_tax := round(v_taxable * v_gst / 100, 2);
    v_discount_total := v_discount_total + round(v_qty * v_cost, 2) - v_taxable;
    v_taxable_total := v_taxable_total + v_taxable;
    v_tax_total := v_tax_total + v_tax;
    v_total := v_total + v_taxable + v_tax;
  END LOOP;
  FOR v_payment IN SELECT value FROM jsonb_array_elements(COALESCE(p_payments, '[]'::jsonb)) LOOP
    IF COALESCE((v_payment ->> 'amount')::numeric, 0) <= 0 OR COALESCE(v_payment ->> 'payment_method', '') NOT IN ('cash', 'upi', 'card', 'bank_transfer', 'other') THEN RAISE EXCEPTION 'Check purchase payments'; END IF;
    v_paid := v_paid + round((v_payment ->> 'amount')::numeric, 2);
  END LOOP;
  IF v_paid > v_total THEN RAISE EXCEPTION 'Payments cannot exceed the purchase total'; END IF;

  INSERT INTO public.purchases (business_id, supplier_id, supplier_reference, idempotency_key, purchase_date, subtotal, discount_amount, taxable_amount, tax_amount, total_amount, paid_amount, balance_due, created_by)
  VALUES (v_business_id, p_supplier_id, NULLIF(trim(COALESCE(p_supplier_reference, '')), ''), p_idempotency_key, COALESCE(p_purchase_date, current_date), v_subtotal, v_discount_total, v_taxable_total, v_tax_total, v_total, v_paid, v_total - v_paid, auth.uid())
  RETURNING id INTO v_purchase_id;

  PERFORM set_config('app.allow_stock_write', 'true', true);
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item ->> 'quantity')::numeric;
    v_cost := (v_item ->> 'unit_cost')::numeric;
    v_discount := COALESCE((v_item ->> 'discount_rate')::numeric, 0);
    v_gst := COALESCE((v_item ->> 'gst_rate')::numeric, 0);
    SELECT * INTO v_product FROM public.products WHERE id = (v_item ->> 'product_id')::uuid AND business_id = v_business_id;
    v_taxable := round(v_qty * v_cost * (1 - v_discount / 100), 2);
    v_tax := round(v_taxable * v_gst / 100, 2);
    INSERT INTO public.purchase_items (purchase_id, product_id, product_name, sku, quantity, unit_cost, discount_rate, gst_rate, taxable_amount, tax_amount, line_total)
    VALUES (v_purchase_id, v_product.id, v_product.product_name, v_product.sku, v_qty, v_cost, v_discount, v_gst, v_taxable, v_tax, v_taxable + v_tax);
    UPDATE public.products
      SET purchase_price = CASE WHEN current_stock + v_qty = 0 THEN v_cost ELSE round(((current_stock * purchase_price) + (v_qty * v_cost)) / (current_stock + v_qty), 2) END,
          current_stock = current_stock + v_qty,
          updated_at = now()
      WHERE id = v_product.id;
    INSERT INTO public.stock_movements (business_id, product_id, movement_type, quantity_delta, stock_after, unit_cost, reference_type, reference_id, reason, created_by)
    VALUES (v_business_id, v_product.id, 'purchase', v_qty, v_product.current_stock + v_qty, v_cost, 'purchase', v_purchase_id, 'Goods received', auth.uid());
  END LOOP;
  FOR v_payment IN SELECT value FROM jsonb_array_elements(COALESCE(p_payments, '[]'::jsonb)) LOOP
    INSERT INTO public.purchase_payments (business_id, purchase_id, payment_method, amount, reference_number, created_by)
    VALUES (v_business_id, v_purchase_id, v_payment ->> 'payment_method', round((v_payment ->> 'amount')::numeric, 2), COALESCE(v_payment ->> 'reference_number', ''), auth.uid());
  END LOOP;
  RETURN v_purchase_id;
END;
$$;

CREATE FUNCTION public.adjust_inventory(p_product_id uuid, p_quantity_delta numeric, p_reason text, p_reference text DEFAULT '')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_business_id uuid := public.user_business_id(auth.uid());
  v_product public.products%ROWTYPE;
  v_movement_id uuid;
  v_new_stock numeric(14,3);
BEGIN
  IF auth.uid() IS NULL OR v_business_id IS NULL OR NOT public.has_permission('inventory:adjust') THEN RAISE EXCEPTION 'You do not have permission to adjust stock'; END IF;
  IF p_quantity_delta = 0 OR p_reason IS NULL OR length(trim(p_reason)) < 3 THEN RAISE EXCEPTION 'Enter a non-zero quantity and a reason'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND business_id = v_business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  v_new_stock := v_product.current_stock + p_quantity_delta;
  IF v_new_stock < 0 THEN RAISE EXCEPTION 'Stock cannot become negative'; END IF;
  PERFORM set_config('app.allow_stock_write', 'true', true);
  UPDATE public.products SET current_stock = v_new_stock, updated_at = now() WHERE id = p_product_id;
  INSERT INTO public.stock_movements (business_id, product_id, movement_type, quantity_delta, stock_after, unit_cost, reference_type, reason, created_by)
  VALUES (v_business_id, p_product_id, CASE WHEN p_quantity_delta < 0 THEN 'damage' ELSE 'adjustment' END, p_quantity_delta, v_new_stock, v_product.purchase_price, NULLIF(p_reference, ''), trim(p_reason), auth.uid())
  RETURNING id INTO v_movement_id;
  RETURN v_movement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.user_business_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_permission(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_business_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.create_sale(jsonb, jsonb, uuid, boolean, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.receive_purchase(uuid, text, date, jsonb, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adjust_inventory(uuid, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sale(jsonb, jsonb, uuid, boolean, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_purchase(uuid, text, date, jsonb, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_inventory(uuid, numeric, text, text) TO authenticated;

CREATE POLICY business_settings_select ON public.business_settings FOR SELECT TO authenticated USING (business_id = public.user_business_id());
CREATE POLICY business_settings_update ON public.business_settings FOR UPDATE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('settings:manage')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('settings:manage'));
CREATE POLICY branches_select ON public.branches FOR SELECT TO authenticated USING (business_id = public.user_business_id());
CREATE POLICY branches_manage ON public.branches FOR ALL TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('settings:manage')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('settings:manage'));
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_permission('employees:manage'));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND business_id = public.user_business_id());
CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated USING (public.user_business_id() IS NOT NULL);
CREATE POLICY permissions_select ON public.permissions FOR SELECT TO authenticated USING (public.user_business_id() IS NOT NULL);
CREATE POLICY role_permissions_select ON public.role_permissions FOR SELECT TO authenticated USING (public.user_business_id() IS NOT NULL);
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_permission('employees:manage'));
CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_permission('employees:manage'));
CREATE POLICY user_roles_update ON public.user_roles FOR UPDATE TO authenticated USING (public.has_permission('employees:manage')) WITH CHECK (public.has_permission('employees:manage'));
CREATE POLICY user_roles_delete ON public.user_roles FOR DELETE TO authenticated USING (public.has_permission('employees:manage'));
CREATE POLICY categories_access ON public.categories FOR ALL TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('products:read')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('products:write'));
CREATE POLICY brands_access ON public.brands FOR ALL TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('products:read')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('products:write'));
CREATE POLICY customers_access ON public.customers FOR ALL TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('customers:read')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('customers:write'));
CREATE POLICY suppliers_access ON public.suppliers FOR ALL TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('suppliers:read')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('suppliers:write'));
CREATE POLICY products_select ON public.products FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('products:read'));
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (business_id = public.user_business_id() AND current_stock = 0 AND public.has_permission('products:write'));
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('products:write')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('products:write'));
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('products:write'));
CREATE POLICY invoice_sequences_select ON public.invoice_sequences FOR SELECT TO authenticated USING (business_id = public.user_business_id());
CREATE POLICY sales_select ON public.sales FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('reports:read'));
CREATE POLICY sale_items_select ON public.sale_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.business_id = public.user_business_id() AND public.has_permission('reports:read')));
CREATE POLICY sale_payments_select ON public.sale_payments FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('payments:read'));
CREATE POLICY purchases_select ON public.purchases FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('purchases:read'));
CREATE POLICY purchase_items_select ON public.purchase_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_id AND p.business_id = public.user_business_id() AND public.has_permission('purchases:read')));
CREATE POLICY purchase_payments_select ON public.purchase_payments FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('payments:read'));
CREATE POLICY stock_movements_select ON public.stock_movements FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('inventory:read'));
CREATE POLICY expenses_access ON public.expenses FOR ALL TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('expenses:read')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('expenses:write'));
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING (business_id = public.user_business_id());
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated USING (business_id = public.user_business_id()) WITH CHECK (business_id = public.user_business_id());
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('audit:read'));
