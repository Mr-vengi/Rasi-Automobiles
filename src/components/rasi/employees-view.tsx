import { useState, useEffect } from "react";
import { Shield, ShieldCheck, UserCheck, Key, Lock, CheckCircle2, XCircle, Clock, Check, X, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { fbLoadUserApprovals, fbSetUserApprovalStatus, type UserApproval } from "@/lib/rasi-data";
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
  const [approvals, setApprovals] = useState<UserApproval[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [actionUid, setActionUid] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoadingApprovals(true);
    try {
      const data = await fbLoadUserApprovals();
      setApprovals(data);
    } catch {
      // Ignored
    } finally {
      setLoadingApprovals(false);
    }
  };

  useEffect(() => {
    void fetchApprovals();
  }, []);

  const handleUpdateStatus = async (id: string, name: string, status: "approved" | "rejected") => {
    setActionUid(id);
    try {
      await fbSetUserApprovalStatus(id, status);
      toast.success(
        status === "approved"
          ? `${name} has been approved for Staff access (Products, Inventory, New bill).`
          : `${name}'s access request has been rejected.`
      );
      await fetchApprovals();
    } catch (err) {
      toast.error("Could not update approval status.");
    } finally {
      setActionUid(null);
    }
  };

  const pendingList = approvals.filter((u) => u.status === "pending");
  const processedList = approvals.filter((u) => u.status !== "pending");

  return (
    <div className="space-y-6">
      {/* Account Access Requests & Approvals for Administrator */}
      <Card className="border shadow-xs border-primary/20">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Staff Access Requests & Approvals
            </CardTitle>
            <CardDescription className="text-xs">
              When new staff create an account, notify and approve them here before they can sign in.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchApprovals()}
            disabled={loadingApprovals}
            className="text-xs gap-1.5 h-8"
          >
            <RefreshCw className={`size-3.5 ${loadingApprovals ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingList.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              <p className="font-semibold">
                ⚠️ {pendingList.length} staff account{pendingList.length > 1 ? "s" : ""} waiting for your approval
              </p>
              <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-400">
                Approved accounts receive restricted counter access (Products, Inventory, New bill only).
              </p>
            </div>
          )}

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
                <TableRow>
                  <TableHead>User / Applicant</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Requested</TableHead>
                  <TableHead className="text-right">Admin Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y">
                {approvals.length > 0 ? (
                  approvals.map((req) => {
                    const isPending = req.status === "pending";
                    const isApproved = req.status === "approved";

                    return (
                      <TableRow key={req.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-foreground flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {req.name?.slice(0, 1).toUpperCase() || "U"}
                          </div>
                          <div>
                            <p>{req.name || "Staff Applicant"}</p>
                            <p className="text-[10px] text-muted-foreground font-normal">
                              Role: {req.role === "administrator" ? "Administrator" : "Counter Staff"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">{req.email}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isApproved ? "default" : isPending ? "outline" : "destructive"}
                            className={`uppercase text-[9px] ${
                              isApproved
                                ? "bg-emerald-600 text-white"
                                : isPending
                                  ? "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                                  : ""
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground font-mono">
                          {new Date(req.requested_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={actionUid === req.id}
                                  onClick={() => void handleUpdateStatus(req.id, req.name, "approved")}
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 px-2.5"
                                >
                                  <Check className="size-3.5" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={actionUid === req.id}
                                  onClick={() => void handleUpdateStatus(req.id, req.name, "rejected")}
                                  className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900 gap-1 px-2"
                                >
                                  <X className="size-3.5" /> Reject
                                </Button>
                              </>
                            ) : isApproved ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={actionUid === req.id || req.email === "ranjithselvaraj14@gmail.com"}
                                onClick={() => void handleUpdateStatus(req.id, req.name, "rejected")}
                                className="h-7 text-xs text-muted-foreground hover:text-rose-600"
                              >
                                Revoke
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionUid === req.id}
                                onClick={() => void handleUpdateStatus(req.id, req.name, "approved")}
                                className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                              >
                                Re-approve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                      {loadingApprovals ? "Loading access requests..." : "No user requests recorded yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> Active Administrator & Team
          </CardTitle>
          <CardDescription className="text-xs">
            Administrator: ranjithselvaraj14@gmail.com (RANJITH SELVARAJ).
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
                    const isOwner = role.toLowerCase().includes("owner") || role.toLowerCase().includes("administrator");

                    return (
                      <TableRow key={emp.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-foreground flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {emp.full_name?.slice(0, 1).toUpperCase() || "R"}
                          </div>
                          <span>{emp.full_name || "RANJITH SELVARAJ"}</span>
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
            Staff users have restricted access to POS / New Billing, Products, and Inventory only. All other modules require Administrator access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider">
                <TableRow>
                  <TableHead>Functional Module</TableHead>
                  <TableHead className="text-center">Admin / Owner</TableHead>
                  <TableHead className="text-center">Staff (Approved)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y">
                {PERMISSION_MATRIX.map((row, index) => {
                  const staffHas = ["POS / New Billing", "Edit Product Catalog & Prices", "Manual Stock Adjustments"].includes(row.module);

                  return (
                    <TableRow key={index} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-foreground">{row.module}</TableCell>
                      <TableCell className="text-center">
                        <CheckCircle2 className="inline size-4 text-emerald-500" />
                      </TableCell>
                      <TableCell className="text-center">
                        {staffHas ? (
                          <CheckCircle2 className="inline size-4 text-emerald-500" />
                        ) : (
                          <XCircle className="inline size-4 text-rose-500 opacity-60" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
