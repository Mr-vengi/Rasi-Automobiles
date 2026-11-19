import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { RasiAppContext, type RasiSession } from "@/components/rasi/app-context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw redirect({ to: "/auth" });

    const [{ data: profile, error: profileError }, { data: roles, error: roleError }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").eq("id", authData.user.id).maybeSingle(),
      supabase.from("user_roles").select("role_id").eq("user_id", authData.user.id),
    ]);
    if (profileError) throw new Error(profileError.message);
    if (roleError) throw new Error(roleError.message);
    if (!profile) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    const roleIds = (roles ?? []).map((role) => role.role_id);
    const { data: permissions, error: permissionsError } = roleIds.length
      ? await supabase.from("role_permissions").select("permission_id").in("role_id", roleIds)
      : { data: [], error: null };
    if (permissionsError) throw new Error(permissionsError.message);

    const user: RasiSession = {
      userId: authData.user.id,
      email: authData.user.email ?? "",
      fullName: profile.full_name || profile.email || "Team member",
      roleId: roleIds[0] ?? "read_only_auditor",
      permissions: [...new Set((permissions ?? []).map((permission) => permission.permission_id))],
    };
    return { user };
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