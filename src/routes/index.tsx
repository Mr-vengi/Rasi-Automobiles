import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, LoaderCircle, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/integrations/firebase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rasi Automobiles | Spare Parts Billing" },
      { name: "description", content: "Sales, stock and customer records for Rasi Automobiles." },
      { property: "og:title", content: "Rasi Automobiles | Spare Parts Billing" },
      { property: "og:description", content: "Secure business records for Rasi Automobiles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntryPage,
});

function EntryPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      // Check if arriving via QR scan for invoice download/view
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const invoiceId = params.get("id") || params.get("invoice");
        if (invoiceId) {
          if (active) {
            void navigate({
              to: "/invoice",
              search: { id: invoiceId, download: params.get("download") || "1" } as any,
              replace: true,
            });
            return;
          }
        }
      }

      // Check Firebase
      try {
        if (typeof auth.authStateReady === "function") {
          await auth.authStateReady();
        }
        if (auth.currentUser) {
          if (active) void navigate({ to: "/dashboard", replace: true });
          return;
        }
      } catch {
        // Continue
      }

      // Check local staff session
      if (typeof window !== "undefined" && localStorage.getItem("rasi_staff_session")) {
        if (active) void navigate({ to: "/dashboard", replace: true });
        return;
      }

      // Check Supabase
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          if (active) void navigate({ to: "/dashboard", replace: true });
          return;
        }
      } catch {
        // Continue
      }

      if (active) void navigate({ to: "/auth", replace: true });
    }

    void checkAuth();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-5">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative">
          <img
            src="/rasi-logo.png"
            alt="Rasi Automobiles Billing"
            className="size-28 rounded-full border-4 border-white shadow-xl bg-white object-cover"
          />
        </div>
        <h1 className="mt-4 text-base font-black tracking-wider text-slate-900 uppercase">
          Rasi Automobiles
        </h1>
        <p className="text-xs font-semibold text-primary">
          Drive · Service · Bill Smartly
        </p>
        <div className="mt-8 flex items-center gap-2.5 rounded-full bg-white px-4 py-2 border shadow-xs text-xs font-medium text-slate-600">
          <LoaderCircle className="size-4 animate-spin text-primary" />
          <span>Opening your workspace...</span>
        </div>
        <Button variant="link" onClick={() => void navigate({ to: "/auth" })} className="mt-4 text-xs text-muted-foreground hover:text-primary">
          Go to sign in <ArrowRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </main>
  );
}
