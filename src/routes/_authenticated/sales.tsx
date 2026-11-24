import { createFileRoute } from "@tanstack/react-router";
import { RasiWorkspace } from "@/components/rasi/workspace";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales & Invoices | Rasi Automobiles" },
      { name: "description", content: "View completed invoices, credit sales, drafts, and print A4 or thermal receipts." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <RasiWorkspace initialPage="sales" />,
});
