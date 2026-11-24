import { useState, useMemo } from "react";
import {
  Boxes, AlertTriangle, ShieldAlert, ArrowUpDown, History, Plus,
  Minus, RefreshCw, ShoppingCart, SlidersHorizontal, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStockStatus, suggestedReorderQuantity } from "@/lib/rasi-calculations";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type StockMovement = Tables<"stock_movements"> & {
  products?: { product_name: string; sku: string; part_number?: string } | null;
};

interface InventoryViewProps {
  products: Product[];
  movements: StockMovement[];
  lowStock: Product[];
  search: string;
  loading: boolean;
  has: (permission: string) => boolean;
  onAdjust: (product: Product) => void;
  onReorder: (product: Product) => void;
}

export function InventoryView({
  products,
  movements,
  lowStock,
  search: externalSearch,
  loading,
  has,
  onAdjust,
  onReorder,
}: InventoryViewProps) {
  const [tab, setTab] = useState<"alerts" | "catalog" | "movements">("alerts");
  const [localSearch, setLocalSearch] = useState("");

  const query = (localSearch || externalSearch).trim().toLowerCase();

  const outOfStock = useMemo(() => products.filter((p) => Number(p.current_stock) <= 0), [products]);
  const criticalStock = useMemo(
    () => products.filter((p) => Number(p.current_stock) > 0 && Number(p.current_stock) <= Number(p.minimum_stock) / 2),
    [products]
  );

  const totalValuation = useMemo(
    () => products.reduce((sum, p) => sum + Number(p.current_stock) * Number(p.purchase_price), 0),
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!query) return true;
      return (
        p.product_name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.shelf_location?.toLowerCase().includes(query)
      );
    });
  }, [products, query]);

  const alertProducts = useMemo(() => {
    return products.filter((p) => {
      const status = getStockStatus(Number(p.current_stock), Number(p.minimum_stock), p.maximum_stock ? Number(p.maximum_stock) : null);
      return ["critical", "low", "out-of-stock"].includes(status);
    });
  }, [products]);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">Inventory Valuation</p>
            <p className="mt-1 text-xl font-black text-foreground">₹{totalValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{products.length} registered parts</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">Low Stock Alerts</p>
            <p className="mt-1 text-xl font-black text-amber-600">{lowStock.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Below configured threshold</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">Critical Stock</p>
            <p className="mt-1 text-xl font-black text-rose-600">{criticalStock.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Under 50% min threshold</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">Out of Stock</p>
            <p className="mt-1 text-xl font-black text-destructive">{outOfStock.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Zero physical quantity</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-1 rounded-lg border bg-muted/60 p-0.5">
          <button
            type="button"
            onClick={() => setTab("alerts")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "alerts" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle className="size-3.5 text-amber-500" />
            Stock Alerts ({alertProducts.length})
          </button>

          <button
            type="button"
            onClick={() => setTab("catalog")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "catalog" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Boxes className="size-3.5 text-indigo-500" />
            Stock Levels & Valuation
          </button>

          <button
            type="button"
            onClick={() => setTab("movements")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "movements" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="size-3.5 text-blue-500" />
            Audited Movement Log ({movements.length})
          </button>
        </div>

        {tab !== "movements" && (
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search stock..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        )}
      </div>

      {/* TAB 1: STOCK ALERTS */}
      {tab === "alerts" && (
        <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
              <TableRow>
                <TableHead>Part Name & SKU</TableHead>
                <TableHead>Shelf</TableHead>
                <TableHead className="text-center">Current Stock</TableHead>
                <TableHead className="text-center">Min Threshold</TableHead>
                <TableHead className="text-center">Suggested Reorder</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y">
              {alertProducts.length > 0 ? (
                alertProducts.map((p) => {
                  const current = Number(p.current_stock);
                  const min = Number(p.minimum_stock);
                  const max = p.maximum_stock ? Number(p.maximum_stock) : null;
                  const status = getStockStatus(current, min, max);
                  const suggested = suggestedReorderQuantity(current, min, max);

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="font-semibold text-foreground">{p.product_name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">SKU: {p.sku}</p>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{p.shelf_location || "—"}</TableCell>
                      <TableCell className="text-center font-bold text-foreground font-mono">{current} {p.unit}</TableCell>
                      <TableCell className="text-center text-muted-foreground font-mono">{min} {p.unit}</TableCell>
                      <TableCell className="text-center font-bold text-primary font-mono">{suggested} {p.unit}</TableCell>
                      <TableCell className="text-right font-mono">₹{Number(p.purchase_price).toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={status === "out-of-stock" ? "destructive" : "outline"}
                          className={`uppercase text-[9px] ${status === "critical" ? "text-rose-600 border-rose-500 bg-rose-50" : status === "low" ? "text-amber-600 border-amber-500 bg-amber-50" : ""}`}
                        >
                          {status.replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {has("inventory:adjust") && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAdjust(p)}>
                              Adjust
                            </Button>
                          )}
                          <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground" onClick={() => onReorder(p)}>
                            Reorder
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-emerald-600 font-medium">
                    ✓ All spare parts stock levels are above threshold! No pending stock alerts.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* TAB 2: FULL STOCK CATALOG */}
      {tab === "catalog" && (
        <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
              <TableRow>
                <TableHead>Part Name & SKU</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Stock on Hand</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Valuation</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y">
              {filteredProducts.map((p) => {
                const stock = Number(p.current_stock);
                const cost = Number(p.purchase_price);
                const totalVal = stock * cost;
                const status = getStockStatus(stock, Number(p.minimum_stock), p.maximum_stock ? Number(p.maximum_stock) : null);

                return (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell>
                      <p className="font-semibold text-foreground">{p.product_name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">SKU: {p.sku}</p>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{p.shelf_location || "—"}</TableCell>
                    <TableCell className="text-center font-bold text-foreground font-mono">{stock} {p.unit}</TableCell>
                    <TableCell className="text-right font-mono">₹{cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">₹{totalVal.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {has("inventory:adjust") && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAdjust(p)}>
                          Adjust
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* TAB 3: AUDITED MOVEMENTS LOG */}
      {tab === "movements" && (
        <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Part Name & SKU</TableHead>
                <TableHead>Movement Type</TableHead>
                <TableHead className="text-center">Quantity Delta</TableHead>
                <TableHead className="text-center">Stock After</TableHead>
                <TableHead>Reason / Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y">
              {movements.length > 0 ? (
                movements.map((m) => {
                  const delta = Number(m.quantity_delta);
                  const isPositive = delta > 0;
                  const dateStr = new Date(m.created_at).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">{dateStr}</TableCell>
                      <TableCell>
                        <p className="font-semibold text-foreground">{m.products?.product_name || "Unknown Part"}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">SKU: {m.products?.sku || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="uppercase text-[9px]">
                          {m.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold">
                        <span className={isPositive ? "text-emerald-600" : "text-destructive"}>
                          {isPositive ? `+${delta}` : delta}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-foreground">
                        {Number(m.stock_after).toFixed(0)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.reason || m.reference_type || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                    No recorded stock movements yet. Every sale, purchase and adjustment is logged here automatically.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
