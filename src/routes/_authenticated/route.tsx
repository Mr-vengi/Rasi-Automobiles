import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/integrations/firebase/client";
import { RasiAppContext, type RasiSession } from "@/components/rasi/app-context";

const FULL_ADMIN_PERMISSIONS = [
  "dashboard:read",
  "pos:access",
  "sales:read",
  "sales:create",
  "sales:update",
  "sales:cancel",
  "sales:export",
  "products:read",
  "products:create",
  "products:update",
  "products:delete",
  "products:archive",
  "products:import",
  "products:export",
  "inventory:read",
  "inventory:adjust",
  "inventory:alerts",
  "purchases:read",
  "purchases:create",
  "purchases:receive",
  "purchases:export",
  "customers:read",
  "customers:create",
  "customers:update",
  "customers:delete",
  "customers:archive",
  "customers:ledger",
  "suppliers:read",
  "suppliers:create",
  "suppliers:update",
  "suppliers:delete",
  "suppliers:archive",
  "suppliers:ledger",
  "expenses:read",
  "expenses:create",
  "expenses:delete",
  "reports:read",
  "reports:export",
  "employees:manage",
  "settings:manage",
];

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    let activeOwner = "RANJITH SELVARAJ";
    if (typeof window !== "undefined") {
      try {
        const s = localStorage.getItem("rasi_settings");
        if (s) {
          const parsed = JSON.parse(s);
          if (parsed?.owner_name && parsed.owner_name !== "K. Venkatesh") {
            activeOwner = parsed.owner_name;
          }
        }
      } catch { }
    }

    // 1. Check Firebase Auth first
    try {
      if (typeof auth.authStateReady === "function") {
        await Promise.race([
          auth.authStateReady(),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
      if (auth.currentUser) {
        const fbUser = auth.currentUser;
        const user: RasiSession = {
          userId: fbUser.uid,
          email: fbUser.email ?? "owner@rasiautomobiles.com",
          fullName: fbUser.displayName || fbUser.email?.split("@")[0] || activeOwner,
          roleId: "administrator",
          permissions: FULL_ADMIN_PERMISSIONS,
        };
        return { user };
      }
    } catch (err) {
      console.warn("Firebase auth check skipped:", err);
    }

    // 2. Check local authenticated staff session
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rasi_staff_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.userId) {
            if (
              (parsed.roleId === "administrator" || parsed.roleId === "admin" || parsed.roleId === "owner") &&
              (parsed.fullName?.includes("(") || parsed.fullName?.includes("Venkatesh") || !parsed.fullName)
            ) {
              parsed.fullName = activeOwner;
              localStorage.setItem("rasi_staff_session", JSON.stringify(parsed));
            }
            return { user: parsed as RasiSession };
          }
        } catch {
          localStorage.removeItem("rasi_staff_session");
        }
      }
    }

    // 3. Check Supabase Auth
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!authError && authData?.user) {
        const [{ data: profile }, { data: roles }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, email").eq("id", authData.user.id).maybeSingle(),
          supabase.from("user_roles").select("role_id").eq("user_id", authData.user.id),
        ]);

        const roleIds = (roles ?? []).map((role) => role.role_id);
        const { data: permissions } = roleIds.length
          ? await supabase.from("role_permissions").select("permission_id").in("role_id", roleIds)
          : { data: [] as { permission_id: string }[] };

        const user: RasiSession = {
          userId: authData.user.id,
          email: authData.user.email ?? "",
          fullName: profile?.full_name || profile?.email || "Team member",
          roleId: roleIds[0] ?? "administrator",
          permissions: permissions && permissions.length
            ? [...new Set(permissions.map((p) => p.permission_id))]
            : FULL_ADMIN_PERMISSIONS,
        };
        return { user };
      }
    } catch (err) {
      console.warn("Supabase auth check error:", err);
    }

    throw redirect({ to: "/auth" });
  },
  component: ProtectedWorkspace,
});

function ProtectedWorkspace() {
  const { user } = Route.useRouteContext();
  return (
    <RasiAppContext.Provider value={{ user, setUser: () => undefined }}>
      <Outlet />
    </RasiAppContext.Provider>
  );
}
