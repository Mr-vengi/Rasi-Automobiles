import { createFileRoute } from "@tanstack/react-router";
import { RasiWorkspace } from "@/components/rasi/workspace";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses & Cash Drawer | Rasi Automobiles" },
      { name: "description", content: "Daily overhead expenses, shift opening float, and cash reconciliation." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <RasiWorkspace initialPage="expenses" />,
});
