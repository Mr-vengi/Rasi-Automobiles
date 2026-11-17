# Rasi Automobiles Billing & Inventory

## Outcome
Replace the starter page with a responsive, signed-in business workspace for Rasi Automobiles. Use a small-business counter workflow: navy, orange and clean white surfaces; fast product lookup; accurate INR arithmetic; and clear inventory alerts. Never invent owner contact, GST, address or bank details.

## Deliver in this build
- Lovable Cloud email, Google and Lovable sign-in, a public sign-in page, a protected app shell, staff profiles, and separately protected employee roles/permissions.
- Persisted business settings, branches-ready product and category records, customer and supplier records, inventory movements, sales and line items, multiple customer payment methods, purchases, expenses, and audit events. Add explicit grants, row-level security and role-aware data access for every application table. Use transactional database functions for completing a sale or receiving a purchase so stock and money cannot be partially updated or applied twice.
- Dashboard calculated only from persisted business records; product and inventory management with search, stock statuses, movements, and threshold alerts; POS with tax-aware totals, split/partial payments, saved drafts, and printable invoices; purchase receiving; customer/supplier records; expenses; real-record activity and simple date-filtered reports; editable business identity/settings; and CSV export for applicable lists.
- Add input validation, useful empty/error/loading states, keyboard-friendly counter controls, responsive navigation, and focused automated tests for financial totals, stock thresholds, and preventing negative prices/quantities.

## Build approach
1. Establish the app's semantic visual tokens and shared responsive shell. Keep `/` as the authenticated dashboard; add a public sign-in page and a pathless authenticated layout.
2. Build a normalized Lovable Cloud schema for single-business operation and future branches, with profiles/user_roles kept separate, authenticated access grants, RLS, role-check helpers, signup profile creation, audit fields, indexes, and safe atomic sale/purchase operations. Keep business details blank until configured.
3. Build auth and profile onboarding, operational dashboard, product/category/stock workflows, customer/supplier management, POS, purchase receiving, expense entry, settings, exports and real-data summaries.
4. Exercise authentication, real CRUD and core sale/stock flows against Cloud, run focused tests, check preview/error logs and desktop/mobile presentation.

## Phased boundaries
The brief spans a large ERP. This first working release focuses on reliable sign-in, products, stock, POS sales, payment recording, purchasing, master records, expenses, settings, dashboard and starter reports. Returns/credit notes, detailed purchase orders, cash-register closeouts, full GST filing-grade reports, automated notifications, imports, PDF receipts, barcode labels, payroll, and full permission-by-permission administration may need a later pass; do not imply these are live if absent. Actual GST/legal invoice compliance must be reviewed before business use.

## Technical choices
- Keep TanStack Start v1, TanStack Router and Query, Cloud's generated browser client and auth middleware; do not add a second app framework or local-storage business database.
- Keep all DB schema in Cloud migrations; every `public` application table receives grants, RLS, and policies in the creating migration. Only profiles and user_roles reference `auth.users`; other records are scoped to an owning business UUID.
- Keep sensitive multi-row financial operations inside secure PostgreSQL functions. Enforce staff privileges on the server and at the data boundary; do not trust UI visibility or user-editable metadata.
- Keep all content routes individually titled and described; never add generated placeholder data to financial totals.
