import { useState } from "react";
import { Plus, Trash2, AlertCircle, ArrowUpRight, ArrowDownRight, Upload, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { parseCsv, downloadSampleProductCsv } from "./csv-utils";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Customer = Tables<"customers">;
type Supplier = Tables<"suppliers">;
type Category = Tables<"categories">;
type Brand = Tables<"brands">;

export function dialogTitle(dialog: string | null, editing: Product | Customer | Supplier | null) {
  if (!dialog) return "";
  if (dialog === "product") return editing ? "Edit Spare Part" : "Add New Spare Part";
  if (dialog === "customer") return editing ? "Edit Customer Record" : "Add New Customer";
  if (dialog === "supplier") return editing ? "Edit Supplier Record" : "Add New Supplier";
  if (dialog === "expense") return "Record Business Expense";
  if (dialog === "purchase") return "Receive Goods / Purchase Bill";
  if (dialog === "adjustment") return "Audited Stock Adjustment";
  if (dialog === "payment_collect") return "Record Customer Payment Collection";
  if (dialog === "cash_register") return "Cash Register Reconciliation";
  if (dialog === "import_products") return "Bulk Import Spare Parts (CSV)";
  return "Business Operation";
}

export function dialogDescription(dialog: string | null) {
  if (!dialog) return "";
  if (dialog === "product") return "Configure spare part details, pricing, stock levels and vehicle compatibility.";
  if (dialog === "customer") return "Manage customer billing information, credit limits and GSTIN.";
  if (dialog === "supplier") return "Keep supplier contact and payment terms accurate for purchases.";
  if (dialog === "expense") return "Log overheads, salaries, rent or transport expenses.";
  if (dialog === "purchase") return "Increment inventory and record supplier payable for received goods.";
  if (dialog === "adjustment") return "Record stock changes with an immutable reason and audit log.";
  if (dialog === "payment_collect") return "Apply payments against customer unpaid sales invoices.";
  if (dialog === "cash_register") return "Reconcile daily cash collections, expenses and drawer balance.";
  if (dialog === "import_products") return "Upload a standard CSV spreadsheet to batch-create spare parts.";
  return "All changes are recorded in the business audit trail.";
}

/* =========================================================================
   PRODUCT FORM
   ========================================================================= */
interface ProductFormProps {
  record: Product | null;
  categories: Category[];
  brands: Brand[];
  suppliers: Supplier[];
  saving: boolean;
  onSubmit: (values: Omit<TablesInsert<"products">, "business_id"> & { opening_stock?: number }) => void;
  onCategory?: (name: string) => void;
  onBrand?: (name: string) => void;
}

export function ProductForm({
  record,
  categories,
  brands,
  suppliers,
  saving,
  onSubmit,
  onCategory,
  onBrand,
}: ProductFormProps) {
  const [productName, setProductName] = useState(record?.product_name || "");
  const [sku, setSku] = useState(record?.sku || "");
  const [barcode, setBarcode] = useState(record?.barcode || "");
  const [partNumber, setPartNumber] = useState(record?.part_number || "");
  const [oemNumber, setOemNumber] = useState(record?.oem_number || "");
  const isInitialCustomCategory = Boolean(
    record?.category_name && !categories.some((c) => c.name.toLowerCase() === record.category_name?.toLowerCase())
  );
  const isInitialCustomBrand = Boolean(
    record?.brand_name && !brands.some((b) => b.name.toLowerCase() === record.brand_name?.toLowerCase())
  );

  const [categoryName, setCategoryName] = useState(record?.category_name || "");
  const [isCustomCategory, setIsCustomCategory] = useState(isInitialCustomCategory);
  const [customCategory, setCustomCategory] = useState(isInitialCustomCategory ? (record?.category_name || "") : "");

  const [brandName, setBrandName] = useState(record?.brand_name || "");
  const [isCustomBrand, setIsCustomBrand] = useState(isInitialCustomBrand);
  const [customBrand, setCustomBrand] = useState(isInitialCustomBrand ? (record?.brand_name || "") : "");
  const [supplierId, setSupplierId] = useState(record?.supplier_id || "");
  const [unit, setUnit] = useState(record?.unit || "pcs");
  const [purchasePrice, setPurchasePrice] = useState(String(record?.purchase_price ?? "0"));
  const [sellingPrice, setSellingPrice] = useState(String(record?.selling_price ?? "0"));
  const [mrp, setMrp] = useState(String(record?.mrp ?? "0"));
  const [wholesalePrice, setWholesalePrice] = useState(String(record?.wholesale_price ?? "0"));
  const [gstRate, setGstRate] = useState(String(record?.gst_rate ?? "18"));
  const [hsnCode, setHsnCode] = useState(record?.hsn_code || "8708");
  const [openingStock, setOpeningStock] = useState("0");
  const [minimumStock, setMinimumStock] = useState(String(record?.minimum_stock ?? "5"));
  const [maximumStock, setMaximumStock] = useState(record?.maximum_stock ? String(record.maximum_stock) : "");
  const [shelfLocation, setShelfLocation] = useState(record?.shelf_location || "");
  const [description, setDescription] = useState(record?.description || "");

  const [newCat, setNewCat] = useState("");
  const [newBrand, setNewBrand] = useState("");

  const cost = Number(purchasePrice) || 0;
  const sell = Number(sellingPrice) || 0;
  const marginAmt = sell - cost;
  const marginPct = cost > 0 ? (marginAmt / cost) * 100 : 0;
  const isLoss = sell < cost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return alert("Product name is required.");
    if (!sku.trim()) return alert("SKU is required.");

    const finalCategory = (isCustomCategory ? customCategory : categoryName).trim();
    const finalBrand = (isCustomBrand ? customBrand : brandName).trim();

    const catObj = categories.find((c) => c.name.toLowerCase() === finalCategory.toLowerCase());
    const brandObj = brands.find((b) => b.name.toLowerCase() === finalBrand.toLowerCase());

    if (finalCategory && !catObj && onCategory) {
      onCategory(finalCategory);
    }
    if (finalBrand && !brandObj && onBrand) {
      onBrand(finalBrand);
    }

    onSubmit({
      product_name: productName.trim(),
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim(),
      part_number: partNumber.trim(),
      oem_number: oemNumber.trim(),
      brand_name: finalBrand,
      category_name: finalCategory,
      category_id: catObj ? catObj.id : null,
      brand_id: brandObj ? brandObj.id : null,
      supplier_id: supplierId && supplierId !== "none" ? supplierId : null,
      unit,
      purchase_price: cost,
      selling_price: sell,
      mrp: Number(mrp) || sell,
      wholesale_price: Number(wholesalePrice) || sell,
      gst_rate: Number(gstRate) || 0,
      hsn_code: hsnCode.trim(),
      minimum_stock: Number(minimumStock) || 0,
      maximum_stock: maximumStock ? Number(maximumStock) : null,
      shelf_location: shelfLocation.trim(),
      description: description.trim(),
      opening_stock: Number(openingStock) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Product Name *</Label>
          <Input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Castrol Activ 4T 20W-40 1L Engine Oil"
            required
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">SKU (Unique Code) *</Label>
          <Input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g. OIL-CAS-4T"
            required
            className="h-8 text-xs font-mono uppercase"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Barcode / EAN</Label>
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan or type barcode"
            className="h-8 text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Part Number</Label>
          <Input
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            placeholder="e.g. 45105-KCC-900"
            className="h-8 text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">OEM Number</Label>
          <Input
            value={oemNumber}
            onChange={(e) => setOemNumber(e.target.value)}
            placeholder="e.g. OEM-002-BSH"
            className="h-8 text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Category</Label>
            <button
              type="button"
              onClick={() => {
                const next = !isCustomCategory;
                setIsCustomCategory(next);
                if (next && !customCategory && categoryName) {
                  setCustomCategory(categoryName === "__OTHERS__" ? "" : categoryName);
                }
              }}
              className="text-[10px] text-primary hover:underline font-medium"
            >
              {isCustomCategory ? "← Select from list" : "+ Type Others"}
            </button>
          </div>
          {isCustomCategory ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Type custom category..."
                className="h-8 text-xs"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsCustomCategory(false)}
                title="Switch back to dropdown list"
              >
                ✕
              </Button>
            </div>
          ) : (
            <Select
              value={categoryName}
              onValueChange={(val) => {
                if (val === "__OTHERS__") {
                  setIsCustomCategory(true);
                  setCategoryName("");
                } else {
                  setCategoryName(val);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value="__OTHERS__" className="font-semibold text-primary">
                  + Add / Type Others...
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Brand</Label>
            <button
              type="button"
              onClick={() => {
                const next = !isCustomBrand;
                setIsCustomBrand(next);
                if (next && !customBrand && brandName) {
                  setCustomBrand(brandName === "__OTHERS__" ? "" : brandName);
                }
              }}
              className="text-[10px] text-primary hover:underline font-medium"
            >
              {isCustomBrand ? "← Select from list" : "+ Type Others"}
            </button>
          </div>
          {isCustomBrand ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                placeholder="Type custom brand..."
                className="h-8 text-xs"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsCustomBrand(false)}
                title="Switch back to dropdown list"
              >
                ✕
              </Button>
            </div>
          ) : (
            <Select
              value={brandName}
              onValueChange={(val) => {
                if (val === "__OTHERS__") {
                  setIsCustomBrand(true);
                  setBrandName("");
                } else {
                  setBrandName(val);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
                <SelectItem value="__OTHERS__" className="font-semibold text-primary">
                  + Add / Type Others...
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Unit of Measurement</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pcs">Pieces (pcs)</SelectItem>
              <SelectItem value="set">Set (set)</SelectItem>
              <SelectItem value="ltr">Litre (ltr)</SelectItem>
              <SelectItem value="ml">Millilitre (ml)</SelectItem>
              <SelectItem value="kg">Kilogram (kg)</SelectItem>
              <SelectItem value="mtr">Metre (mtr)</SelectItem>
              <SelectItem value="pair">Pair (pair)</SelectItem>
              <SelectItem value="box">Box (box)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">HSN Code</Label>
          <Input
            value={hsnCode}
            onChange={(e) => setHsnCode(e.target.value)}
            placeholder="8708"
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      {/* Pricing and Margins Box */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pricing & Tax</p>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Cost Price (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-primary">Selling Price (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="h-8 text-xs font-bold"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">MRP (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">GST Rate (%)</Label>
            <Select value={gstRate} onValueChange={setGstRate}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0% (Nil)</SelectItem>
                <SelectItem value="5">5%</SelectItem>
                <SelectItem value="12">12%</SelectItem>
                <SelectItem value="18">18% (Standard Auto)</SelectItem>
                <SelectItem value="28">28% (Luxury / Spares)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span>Profit Margin:</span>
            <Badge variant={isLoss ? "destructive" : marginPct < 10 ? "secondary" : "default"}>
              {marginPct.toFixed(1)}% (₹{marginAmt.toFixed(2)})
            </Badge>
          </div>
          {isLoss && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
              <AlertCircle className="size-3.5" /> Warning: Selling below purchase cost!
            </span>
          )}
        </div>
      </div>

      {/* Stock Levels Box */}
      <div className="grid grid-cols-3 gap-3">
        {!record && (
          <div className="space-y-1">
            <Label className="text-xs">Opening Stock</Label>
            <Input
              type="number"
              step="1"
              value={openingStock}
              onChange={(e) => setOpeningStock(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Min. Alert Stock</Label>
          <Input
            type="number"
            step="1"
            value={minimumStock}
            onChange={(e) => setMinimumStock(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Shelf / Rack Bin</Label>
          <Input
            value={shelfLocation}
            onChange={(e) => setShelfLocation(e.target.value)}
            placeholder="e.g. Rack A-3"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Description & Vehicle Compatibility</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Compatible with Hero Splendor Plus, Passion Pro, HF Deluxe (2018-2024)"
          className="text-xs min-h-[50px]"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="submit" disabled={saving} size="sm">
          {saving ? "Saving..." : record ? "Save Changes" : "Add Spare Part"}
        </Button>
      </div>
    </form>
  );
}

/* =========================================================================
   CUSTOMER FORM
   ========================================================================= */
interface CustomerFormProps {
  record: Customer | null;
  saving: boolean;
  onSubmit: (values: Omit<TablesInsert<"customers">, "business_id">) => void;
}

export function CustomerForm({ record, saving, onSubmit }: CustomerFormProps) {
  const [name, setName] = useState(record?.customer_name || "");
  const [phone, setPhone] = useState(record?.phone || "");
  const [email, setEmail] = useState(record?.email || "");
  const [address, setAddress] = useState(record?.billing_address || "");
  const [gstin, setGstin] = useState(record?.gstin || "");
  const [state, setState] = useState(record?.state || "Tamil Nadu");
  const [type, setType] = useState<Customer["customer_type"]>(record?.customer_type || "retail");
  const [creditLimit, setCreditLimit] = useState(String(record?.credit_limit ?? "0"));
  const [notes, setNotes] = useState(record?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Customer name is required.");
    onSubmit({
      customer_name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      billing_address: address.trim(),
      gstin: gstin.trim().toUpperCase(),
      state: state.trim(),
      customer_type: type,
      credit_limit: Number(creditLimit) || 0,
      notes: notes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Customer Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Murugan Auto Works / Ramesh" required className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mobile Phone *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Customer Category</Label>
          <Select value={type} onValueChange={(val) => setType(val as Customer["customer_type"])}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="retail">Retail Customer</SelectItem>
              <SelectItem value="workshop">Garage / Workshop</SelectItem>
              <SelectItem value="wholesale">Wholesale Buyer</SelectItem>
              <SelectItem value="dealer">Sub-Dealer</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">GSTIN (Optional)</Label>
          <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="33AAAAA0000A1Z5" className="h-8 text-xs font-mono uppercase" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Credit Limit (₹)</Label>
          <Input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="0 for no credit" className="h-8 text-xs" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Billing Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop address or street" className="h-8 text-xs" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="submit" disabled={saving} size="sm">{saving ? "Saving..." : record ? "Save Changes" : "Add Customer"}</Button>
      </div>
    </form>
  );
}

/* =========================================================================
   SUPPLIER FORM
   ========================================================================= */
interface SupplierFormProps {
  record: Supplier | null;
  saving: boolean;
  onSubmit: (values: Omit<TablesInsert<"suppliers">, "business_id">) => void;
}

export function SupplierForm({ record, saving, onSubmit }: SupplierFormProps) {
  const [name, setName] = useState(record?.supplier_name || "");
  const [person, setPerson] = useState(record?.contact_person || "");
  const [phone, setPhone] = useState(record?.phone || "");
  const [email, setEmail] = useState(record?.email || "");
  const [address, setAddress] = useState(record?.address || "");
  const [gstin, setGstin] = useState(record?.gstin || "");
  const [state, setState] = useState(record?.state || "Tamil Nadu");
  const [creditTerms, setCreditTerms] = useState(String(record?.credit_terms_days ?? "30"));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Supplier name is required.");
    onSubmit({
      supplier_name: name.trim(),
      contact_person: person.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      gstin: gstin.trim().toUpperCase(),
      state: state.trim(),
      credit_terms_days: Number(creditTerms) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Supplier / Distributor Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TVS Motor Spares Distribution" required className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Contact Person</Label>
          <Input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Representative name" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile / Landline" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Supplier GSTIN</Label>
          <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="GSTIN" className="h-8 text-xs font-mono uppercase" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Credit Terms (Days)</Label>
          <Input type="number" value={creditTerms} onChange={(e) => setCreditTerms(e.target.value)} placeholder="e.g. 30" className="h-8 text-xs" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Godown / Office address" className="h-8 text-xs" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="submit" disabled={saving} size="sm">{saving ? "Saving..." : record ? "Save Changes" : "Add Supplier"}</Button>
      </div>
    </form>
  );
}

/* =========================================================================
   EXPENSE FORM
   ========================================================================= */
export function ExpenseForm({
  saving,
  onSubmit,
}: {
  saving: boolean;
  onSubmit: (values: Omit<TablesInsert<"expenses">, "business_id">) => void;
}) {
  const [category, setCategory] = useState("Shop Rent");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) return alert("Please enter a valid expense amount.");
    onSubmit({
      category,
      amount: val,
      payment_method: paymentMethod,
      description: description.trim(),
      reference_number: reference.trim(),
      expense_date: date,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Expense Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Shop Rent">Shop Rent</SelectItem>
              <SelectItem value="Electricity & Water">Electricity & Water</SelectItem>
              <SelectItem value="Staff Salary / Advance">Staff Salary / Advance</SelectItem>
              <SelectItem value="Goods Transport & Freight">Goods Transport & Freight</SelectItem>
              <SelectItem value="Packaging & Bags">Packaging & Bags</SelectItem>
              <SelectItem value="Tea & Refreshments">Tea & Refreshments</SelectItem>
              <SelectItem value="Shop Maintenance & Tools">Shop Maintenance & Tools</SelectItem>
              <SelectItem value="Internet & Phone">Internet & Phone</SelectItem>
              <SelectItem value="Taxes & Licenses">Taxes & Licenses</SelectItem>
              <SelectItem value="Other Miscellaneous">Other Miscellaneous</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Amount (₹) *</Label>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="h-8 text-xs font-bold" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash (From Register)</SelectItem>
              <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer / NEFT</SelectItem>
              <SelectItem value="card">Card Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Notes / Particulars</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Freight charge for TVS brake parts parcel" className="h-8 text-xs" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="submit" disabled={saving} size="sm">{saving ? "Recording..." : "Record Expense"}</Button>
      </div>
    </form>
  );
}

/* =========================================================================
   PURCHASE FORM
   ========================================================================= */
interface PurchaseFormProps {
  products: Product[];
  suppliers: Supplier[];
  saving: boolean;
  onSubmit: (values: {
    supplierId: string;
    supplierReference: string;
    purchaseDate: string;
    items: { product_id: string; quantity: number; unit_cost: number; gst_rate: number; discount_rate: number }[];
    payments: { payment_method: string; amount: number; reference_number: string }[];
    idempotencyKey: string;
  }) => void;
}

export function PurchaseForm({ products, suppliers, saving, onSubmit }: PurchaseFormProps) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<{ productId: string; quantity: string; unitCost: string; gstRate: string }[]>([
    { productId: products[0]?.id || "", quantity: "10", unitCost: String(products[0]?.purchase_price || "100"), gstRate: String(products[0]?.gst_rate || "18") },
  ]);
  const [paidNow, setPaidNow] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");

  const addItem = () => {
    setItems((curr) => [...curr, { productId: products[0]?.id || "", quantity: "1", unitCost: "100", gstRate: "18" }]);
  };

  const removeItem = (index: number) => {
    setItems((curr) => curr.filter((_, idx) => idx !== index));
  };

  const updateItem = (index: number, field: string, val: string) => {
    setItems((curr) =>
      curr.map((item, idx) => {
        if (idx !== index) return item;
        if (field === "productId") {
          const prod = products.find((p) => p.id === val);
          return {
            ...item,
            productId: val,
            unitCost: prod ? String(prod.purchase_price) : item.unitCost,
            gstRate: prod ? String(prod.gst_rate) : item.gstRate,
          };
        }
        return { ...item, [field]: val };
      })
    );
  };

  const totalBill = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.unitCost) || 0;
    const tax = Number(item.gstRate) || 0;
    const taxable = qty * rate;
    return sum + taxable + (taxable * tax) / 100;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return alert("Select a supplier.");
    if (items.length === 0) return alert("Add at least one product.");

    onSubmit({
      supplierId,
      supplierReference: invoiceRef.trim(),
      purchaseDate,
      items: items.map((i) => ({
        product_id: i.productId,
        quantity: Number(i.quantity) || 1,
        unit_cost: Number(i.unitCost) || 0,
        gst_rate: Number(i.gstRate) || 0,
        discount_rate: 0,
      })),
      payments:
        Number(paidNow) > 0
          ? [{ payment_method: paymentMethod, amount: Number(paidNow), reference_number: "" }]
          : [],
      idempotencyKey: crypto.randomUUID(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Supplier / Distributor *</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select supplier" /></SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Supplier Inv #</Label>
          <Input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="e.g. INV-9821" className="h-8 text-xs font-mono" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Received Items</p>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 gap-1 text-xs">
            <Plus className="size-3" /> Add Part
          </Button>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 rounded-lg border p-2 bg-muted/20">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-background p-2 rounded border">
              <div className="flex-1">
                <Select value={item.productId} onValueChange={(val) => updateItem(idx, "productId", val)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.product_name} ({p.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-16">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                  className="h-8 text-xs text-center"
                />
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Cost"
                  value={item.unitCost}
                  onChange={(e) => updateItem(idx, "unitCost", e.target.value)}
                  className="h-8 text-xs text-right"
                />
              </div>
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="size-8 text-destructive">
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <div className="space-y-1">
          <Label className="text-xs">Amount Paid to Supplier Now (₹)</Label>
          <Input type="number" step="0.01" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} className="h-8 w-44 text-xs font-bold" />
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Total Invoiced Amount:</p>
          <p className="text-base font-black text-foreground">₹{totalBill.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="submit" disabled={saving} size="sm">
          {saving ? "Updating Stock..." : "Confirm & Receive Goods"}
        </Button>
      </div>
    </form>
  );
}

/* =========================================================================
   STOCK ADJUSTMENT FORM
   ========================================================================= */
export function AdjustmentForm({
  product,
  saving,
  onSubmit,
}: {
  product: Product | null;
  saving: boolean;
  onSubmit: (values: { productId: string; delta: number; reason: string }) => void;
}) {
  const [delta, setDelta] = useState("");
  const [type, setType] = useState<"add" | "remove">("add");
  const [reason, setReason] = useState("Physical Stock Audit");

  if (!product) return <p className="text-xs text-muted-foreground">No product selected.</p>;

  const currentStock = Number(product.current_stock) || 0;
  const changeQty = Number(delta) || 0;
  const newStock = type === "add" ? currentStock + changeQty : currentStock - changeQty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeQty || changeQty <= 0) return alert("Enter a valid adjustment quantity.");
    if (type === "remove" && newStock < 0) return alert("Stock cannot be negative.");

    const signedDelta = type === "add" ? changeQty : -changeQty;
    onSubmit({
      productId: product.id,
      delta: signedDelta,
      reason: reason.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="font-bold text-sm text-foreground">{product.product_name}</p>
        <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
          <span>SKU: <strong className="text-foreground">{product.sku}</strong></span>
          <span>Current Stock: <strong className="text-foreground">{currentStock} {product.unit}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Adjustment Type</Label>
          <div className="grid grid-cols-2 gap-1 rounded-md border p-1 bg-muted/30">
            <button
              type="button"
              onClick={() => setType("add")}
              className={`rounded py-1 text-xs font-semibold ${type === "add" ? "bg-emerald-600 text-white" : "text-muted-foreground"}`}
            >
              + Increase
            </button>
            <button
              type="button"
              onClick={() => setType("remove")}
              className={`rounded py-1 text-xs font-semibold ${type === "remove" ? "bg-red-600 text-white" : "text-muted-foreground"}`}
            >
              - Decrease
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Quantity to Adjust *</Label>
          <Input
            type="number"
            step="1"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="Quantity"
            required
            className="h-8 text-xs font-bold"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Reason for Adjustment *</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Physical Stock Audit">Physical Stock Count / Audit</SelectItem>
            <SelectItem value="Damaged / Broken in Shop">Damaged / Broken in Shop</SelectItem>
            <SelectItem value="Found Uncounted Stock">Found Uncounted Stock</SelectItem>
            <SelectItem value="Manufacturer Replacement">Warranty Replacement Received</SelectItem>
            <SelectItem value="Expired / Rust / Defective">Defective / Scrap</SelectItem>
            <SelectItem value="Opening Stock Calibration">Opening Stock Calibration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 flex justify-between items-center text-xs">
        <span>Stock after adjustment:</span>
        <span className="font-mono text-sm font-bold text-foreground">{newStock} {product.unit}</span>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="submit" disabled={saving} size="sm">
          {saving ? "Updating..." : "Commit Stock Adjustment"}
        </Button>
      </div>
    </form>
  );
}

/* =========================================================================
   BULK CSV IMPORT DIALOG
   ========================================================================= */
export function CsvImportDialog({
  onImport,
  onClose,
}: {
  onImport: (items: Omit<TablesInsert<"products">, "business_id">[]) => Promise<void>;
  onClose: () => void;
}) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setFileContent(text);
      const rows = parseCsv(text);
      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return alert("No valid rows found to import.");
    setImporting(true);
    try {
      const productsToInsert: Omit<TablesInsert<"products">, "business_id">[] = parsedRows.map((r, idx) => ({
        product_name: r["Product Name"] || r["product_name"] || `Imported Part ${idx + 1}`,
        sku: (r["SKU"] || r["sku"] || `SKU-${Date.now()}-${idx}`).toUpperCase(),
        barcode: r["Barcode"] || r["barcode"] || "",
        part_number: r["Part Number"] || r["part_number"] || "",
        oem_number: r["OEM Number"] || r["oem_number"] || "",
        brand_name: r["Brand"] || r["brand_name"] || "",
        category_name: r["Category"] || r["category_name"] || "",
        unit: r["Unit"] || r["unit"] || "pcs",
        purchase_price: Number(r["Purchase Price"] || r["purchase_price"] || 0),
        selling_price: Number(r["Selling Price"] || r["selling_price"] || 0),
        mrp: Number(r["MRP"] || r["mrp"] || 0),
        gst_rate: Number(r["GST Rate"] || r["gst_rate"] || 18),
        hsn_code: r["HSN Code"] || r["hsn_code"] || "8708",
        minimum_stock: Number(r["Minimum Stock"] || r["minimum_stock"] || 5),
        shelf_location: r["Shelf Location"] || r["shelf_location"] || "",
        description: r["Description"] || r["description"] || "",
      }));

      await onImport(productsToInsert);
      alert(`Successfully imported ${productsToInsert.length} spare parts.`);
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
        <div>
          <p className="text-xs font-semibold">Download CSV Template</p>
          <p className="text-[11px] text-muted-foreground">Use our standardized headers for seamless product bulk upload.</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadSampleProductCsv} className="gap-1.5 text-xs">
          <Download className="size-3.5" /> Template
        </Button>
      </div>

      <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
        <Upload className="mx-auto size-8 text-muted-foreground" />
        <label className="mt-2 block cursor-pointer text-xs font-semibold text-primary hover:underline">
          Click to choose CSV file
          <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
        </label>
        <p className="text-[10px] text-muted-foreground mt-1">Accepts CSV files up to 5MB</p>
      </div>

      {parsedRows.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>Preview ({parsedRows.length} parts found)</span>
            <Badge variant="outline" className="text-emerald-600 gap-1">
              <CheckCircle2 className="size-3" /> Ready to Import
            </Badge>
          </div>
          <div className="max-h-48 overflow-y-auto rounded border text-xs">
            <table className="w-full text-left">
              <thead className="bg-muted sticky top-0 font-semibold">
                <tr>
                  <th className="p-1.5">SKU</th>
                  <th className="p-1.5">Part Name</th>
                  <th className="p-1.5 text-right">Cost</th>
                  <th className="p-1.5 text-right">Sell</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                {parsedRows.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5">{row["SKU"] || row["sku"] || "—"}</td>
                    <td className="p-1.5 font-sans line-clamp-1">{row["Product Name"] || row["product_name"] || "—"}</td>
                    <td className="p-1.5 text-right">₹{row["Purchase Price"] || row["purchase_price"] || "0"}</td>
                    <td className="p-1.5 text-right">₹{row["Selling Price"] || row["selling_price"] || "0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleConfirmImport} disabled={parsedRows.length === 0 || importing}>
          {importing ? "Importing Parts..." : `Import ${parsedRows.length} Products`}
        </Button>
      </div>
    </div>
  );
}
