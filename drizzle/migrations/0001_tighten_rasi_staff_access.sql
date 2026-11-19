DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;
CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role('owner') AND user_id IS NOT NULL AND role_id <> 'owner');
CREATE POLICY user_roles_update ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role('owner') AND role_id <> 'owner') WITH CHECK (public.has_role('owner') AND role_id <> 'owner');
CREATE POLICY user_roles_delete ON public.user_roles FOR DELETE TO authenticated USING (public.has_role('owner') AND role_id <> 'owner');

INSERT INTO public.permissions (id, name, description) VALUES
  ('sales:read', 'View sales and invoices', 'Read sales invoices and line-item details.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('owner', 'sales:read'),
  ('manager', 'sales:read'),
  ('billing_staff', 'sales:read'),
  ('accountant', 'sales:read'),
  ('read_only_auditor', 'sales:read')
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS sales_select ON public.sales;
DROP POLICY IF EXISTS sale_items_select ON public.sale_items;
CREATE POLICY sales_select ON public.sales FOR SELECT TO authenticated USING (business_id = public.user_business_id() AND public.has_permission('sales:read'));
CREATE POLICY sale_items_select ON public.sale_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.business_id = public.user_business_id() AND public.has_permission('sales:read')));