import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/integrations/firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { RasiAppContext, type RasiSession } from "@/components/rasi/app-context";
import { fbCheckUserApproval } from "@/lib/rasi-data";

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

const STAFF_PERMISSIONS = [
  "pos:access",
  "sales:create",
  "products:read",
  "inventory:read",
  "customers:read",
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
        const email = (fbUser.email || "").toLowerCase().trim();
        const isAdmin = email === "ranjithselvaraj14@gmail.com";

        if (!isAdmin) {
          const approval = await fbCheckUserApproval(email, fbUser.uid);
          if (!approval.approved) {
            await auth.signOut();
            if (typeof window !== "undefined") {
              localStorage.removeItem("rasi_staff_session");
            }
            throw redirect({ to: "/auth" });
          }

          const user: RasiSession = {
            userId: fbUser.uid,
            email: fbUser.email ?? "",
            fullName: fbUser.displayName || email.split("@")[0] || "Staff",
            roleId: "staff",
            permissions: STAFF_PERMISSIONS,
          };
          return { user };
        }

        const user: RasiSession = {
          userId: fbUser.uid,
          email: "ranjithselvaraj14@gmail.com",
          fullName: fbUser.displayName || activeOwner,
          roleId: "administrator",
          permissions: FULL_ADMIN_PERMISSIONS,
        };
        return { user };
      }
    } catch (err) {
      if (err && typeof err === "object" && "to" in err) throw err;
      console.warn("Firebase auth check skipped:", err);
    }

    // 2. Check local authenticated staff session
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rasi_staff_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.userId) {
            const email = (parsed.email || "").toLowerCase().trim();
            const isAdmin =
              email === "ranjithselvaraj14@gmail.com" ||
              parsed.roleId === "administrator" ||
              parsed.roleId === "admin" ||
              parsed.roleId === "owner";

            if (isAdmin) {
              parsed.roleId = "administrator";
              parsed.permissions = FULL_ADMIN_PERMISSIONS;
              if (parsed.fullName?.includes("(") || parsed.fullName?.includes("Venkatesh") || !parsed.fullName) {
                parsed.fullName = activeOwner;
              }
              localStorage.setItem("rasi_staff_session", JSON.stringify(parsed));
              if (!auth.currentUser) {
                void signInWithEmailAndPassword(auth, "ranjithselvaraj14@gmail.com", "admin123").catch(() => { });
              }
              return { user: parsed as RasiSession };
            }

            // Staff session
            parsed.roleId = "staff";
            parsed.permissions = STAFF_PERMISSIONS;
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
        const email = (authData.user.email || "").toLowerCase().trim();
        const isAdmin = email === "ranjithselvaraj14@gmail.com";

        if (isAdmin) {
          const user: RasiSession = {
            userId: authData.user.id,
            email: authData.user.email ?? "ranjithselvaraj14@gmail.com",
            fullName: activeOwner,
            roleId: "administrator",
            permissions: FULL_ADMIN_PERMISSIONS,
          };
          return { user };
        }

        const [{ data: profile }, { data: roles }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, email").eq("id", authData.user.id).maybeSingle(),
          supabase.from("user_roles").select("role_id").eq("user_id", authData.user.id),
        ]);

        const roleIds = (roles ?? []).map((role) => role.role_id);
        const user: RasiSession = {
          userId: authData.user.id,
          email: authData.user.email ?? "",
          fullName: profile?.full_name || profile?.email || "Staff Member",
          roleId: "staff",
          permissions: STAFF_PERMISSIONS,
        };
        return { user };
      }
    } catch (err) {
      if (err && typeof err === "object" && "to" in err) throw err;
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
