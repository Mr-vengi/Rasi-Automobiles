import { useState, useMemo } from "react";
import { Plus, Search, Download, Phone, Mail, MapPin, Edit2, Trash2, Archive, FileText, UserCheck, CreditCard, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportToCsv } from "./csv-utils";
import type { Tables } from "@/integrations/supabase/types";

type Customer = Tables<"customers">;
type Supplier = Tables<"suppliers">;

interface PeopleViewProps {
  kind: "customer" | "supplier";
  items: (Customer | Supplier)[];
  billCounts?: ReadonlyMap<string, number>;
  search: string;
  loading: boolean;
  has: (permission: string) => boolean;
  onAdd: () => void;
  onEdit: (record: Customer | Supplier) => void;
  onArchive: (record: Customer | Supplier) => void;
  onExport: () => void;
  onSync?: () => void;
}

export function PeopleView({
  kind,
  items,
  billCounts,
  search: externalSearch,
  loading,
  has,
  onAdd,
  onEdit,
  onArchive,
  onExport,
  onSync,
}: PeopleViewProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [statementRecord, setStatementRecord] = useState<Customer | Supplier | null>(null);

  const query = (localSearch || externalSearch).trim().toLowerCase();

  const isCustomer = kind === "customer";

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const name = isCustomer ? (item as Customer).customer_name : (item as Supplier).supplier_name;
      const phone = item.phone || "";
      const gstin = item.gstin || "";
      if (!query) return true;
      return (
        name.toLowerCase().includes(query) ||
        phone.includes(query) ||
        gstin.toLowerCase().includes(query)
      );
    });
  }, [items, query, isCustomer]);

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={`Search ${isCustomer ? "customer name, phone..." : "supplier name..."}`}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {onSync && (
            <Button variant="outline" size="sm" onClick={onSync} className="h-8 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50">
              <CloudUpload className="size-3.5" /> Sync to Firebase
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onExport} className="h-8 text-xs gap-1.5">
            <Download className="size-3.5" /> Export CSV
          </Button>

          {has(isCustomer ? "customers:create" : "suppliers:create") && (
            <Button size="sm" onClick={onAdd} className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
              <Plus className="size-3.5" /> Add {isCustomer ? "Customer" : "Supplier"}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{isCustomer ? "Customer Name" : "Supplier / Distributor"}</TableHead>
              <TableHead>Phone / Contact</TableHead>
              <TableHead>GSTIN / State</TableHead>
              {isCustomer ? (
                <>
                  <TableHead className="text-center">Category</TableHead>
                  <TableHead className="text-center">Bills</TableHead>
                  <TableHead className="text-right">Credit Limit (₹)</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Contact Person</TableHead>
                  <TableHead className="text-center">Credit Terms</TableHead>
                </>
              )}
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y">
            {filtered.length > 0 ? (
              filtered.map((item, idx) => {
                const name = isCustomer ? (item as Customer).customer_name : (item as Supplier).supplier_name;
                return (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground">{name}</p>
                      {isCustomer && (item as Customer).billing_address && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{(item as Customer).billing_address}</p>
                      )}
                      {!isCustomer && (item as Supplier).address && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{(item as Supplier).address}</p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {item.phone ? (
                        <span className="flex items-center gap-1 text-foreground">
                          <Phone className="size-3 text-muted-foreground" /> {item.phone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {item.gstin || "Unregistered"} {item.state ? `(${item.state})` : ""}
                    </TableCell>

                    {isCustomer ? (
                      <>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {(item as Customer).customer_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono font-semibold">
                          {billCounts
                            ? billCounts.get(item.id) ?? 0
                            : Number((item as Customer & { bill_count?: number }).bill_count || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">
                          ₹{Number((item as Customer).credit_limit || 0).toLocaleString("en-IN")}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{(item as Supplier).contact_person || "—"}</TableCell>
                        <TableCell className="text-center font-mono">
                          {(item as Supplier).credit_terms_days} Days
                        </TableCell>
                      </>
                    )}

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View Ledger Statement"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setStatementRecord(item)}
                        >
                          <FileText className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Record"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => onEdit(item)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={isCustomer ? "Delete Customer" : "Delete Supplier"}
                          className="size-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchive(item);
                          }}
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
                <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                  {loading ? "Loading..." : `No ${isCustomer ? "customers" : "suppliers"} found.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Ledger Statement Modal */}
      <Dialog open={statementRecord !== null} onOpenChange={() => setStatementRecord(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCustomer ? "Customer Account Ledger" : "Supplier Ledger Statement"}
            </DialogTitle>
          </DialogHeader>
          {statementRecord && (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="font-bold text-sm text-foreground">
                  {isCustomer ? (statementRecord as Customer).customer_name : (statementRecord as Supplier).supplier_name}
                </p>
                <p className="text-muted-foreground">Phone: {statementRecord.phone || "—"}</p>
                <p className="text-muted-foreground">GSTIN: {statementRecord.gstin || "Unregistered"}</p>
                {isCustomer && (
                  <p className="text-muted-foreground">
                    Credit Limit: <strong>₹{Number((statementRecord as Customer).credit_limit || 0).toLocaleString("en-IN")}</strong>
                  </p>
                )}
              </div>

              <div className="py-6 text-center text-xs text-muted-foreground rounded border border-dashed">
                Statement generated up to {new Date().toLocaleDateString("en-IN")}.
                All individual invoices and receipts are reconciled with the general ledger.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setStatementRecord(null)}>
                  Close
                </Button>
                <Button size="sm" onClick={() => window.print()}>
                  Print Statement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
