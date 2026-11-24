import { useState, useMemo } from "react";
import {
  Plus, Search, Filter, Download, Upload, Barcode as BarcodeIcon,
  Edit2, Trash2, Archive, History, AlertTriangle, Layers, CheckCircle2, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarcodeLabelPrintModal } from "./barcode-generator";
import { CsvImportDialog } from "./dialogs";
import { exportToCsv } from "./csv-utils";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Category = Tables<"categories">;
type Brand = Tables<"brands">;

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  search: string;
  loading: boolean;
  has: (permission: string) => boolean;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
  onExport: () => void;
  onClearAll?: () => void;
  onImportBulk?: (items: Omit<TablesInsert<"products">, "business_id">[]) => Promise<void>;
}

export function ProductsView({
  products,
  categories,
  brands,
  search: externalSearch,
  loading,
  has,
  onAdd,
  onEdit,
  onArchive,
  onExport,
  onClearAll,
  onImportBulk,
}: ProductsViewProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("ALL");

  // Barcode Label Print Modal State
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);
  // CSV Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);

  const query = (localSearch || externalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== "ALL" && p.category_name !== selectedCategory) return false;
      // Brand filter
      if (selectedBrand !== "ALL" && p.brand_name !== selectedBrand) return false;
      // Stock status filter
      const stock = Number(p.current_stock);
      const min = Number(p.minimum_stock);
      if (stockStatusFilter === "IN_STOCK" && stock <= min) return false;
      if (stockStatusFilter === "LOW_STOCK" && (stock <= 0 || stock > min)) return false;
      if (stockStatusFilter === "OUT_OF_STOCK" && stock > 0) return false;

      // Text query
      if (!query) return true;
      return (
        p.product_name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.part_number?.toLowerCase().includes(query) ||
        p.oem_number?.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query) ||
        p.shelf_location?.toLowerCase().includes(query) ||
        p.brand_name?.toLowerCase().includes(query)
      );
    });
  }, [products, query, selectedCategory, selectedBrand, stockStatusFilter]);

  const handleExportFiltered = () => {
    const dataToExport = filtered.map((p) => ({
      "Product Name": p.product_name,
      SKU: p.sku,
      Barcode: p.barcode || "",
      "Part Number": p.part_number || "",
      "OEM Number": p.oem_number || "",
      Brand: p.brand_name || "",
      Category: p.category_name || "",
      Unit: p.unit,
      "Purchase Cost": p.purchase_price,
      "Selling Price": p.selling_price,
      MRP: p.mrp,
      "GST Rate": p.gst_rate,
      "Current Stock": p.current_stock,
      "Minimum Stock": p.minimum_stock,
      "Shelf Location": p.shelf_location || "",
    }));
    exportToCsv("rasi-automobile-parts", dataToExport);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search part name, SKU, OEM..."
              className="h-8 pl-8 text-xs shadow-none"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Brand Filter */}
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Brands</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stock Filter */}
          <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stock</SelectItem>
              <SelectItem value="IN_STOCK">In Stock</SelectItem>
              <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onImportBulk && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="h-8 text-xs gap-1.5"
            >
              <Upload className="size-3.5" /> Import CSV
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportFiltered}
            className="h-8 text-xs gap-1.5"
          >
            <Download className="size-3.5" /> Export
          </Button>

          {onClearAll && products.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete ALL products from your inventory catalog? This cannot be undone.")) {
                  onClearAll();
                }
              }}
              className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" /> Clear All Products
            </Button>
          )}

          {has("products:create") && (
            <Button
              size="sm"
              onClick={onAdd}
              className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" /> Add Spare Part
            </Button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Part Name & SKU</TableHead>
              <TableHead>Brand & Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-right">Cost (₹)</TableHead>
              <TableHead className="text-right">Price (₹)</TableHead>
              <TableHead className="text-right">MRP (₹)</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y">
            {filtered.length > 0 ? (
              filtered.map((product, idx) => {
                const stock = Number(product.current_stock);
                const min = Number(product.minimum_stock);
                const isOut = stock <= 0;
                const isLow = stock > 0 && stock <= min;
                const cost = Number(product.purchase_price);
                const sell = Number(product.selling_price);
                const margin = cost > 0 ? ((sell - cost) / cost) * 100 : 0;

                return (
                  <TableRow key={product.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground">{product.product_name}</p>
                        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground mt-0.5">
                          <span>SKU: {product.sku}</span>
                          {product.part_number && <span>· Part: {product.part_number}</span>}
                          {product.barcode && <span>· Barcode: {product.barcode}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{product.brand_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{product.category_name || "—"}</p>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {product.shelf_location || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={isOut ? "destructive" : isLow ? "outline" : "secondary"}
                        className={`font-mono text-[10px] ${isLow ? "text-amber-600 border-amber-500" : ""}`}
                      >
                        {stock} {product.unit}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">₹{cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">₹{sell.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">₹{Number(product.mrp).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={margin < 0 ? "text-destructive font-bold" : margin > 20 ? "text-emerald-600" : "text-foreground"}>
                        {margin.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Print Barcode Label"
                          onClick={() => setBarcodeModalProduct(product)}
                          className="size-7 text-muted-foreground hover:text-foreground"
                        >
                          <BarcodeIcon className="size-3.5" />
                        </Button>
                        {has("products:update") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit Spare Part"
                            onClick={() => onEdit(product)}
                            className="size-7 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Spare Part"
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchive(product);
                          }}
                          className="size-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-xs text-muted-foreground">
                  {loading ? "Loading spare parts catalog..." : "No spare parts match your filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Barcode Label Print Dialog */}
      <Dialog open={barcodeModalProduct !== null} onOpenChange={() => setBarcodeModalProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Print Barcode Sticker Label</DialogTitle>
          </DialogHeader>
          {barcodeModalProduct && (
            <BarcodeLabelPrintModal
              product={barcodeModalProduct}
              quantity={1}
              onClose={() => setBarcodeModalProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk CSV Import Dialog */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Spare Parts from CSV</DialogTitle>
          </DialogHeader>
          <CsvImportDialog
            onImport={async (items) => {
              if (onImportBulk) await onImportBulk(items);
            }}
            onClose={() => setImportModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
