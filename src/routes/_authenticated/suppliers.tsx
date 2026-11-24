import { createFileRoute } from "@tanstack/react-router";
import { RasiWorkspace } from "@/components/rasi/workspace";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers & Vendors | Rasi Automobiles" },
      { name: "description", content: "Distributors, parts vendors, payment terms, and vendor ledgers." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <RasiWorkspace initialPage="suppliers" />,
});
