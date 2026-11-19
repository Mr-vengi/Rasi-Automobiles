import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, LoaderCircle, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
    void supabase.auth.getUser().then(({ data }) => {
      if (active) void navigate({ to: data.user ? "/dashboard" : "/auth", replace: true });
    });
    return () => { active = false; };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground"><Wrench className="size-5" /></div>
        <p className="mt-4 text-sm font-bold tracking-[0.04em] text-foreground">RASI AUTOMOBILES</p>
        <p className="mt-7 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Opening your workspace</p>
        <Button variant="link" onClick={() => void navigate({ to: "/auth" })} className="mt-3 text-primary">Go to sign in <ArrowRight /></Button>
      </div>
    </main>
  );
}