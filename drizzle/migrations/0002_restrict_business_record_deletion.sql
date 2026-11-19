DROP POLICY IF EXISTS categories_access ON public.categories;
CREATE POLICY categories_select ON public.categories FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('products:read'));
CREATE POLICY categories_insert ON public.categories FOR INSERT TO authenticated WITH CHECK (business_id = public.user_business_id() AND public.has_permission('products:write'));
CREATE POLICY categories_update ON public.categories FOR UPDATE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('products:write')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('products:write'));
CREATE POLICY categories_delete ON public.categories FOR DELETE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('products:write'));

DROP POLICY IF EXISTS brands_access ON public.brands;
CREATE POLICY brands_select ON public.brands FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('products:read'));
CREATE POLICY brands_insert ON public.brands FOR INSERT TO authenticated WITH CHECK (business_id = public.user_business_id() AND public.has_permission('products:write'));
CREATE POLICY brands_update ON public.brands FOR UPDATE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('products:write')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('products:write'));
CREATE POLICY brands_delete ON public.brands FOR DELETE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('products:write'));

DROP POLICY IF EXISTS customers_access ON public.customers;
CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('customers:read'));
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated WITH CHECK (business_id = public.user_business_id() AND public.has_permission('customers:write'));
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('customers:write')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('customers:write'));
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('customers:write'));

DROP POLICY IF EXISTS suppliers_access ON public.suppliers;
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('suppliers:read'));
CREATE POLICY suppliers_insert ON public.suppliers FOR INSERT TO authenticated WITH CHECK (business_id = public.user_business_id() AND public.has_permission('suppliers:write'));
CREATE POLICY suppliers_update ON public.suppliers FOR UPDATE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('suppliers:write')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('suppliers:write'));
CREATE POLICY suppliers_delete ON public.suppliers FOR DELETE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('suppliers:write'));

DROP POLICY IF EXISTS expenses_access ON public.expenses;
CREATE POLICY expenses_select ON public.expenses FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('expenses:read'));
CREATE POLICY expenses_insert ON public.expenses FOR INSERT TO authenticated WITH CHECK (business_id = public.user_business_id() AND public.has_permission('expenses:write'));
CREATE POLICY expenses_update ON public.expenses FOR UPDATE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('expenses:write')) WITH CHECK (business_id = public.user_business_id() AND public.has_permission('expenses:write'));
CREATE POLICY expenses_delete ON public.expenses FOR DELETE TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('expenses:write'));