import { Shield, ShieldCheck, UserCheck, Key, Lock, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { loadEmployees } from "@/lib/rasi-data";

type Profile = Awaited<ReturnType<typeof loadEmployees>>[number];

interface EmployeesViewProps {
  employees: Profile[];
  roles: unknown[];
  loading: boolean;
}

const PERMISSION_MATRIX = [
  { module: "POS / New Billing", owner: true, manager: true, billing: true, inventory: false, accountant: false },
  { module: "Edit Product Catalog & Prices", owner: true, manager: true, billing: false, inventory: true, accountant: false },
  { module: "Manual Stock Adjustments", owner: true, manager: true, billing: false, inventory: true, accountant: false },
  { module: "Receive Goods / Purchase Bills", owner: true, manager: true, billing: false, inventory: true, accountant: true },
  { module: "Expenses & Cash Register", owner: true, manager: true, billing: true, inventory: false, accountant: true },
  { module: "Customer Credit & Overrides", owner: true, manager: true, billing: false, inventory: false, accountant: false },
  { module: "P&L & Accounting Reports", owner: true, manager: true, billing: false, inventory: false, accountant: true },
  { module: "Business Profile & Settings", owner: true, manager: false, billing: false, inventory: false, accountant: false },
  { module: "Cancel / Reverse Completed Invoices", owner: true, manager: false, billing: false, inventory: false, accountant: false },
];

export function EmployeesView({ employees, loading }: EmployeesViewProps) {
  return (
    <div className="space-y-6">
      {/* Team Members List */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> Team Members & Assigned Roles
          </CardTitle>
          <CardDescription className="text-xs">
            Staff access is enforced securely through PostgreSQL Row-Level Security and Supabase Auth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead className="text-center">Role</TableHead>
                  <TableHead className="text-right">Account Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y">
                {employees.length > 0 ? (
                  employees.map((emp) => {
                    const role = emp.user_roles?.[0]?.roles?.name || emp.user_roles?.[0]?.role_id || "Billing Staff";
                    const isOwner = role.toLowerCase().includes("owner");

                    return (
                      <TableRow key={emp.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-foreground flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {emp.full_name?.slice(0, 1).toUpperCase() || "U"}
                          </div>
                          <span>{emp.full_name || "Staff Member"}</span>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">{emp.email}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={isOwner ? "default" : "secondary"} className="uppercase text-[9px]">
                            {role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground font-mono">
                          {new Date(emp.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                      {loading ? "Loading staff roster..." : "No team profiles found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role-Based Permissions Matrix */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Lock className="size-4 text-amber-500" /> Granular Access Control Matrix
          </CardTitle>
          <CardDescription className="text-xs">
            Operational capabilities per role across the Rasi Automobiles system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider">
                <TableRow>
                  <TableHead>System Function</TableHead>
                  <TableHead className="text-center">Owner / Superadmin</TableHead>
                  <TableHead className="text-center">Manager</TableHead>
                  <TableHead className="text-center">Billing Staff</TableHead>
                  <TableHead className="text-center">Inventory Manager</TableHead>
                  <TableHead className="text-center">Accountant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y">
                {PERMISSION_MATRIX.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-foreground">{item.module}</TableCell>
                    <TableCell className="text-center">
                      <CheckCircle2 className="mx-auto size-4 text-emerald-600" />
                    </TableCell>
                    <TableCell className="text-center">
                      {item.manager ? <CheckCircle2 className="mx-auto size-4 text-emerald-600" /> : <XCircle className="mx-auto size-4 text-slate-300" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.billing ? <CheckCircle2 className="mx-auto size-4 text-emerald-600" /> : <XCircle className="mx-auto size-4 text-slate-300" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.inventory ? <CheckCircle2 className="mx-auto size-4 text-emerald-600" /> : <XCircle className="mx-auto size-4 text-slate-300" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.accountant ? <CheckCircle2 className="mx-auto size-4 text-emerald-600" /> : <XCircle className="mx-auto size-4 text-slate-300" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
